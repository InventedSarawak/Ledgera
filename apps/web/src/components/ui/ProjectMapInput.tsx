'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Trash2, Undo2, RotateCcw, Pencil, Check, X } from 'lucide-react'
import { getPolygonCentroid } from '@/lib/utils'

// ── Icon helpers ─────────────────────────────────────────────────────────────

delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})

/** Highlighted icon for the right-clicked / editing pin */
function makeSelectedIcon(): L.DivIcon {
    return L.divIcon({
        className: '',
        html: `
            <div style="position:relative;width:25px;height:41px">
                <img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png"
                     style="filter:hue-rotate(180deg) brightness(1.5) saturate(2);width:25px;height:41px;position:absolute;top:0;left:0" />
                <img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
                     style="position:absolute;top:12px;left:-6px;opacity:0.5" />
            </div>`,
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    })
}

// ── Geo helpers ───────────────────────────────────────────────────────────────

function calculateAreaHectares(coords: L.LatLng[]): number {
    let area = 0
    if (coords.length > 2) {
        for (let i = 0; i < coords.length; i++) {
            const p1 = coords[i]
            const p2 = coords[(i + 1) % coords.length]
            area +=
                (((p2.lng - p1.lng) * Math.PI) / 180) *
                (2 + Math.sin((p1.lat * Math.PI) / 180) + Math.sin((p2.lat * Math.PI) / 180))
        }
        area = (area * 6378137 * 6378137) / 2.0
    }
    return Math.abs(area) / 10000
}

function calculateCentroid(coords: L.LatLng[]): { lat: number; lng: number } {
    let twiceArea = 0
    let x = 0
    let y = 0
    const n = coords.length

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const p1 = coords[i]
        const p2 = coords[j]
        const f = p1.lng * p2.lat - p2.lng * p1.lat
        twiceArea += f
        x += (p1.lng + p2.lng) * f
        y += (p1.lat + p2.lat) * f
    }

    if (twiceArea === 0) {
        let minLat = 90,
            maxLat = -90,
            minLng = 180,
            maxLng = -180
        coords.forEach((loc) => {
            if (loc.lat < minLat) minLat = loc.lat
            if (loc.lat > maxLat) maxLat = loc.lat
            if (loc.lng < minLng) minLng = loc.lng
            if (loc.lng > maxLng) maxLng = loc.lng
        })
        return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }
    }

    const f = twiceArea * 3
    return { lat: y / f, lng: x / f }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContextMenuState {
    /** Position relative to the map container (px) */
    x: number
    y: number
    /** Index into points[] */
    idx: number
}

interface ApprovedRegion {
    id: string
    title: string
    locationPolygon: [number, number][]
}

