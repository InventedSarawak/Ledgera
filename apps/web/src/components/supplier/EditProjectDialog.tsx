'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Loader2, ArrowLeft, ArrowRight, Paperclip, X } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { AxiosError } from 'axios'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import axiosInstance from '@/utils/axios'
import { ApiErrorResponse, Project } from '@/lib/types'
import DynamicMapInput from '@/components/ui/ProjectMapInput'
import { getPolygonCentroid } from '@/lib/utils'
import { getApprovedRegions } from '@/lib/api/projects'

interface EditProjectDialogProps {
    project: Project
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Step 1 schema — project details
const step1Schema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(150, 'Title must not exceed 150 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    carbonAmount: z
        .preprocess(
            (v) => (typeof v === 'string' ? parseFloat(v) : v),
            z
                .number({ invalid_type_error: 'Carbon amount must be a number' })
                .gt(0, 'Carbon amount must be greater than 0')
        )
        .optional(),
    file: z
        .instanceof(File)
        .refine((f) => f.size <= 5 * 1024 * 1024, 'Image must be 5MB or smaller')
        .refine((f) => f.type.startsWith('image/'), 'File must be an image')
        .optional()
})

// Step 2 schema — map / location details
const step2Schema = z.object({
    locationPolygon: z
        .array(z.tuple([z.number(), z.number()]))
        .min(3, 'Place at least 3 points on the map to define your project area'),
    area: z.preprocess(
        (v) => (typeof v === 'string' ? parseFloat(v) : v),
        z.number({ invalid_type_error: 'Area must be a number' }).gt(0, 'Area must be greater than 0')
    )
})

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
    const { getToken } = useAuth()
    const queryClient = useQueryClient()

    // Fetch approved regions for map overlay (excluding this project's own region if it's already approved)
    const { data: approvedRegions } = useQuery({
        queryKey: ['approvedRegions', project.id],
        queryFn: async () => {
            const token = await getToken()
            if (!token) return []
            return getApprovedRegions(token, project.id)
        },
        staleTime: 5 * 60 * 1000 // Cache for 5 mins
    })

    // Multi-step state
    const [step, setStep] = useState<1 | 2>(1)

    const [title, setTitle] = useState(project.title)
    const [description, setDescription] = useState(project.description)
    const [locationLat, setLocationLat] = useState(String(getPolygonCentroid(project.locationPolygon).lat))
    const [locationLng, setLocationLng] = useState(String(getPolygonCentroid(project.locationPolygon).lng))
    const [locationPolygon, setLocationPolygon] = useState<[number, number][]>(project.locationPolygon || [])
    const [file, setFile] = useState<File | null>(null)
    const [auditReport, setAuditReport] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [area, setArea] = useState(String((project.area ?? '') as unknown as string))
    const [carbonAmount, setCarbonAmount] = useState(String((project.carbonAmount ?? '') as unknown as string))
    const [mapResetKey, setMapResetKey] = useState(0)

    const handleOpenChange = (value: boolean) => {
        if (value) {
            // Reset to project's current values when re-opening
            setStep(1)
            setTitle(project.title)
            setDescription(project.description)
            setLocationLat(String(getPolygonCentroid(project.locationPolygon).lat))
            setLocationLng(String(getPolygonCentroid(project.locationPolygon).lng))
            setLocationPolygon(project.locationPolygon || [])
            setFile(null)
            setAuditReport(null)
            setError(null)
            setFieldErrors({})
            setArea(String((project.area ?? '') as unknown as string))
            setCarbonAmount(String((project.carbonAmount ?? '') as unknown as string))
            setMapResetKey((k) => k + 1)
        }
        onOpenChange(value)
    }

    const { mutate: updateProject, isPending } = useMutation({
        mutationFn: async () => {
            const formData = new FormData()

            const closedPolygon: [number, number][] =
                locationPolygon.length >= 3 ? [...locationPolygon, locationPolygon[0]] : locationPolygon

            if (title) formData.append('title', title)
            if (description) formData.append('description', description)
            if (locationPolygon.length > 0) formData.append('locationPolygon', JSON.stringify(closedPolygon))
            if (file) formData.append('image', file)
            if (auditReport) formData.append('auditReport', auditReport)
            if (area) formData.append('area', area)
            if (carbonAmount) formData.append('carbonAmount', carbonAmount)
            const token = await getToken()
            const response = await axiosInstance.patch(`/projects/${project.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            })
            return response.data as Project
        },
        onSuccess: () => {
            onOpenChange(false)
            queryClient.invalidateQueries({ queryKey: ['projects', 'mine'] })
        },
        onError: (err: AxiosError<ApiErrorResponse>) => {
            console.error(err)
            setError(err.response?.data?.message || 'Failed to update project')
        }
    })

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setFieldErrors({})

        const parsed = step1Schema.safeParse({
            title,
            description,
            carbonAmount,
            file: file ?? undefined
        })
        if (!parsed.success) {
            const errs: Record<string, string> = {}
            for (const issue of parsed.error.issues) {
                const key = issue.path[0] as string
                if (!errs[key]) errs[key] = issue.message
            }
            setFieldErrors(errs)
            setError('Please correct the highlighted fields')
            return
        }
        setStep(2)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setFieldErrors({})

        const parsed = step2Schema.safeParse({ locationPolygon, area })
        if (!parsed.success) {
            const errs: Record<string, string> = {}
            for (const issue of parsed.error.issues) {
                const key = issue.path[0] as string
                if (!errs[key]) errs[key] = issue.message
            }
            setFieldErrors(errs)
            setError(errs.locationPolygon ?? 'Please select a valid project area on the map (at least 3 points)')
            return
        }
        updateProject()
    }

    const isReadOnly = project.status === 'PENDING' || project.status === 'APPROVED' || project.status === 'DEPLOYED'

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className={step === 2 ? 'sm:max-w-2xl' : 'sm:max-w-lg'}>
                <DialogHeader>
                    <DialogTitle>{step === 1 ? 'Edit Project — Details' : 'Edit Project — Location'}</DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? 'Step 1 of 2: Update the project details.'
                            : 'Step 2 of 2: Adjust your project boundary on the map.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Step indicator */}
                <div className="flex items-center gap-2 py-1">
                    <div
                        className={`h-2 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`}
                    />
                    <div
                        className={`h-2 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}
                    />
                </div>

                {/* ── Step 1: Project Details ── */}
                {step === 1 && (
                    <form onSubmit={handleNextStep}>
                        <div className="grid gap-4 py-4">
                            {error && <div className="text-sm font-medium text-destructive">{error}</div>}

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="title" className="text-right">
                                    Title
                                </Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="col-span-3"
                                    disabled={isReadOnly}
                                />
                                {fieldErrors.title && (
                                    <div className="col-start-2 col-span-3 text-xs text-destructive">
                                        {fieldErrors.title}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="col-span-3"
                                    disabled={isReadOnly}
                                />
                                {fieldErrors.description && (
                                    <div className="col-start-2 col-span-3 text-xs text-destructive">
                                        {fieldErrors.description}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="carbonAmount" className="text-right">
                                    Carbon Amount (tonnes)
                                </Label>
                                <Input
                                    id="carbonAmount"
                                    type="number"
                                    step="any"
                                    value={carbonAmount}
                                    onChange={(e) => setCarbonAmount(e.target.value)}
                                    className="col-span-3"
                                    disabled={isReadOnly}
                                />
                                {fieldErrors.carbonAmount && (
                                    <div className="col-start-2 col-span-3 text-xs text-destructive">
                                        {fieldErrors.carbonAmount}
                                    </div>
                                )}
                            </div>

                            {/* Cover Image */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Cover Image</Label>
                                <div className="col-span-3">
                                    {file ? (
                                        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="flex-1 truncate text-sm">{file.name}</span>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {(file.size / 1024).toFixed(0)} KB
                                            </span>
                                            {!isReadOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFile(null)}
                                                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                    aria-label="Remove file">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <Input
                                            id="image"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) setFile(e.target.files[0])
                                            }}
                                            className="cursor-pointer"
                                            disabled={isReadOnly}
                                        />
                                    )}
                                    {file && !isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            className="mt-1 text-xs text-muted-foreground underline hover:text-foreground">
                                            Change file
                                        </button>
                                    )}
                                </div>
                                {fieldErrors.file && (
                                    <div className="col-start-2 col-span-3 text-xs text-destructive">
                                        {fieldErrors.file}
                                    </div>
                                )}
                            </div>

                            {/* Audit Report */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Audit Report (Optional)</Label>
                                <div className="col-span-3">
                                    {auditReport ? (
                                        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="flex-1 truncate text-sm">{auditReport.name}</span>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {(auditReport.size / 1024).toFixed(0)} KB
                                            </span>
                                        </div>
                                    ) : (
                                        <Input
                                            id="auditReport"
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) setAuditReport(e.target.files[0])
                                            }}
                                            className="cursor-pointer"
                                            disabled={isReadOnly}
                                        />
                                    )}
                                    {auditReport && !isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => setAuditReport(null)}
                                            className="mt-1 text-xs text-muted-foreground underline hover:text-foreground">
                                            Change file
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex items-center gap-1.5">
                                Next
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {/* ── Step 2: Map ── */}
                {step === 2 && (
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            {error && <div className="text-sm font-medium text-destructive">{error}</div>}

                            <div className="col-span-4 py-2">
                                <DynamicMapInput
                                    approvedRegions={approvedRegions}
                                    initialPolygon={project.locationPolygon}
                                    resetKey={mapResetKey}
                                    onPolygonChange={(points, calculatedArea) => {
                                        if (!isReadOnly) {
                                            setLocationPolygon(points)
                                            if (points.length >= 3) {
                                                const centroid = getPolygonCentroid(points)
                                                setLocationLat(String(centroid.lat))
                                                setLocationLng(String(centroid.lng))
                                                setArea(calculatedArea ? String(calculatedArea) : '')
                                            } else {
                                                setLocationLat('')
                                                setLocationLng('')
                                                setArea('')
                                            }
                                        }
                                    }}
                                />
                            </div>

                            {/* Read-only coordinate / area summary */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Label className="text-xs text-muted-foreground mb-1 block">
                                        Latitude (centroid)
                                    </Label>
                                    <Input
                                        value={locationLat}
                                        readOnly
                                        className="bg-muted text-sm h-8"
                                        placeholder="—"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-xs text-muted-foreground mb-1 block">
                                        Longitude (centroid)
                                    </Label>
                                    <Input
                                        value={locationLng}
                                        readOnly
                                        className="bg-muted text-sm h-8"
                                        placeholder="—"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-xs text-muted-foreground mb-1 block">Area (hectares)</Label>
                                    <Input
                                        value={area}
                                        readOnly
                                        className="bg-muted text-sm h-8"
                                        placeholder="—"
                                        disabled={isReadOnly}
                                    />
                                    {fieldErrors.area && (
                                        <p className="text-xs text-destructive mt-1">{fieldErrors.area}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setStep(1)
                                    setError(null)
                                    setFieldErrors({})
                                }}
                                className="flex items-center gap-1.5">
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>
                            <Button type="submit" disabled={isPending || isReadOnly}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isPending ? 'Updating...' : 'Update Project'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