interface ProjectMapInputProps {
    onLocationChange?: (lat: number, lng: number, areaHectares: number) => void
    /** Called with the raw polygon coords [[lat,lng],...] every time points change */
    onPolygonChange?: (polygon: [number, number][], areaHectares?: number) => void
    initialPolygon?: [number, number][]
    resetKey?: number
    /** Approved/deployed project regions to display as non-interactive gray overlays */
    approvedRegions?: ApprovedRegion[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectMapInput({
    onLocationChange,
    onPolygonChange,
    initialPolygon,
    resetKey,
    approvedRegions
}: ProjectMapInputProps) {
    console.log('[ProjectMapInput] Render. approvedRegions:', approvedRegions)

    const mapRef = useRef<L.Map | null>(null)
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const polygonRef = useRef<L.Polygon | null>(null)
    const markersRef = useRef<L.Marker[]>([])
    const approvedLayersRef = useRef<L.Layer[]>([])

    const [points, setPoints] = useState<L.LatLng[]>([])

    // Context menu
    const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)
    const [dropdownOpen, setDropdownOpen] = useState(false)

    // Edit panel (shown below map when user clicks "Edit Coordinates" from ctx menu)
    const [editingIdx, setEditingIdx] = useState<number | null>(null)
    const [editLat, setEditLat] = useState('')
    const [editLng, setEditLng] = useState('')
    const [editError, setEditError] = useState('')

    const onChangeRef = useRef(onLocationChange)
    useEffect(() => {
        onChangeRef.current = onLocationChange
    }, [onLocationChange])
    const onPolygonChangeRef = useRef(onPolygonChange)
    useEffect(() => {
        onPolygonChangeRef.current = onPolygonChange
    }, [onPolygonChange])

    // External reset
    useEffect(() => {
        if (resetKey !== undefined) {
            if (initialPolygon && initialPolygon.length > 0) {
                const initialLatLngs = initialPolygon.map((p) => L.latLng(p[0], p[1]))
                setPoints(initialLatLngs)
            } else {
                setPoints([])
            }
            setCtxMenu(null)
            setDropdownOpen(false)
            setEditingIdx(null)
        }
    }, [resetKey, initialPolygon])

    // ── Map init ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current
        // @ts-expect-error leaflet internal
        if (container._leaflet_id) container._leaflet_id = null

        const center: L.LatLngExpression =
            initialPolygon && initialPolygon.length > 0
                ? [initialPolygon[0][0], initialPolygon[0][1]]
                : [1.5535, 110.3592]

        const map = L.map(container, {
            worldCopyJump: true
        }).setView(center, initialPolygon && initialPolygon.length > 0 ? 12 : 7)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(map)

        // Left-click on empty map → add point
        map.on('click', (e: L.LeafletMouseEvent) => {
            // Normalize longitude to [-180, 180] to prevent duplicate selections from world wrapping
            const normalizedLng = ((((e.latlng.lng + 180) % 360) + 360) % 360) - 180
            const normalizedLatLng = L.latLng(e.latlng.lat, normalizedLng)
            setPoints((prev) => [...prev, normalizedLatLng])
            setCtxMenu(null)
            setDropdownOpen(false)
        })

        // Suppress native right-click on the map tile layer
        map.on('contextmenu', (e: L.LeafletMouseEvent) => {
            L.DomEvent.preventDefault(e.originalEvent)
        })

        mapRef.current = map
        setMapInstance(map)

        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
                setMapInstance(null)
            }
        }
    }, [initialPolygon])

    // ── Sync markers + polygon ────────────────────────────────────────────────
    const syncMap = useCallback(
        (pts: L.LatLng[], activeIdx: number | null) => {
            const map = mapInstance
            if (!map) return

            // Remove old markers
            markersRef.current.forEach((m) => m.remove())
            markersRef.current = []

            // Remove old polygon
            if (polygonRef.current) {
                map.removeLayer(polygonRef.current)
                polygonRef.current = null
            }

            pts.forEach((p, i) => {
                const isActive = i === activeIdx
                const marker = L.marker(p, {
                    draggable: true,
                    icon: isActive ? makeSelectedIcon() : defaultIcon,
                    zIndexOffset: isActive ? 1000 : 0
                }).addTo(map)

                // Left click: Leaflet handles drag natively — no click handler needed.

                // Right click → open context menu at cursor position
                marker.on('contextmenu', (ev: L.LeafletMouseEvent) => {
                    L.DomEvent.stopPropagation(ev)
                    L.DomEvent.preventDefault(ev.originalEvent)

                    const containerEl = containerRef.current
                    if (!containerEl) return
                    const rect = containerEl.getBoundingClientRect()
                    const x = ev.originalEvent.clientX - rect.left
                    const y = ev.originalEvent.clientY - rect.top

                    setCtxMenu({ x, y, idx: i })
                    setDropdownOpen(true)
                })

                // Drag (live) → update polygon + parent area without touching React state
                marker.on('drag', () => {
                    const live = marker.getLatLng()
                    // Build a temporary coords array with the dragged position substituted
                    const livePts = pts.map((pt, j) => (j === i ? live : pt))
                    // Move the polygon vertices in-place (no React re-render)
                    if (polygonRef.current) {
                        polygonRef.current.setLatLngs(livePts)
                    }
                    // Notify parent so Lat/Lng/Area fields update live
                    if (livePts.length >= 3) {
                        const area = calculateAreaHectares(livePts)
                        const centroid = calculateCentroid(livePts)
                        onChangeRef.current?.(centroid.lat, centroid.lng, area)
                    }
                })

                // Drag end → commit final position to React state
                marker.on('dragend', () => {
                    const newLatLng = marker.getLatLng()
                    setPoints((prev) => {
                        const updated = [...prev]
                        updated[i] = newLatLng
                        return updated
                    })
                    // If this pin is currently being edited, sync edit inputs too
                    setEditingIdx((prev) => {
                        if (prev === i) {
                            setEditLat(newLatLng.lat.toFixed(6))
                            setEditLng(newLatLng.lng.toFixed(6))
                        }
                        return prev
                    })
                })

                markersRef.current.push(marker)
            })

            // Polygon / polyline
            if (pts.length >= 2) {
                polygonRef.current = L.polygon(pts, {
                    color: '#6b7280',
                    fillColor: '#6b7280',
                    fillOpacity: pts.length >= 3 ? 0.2 : 0,
                    weight: 2
                }).addTo(map)
            }

            // Notify parent — centroid + area
            if (pts.length >= 3) {
                const area = calculateAreaHectares(pts)
                const centroid = calculateCentroid(pts)
                onChangeRef.current?.(centroid.lat, centroid.lng, area)
                if (onPolygonChangeRef.current) {
                    const rawPoints = pts.map((ll) => [ll.lat, ll.lng] as [number, number])
                    onPolygonChangeRef.current?.(rawPoints, area)
                }
            } else if (pts.length === 0 && initialPolygon && initialPolygon.length > 0) {
                const centroid = getPolygonCentroid(initialPolygon)
                const area = getPolygonCentroid(initialPolygon)
                    ? calculateAreaHectares(initialPolygon.map((p) => L.latLng(p[0], p[1])))
                    : 0
                onChangeRef.current?.(centroid.lat, centroid.lng, area)
                onPolygonChangeRef.current?.(initialPolygon, area)
            } else {
                // To clear out fields gracefully, we pass 0 but parent can choose to hide it.
                onChangeRef.current?.(0, 0, 0)
                onPolygonChangeRef.current?.([])
            }
        },
        [initialPolygon, mapInstance]
    )

    useEffect(() => {
        // Active idx for icon highlight: ctxMenu pin OR editing pin
        const activeIdx = ctxMenu?.idx ?? editingIdx ?? null
        syncMap(points, activeIdx)
    }, [points, ctxMenu, editingIdx, syncMap, mapInstance])

    // ── Render Approved Regions ───────────────────────────────────────────────
    useEffect(() => {
        const map = mapInstance
        if (!map) return

        // Clear existing approved layers
        approvedLayersRef.current.forEach((layer) => map.removeLayer(layer))
        approvedLayersRef.current = []

        if (approvedRegions && approvedRegions.length > 0) {
            console.log('[ProjectMapInput] Rendering', approvedRegions.length, 'approved regions')
            let countAdded = 0
            approvedRegions.forEach((region) => {
                if (region.locationPolygon && region.locationPolygon.length >= 3) {
                    console.log('Adding polygon for region:', region.title, region.locationPolygon)
                    const polygon = L.polygon(region.locationPolygon, {
                        color: '#ef4444', // Bright Red to highlight unusable clearly
                        fillColor: '#ef4444',
                        fillOpacity: 0.35,
                        weight: 3,
                        interactive: true,
                        className: 'cursor-not-allowed',
                        dashArray: '10, 10' // Give it a hatched/dashed appearance to differentiate
                    }).addTo(map)

                    polygon.bindTooltip(`<b>${region.title}</b><br/>(Already Approved Project Region)`, {
                        direction: 'center',
                        className: 'text-xs'
                    })

                    approvedLayersRef.current.push(polygon)

                    // Add points to show the exact selected corners
                    region.locationPolygon.forEach((point) => {
                        const circle = L.circleMarker(point, {
                            color: '#b91c1c',
                            fillColor: '#ef4444',
                            fillOpacity: 0.8,
                            radius: 4,
                            weight: 2,
                            interactive: false
                        }).addTo(map)
                        approvedLayersRef.current.push(circle)
                    })
                    countAdded++
                } else {
                    console.log('Skipping region (invalid polygon):', region)
                }
            })
            console.log(`[ProjectMapInput] Added ${countAdded} polygons to the map`)
        }
    }, [approvedRegions, mapInstance])

    // ── Context menu actions ──────────────────────────────────────────────────

    const handleEditFromMenu = () => {
        if (ctxMenu === null) return
        const p = points[ctxMenu.idx]
        setEditingIdx(ctxMenu.idx)
        setEditLat(p.lat.toFixed(6))
        setEditLng(p.lng.toFixed(6))
        setEditError('')
        setDropdownOpen(false)
        setCtxMenu(null)
    }

    const handleDeleteFromMenu = () => {
        if (ctxMenu === null) return
        const idx = ctxMenu.idx
        setDropdownOpen(false)
        setCtxMenu(null)
        setEditingIdx((prev) => (prev === idx ? null : prev !== null && prev > idx ? prev - 1 : prev))
        setPoints((prev) => prev.filter((_, i) => i !== idx))
    }

    // ── Edit panel actions ────────────────────────────────────────────────────

    const handleApplyEdit = (e: React.MouseEvent) => {
        e.preventDefault()
        if (editingIdx === null) return
        const lat = parseFloat(editLat)
        const lng = parseFloat(editLng)
        if (isNaN(lat) || lat < -90 || lat > 90) {
            setEditError('Latitude must be between -90 and 90')
            return
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
            setEditError('Longitude must be between -180 and 180')
            return
        }
        setEditError('')
        setPoints((prev) => {
            const updated = [...prev]
            updated[editingIdx] = L.latLng(lat, lng)
            return updated
        })
        setEditingIdx(null)
    }

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.preventDefault()
        setEditingIdx(null)
        setEditError('')
    }

    // ── Toolbar actions ───────────────────────────────────────────────────────

    const handleRemoveLast = (e: React.MouseEvent) => {
        e.preventDefault()
        setPoints((prev) => prev.slice(0, -1))
        setCtxMenu(null)
        setDropdownOpen(false)
        setEditingIdx(null)
    }

    const handleClearAll = (e: React.MouseEvent) => {
        e.preventDefault()
        setPoints([])
        setCtxMenu(null)
        setDropdownOpen(false)
        setEditingIdx(null)
    }

    const handleResetMap = (e: React.MouseEvent) => {
        e.preventDefault()
        setPoints([])
        setCtxMenu(null)
        setDropdownOpen(false)
        setEditingIdx(null)
        if (mapInstance) {
            if (initialPolygon && initialPolygon.length > 0) {
                mapInstance.setView([initialPolygon[0][0], initialPolygon[0][1]], 12)
            } else {
                mapInstance.setView([1.5535, 110.3592], 7)
            }
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col space-y-2 w-full col-span-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Project Boundary Map</p>
                <p className="text-xs text-muted-foreground">
                    Left-click map to add · Drag pin to move · Right-click pin for options
                </p>
            </div>

            {/* Map + Floating context menu trigger */}
            <div className="relative">
                <div
                    ref={containerRef}
                    className="h-87.5 w-full rounded-md border border-border overflow-hidden relative z-0"
                />

                {/*
                  Invisible 0×0 trigger positioned at the right-clicked coordinates.
                  The DropdownMenu is controlled (open/onOpenChange) so Radix
                  positions the Content relative to this anchor point.
                */}
                {ctxMenu && (
                    <DropdownMenu
                        open={dropdownOpen}
                        onOpenChange={(o) => {
                            setDropdownOpen(o)
                            if (!o) setCtxMenu(null)
                        }}>
                        <DropdownMenuTrigger
                            asChild
                            style={{
                                position: 'absolute',
                                left: ctxMenu.x,
                                top: ctxMenu.y,
                                width: 0,
                                height: 0,
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                pointerEvents: 'none'
                            }}>
                            {/* Tiny invisible span that acts as the anchor */}
                            <span />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="start" side="bottom" sideOffset={2}>
                            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
                                Pin #{ctxMenu.idx + 1}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleEditFromMenu}
                                className="flex items-center gap-2 cursor-pointer">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit Coordinates
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={handleDeleteFromMenu}
                                className="flex items-center gap-2 cursor-pointer">
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Pin
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* ── Edit Panel ── */}
            {editingIdx !== null && points[editingIdx] && (
                <div className="rounded-md border border-border bg-muted/40 px-4 py-3 flex flex-col gap-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                        Editing coordinates for Pin #{editingIdx + 1}
                    </p>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <Label className="text-xs text-muted-foreground mb-1 block">Latitude</Label>
                            <Input
                                type="number"
                                step="any"
                                value={editLat}
                                onChange={(e) => setEditLat(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="-90 to 90"
                            />
                        </div>
                        <div className="flex-1">
                            <Label className="text-xs text-muted-foreground mb-1 block">Longitude</Label>
                            <Input
                                type="number"
                                step="any"
                                value={editLng}
                                onChange={(e) => setEditLng(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="-180 to 180"
                            />
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 flex items-center gap-1.5 shrink-0"
                            onClick={handleApplyEdit}>
                            <Check className="h-3.5 w-3.5" />
                            Apply
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 flex items-center gap-1.5 shrink-0"
                            onClick={handleCancelEdit}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    {editError && <p className="text-xs text-destructive">{editError}</p>}
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLast}
                    disabled={points.length === 0}
                    className="flex items-center gap-1.5">
                    <Undo2 className="h-3.5 w-3.5" />
                    Remove Last
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={points.length === 0}
                    className="flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetMap}
                    className="flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Map
                </Button>

                {points.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                        {points.length} pin{points.length !== 1 ? 's' : ''}
                        {points.length >= 3 ? ' ✓' : ` — ${3 - points.length} more needed`}
                    </span>
                )}
            </div>

            {points.length > 0 && points.length < 3 && (
                <p className="text-xs text-destructive">Place at least 3 pins to form a valid project area.</p>
            )}
        </div>
    )
}
