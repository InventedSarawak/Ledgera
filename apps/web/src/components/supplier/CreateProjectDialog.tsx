'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { AxiosError } from 'axios'
import { ArrowLeft, ArrowRight, Paperclip, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ApiErrorResponse } from '@/lib/types'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import axiosInstance from '@/utils/axios'
import DynamicMapInput from '@/components/ui/DynamicMapInput'
import { getApprovedRegions } from '@/lib/api/projects'

// Step 1 schema — project details only
const step1Schema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(150, 'Title must not exceed 150 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    carbonAmount: z.preprocess(
        (v) => Number(v),
        z.number({ invalid_type_error: 'Carbon amount must be a number' }).gt(0, 'Carbon amount must be greater than 0')
    ),
    file: z
        .instanceof(File, { message: 'Cover image is required' })
        .refine((f) => f.size <= 5 * 1024 * 1024, 'Image must be 5MB or smaller')
        .refine((f) => f.type.startsWith('image/'), 'File must be an image'),
    auditReport: z
        .instanceof(File, { message: 'Audit report is required' })
        .refine((f) => f.size <= 10 * 1024 * 1024, 'Audit report must be 10MB or smaller')
})

// Step 2 schema — map / location details
const step2Schema = z.object({
    locationPolygon: z
        .array(z.tuple([z.number(), z.number()]))
        .min(3, 'Place at least 3 points on the map to define your project area'),
    area: z.preprocess(
        (v) => Number(v),
        z.number({ invalid_type_error: 'Area must be a number' }).gt(0, 'Area must be greater than 0')
    )
})

export function CreateProjectDialog() {
    const [open, setOpen] = useState(false)
    const { getToken } = useAuth()
    const queryClient = useQueryClient()

    // Fetch approved regions for map overlay
    const { data: approvedRegions } = useQuery({
        queryKey: ['approvedRegions'],
        queryFn: async () => {
            const token = await getToken()
            if (!token) return []
            return getApprovedRegions(token)
        },
        staleTime: 5 * 60 * 1000 // Cache for 5 mins
    })

    // Multi-step state
    const [step, setStep] = useState<1 | 2>(1)

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [locationLat, setLocationLat] = useState('')
    const [locationLng, setLocationLng] = useState('')
    const [locationPolygon, setLocationPolygon] = useState<[number, number][]>([])
    const [file, setFile] = useState<File | null>(null)
    const [auditReport, setAuditReport] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [area, setArea] = useState('')
    const [carbonAmount, setCarbonAmount] = useState('')
    // Key to programmatically reset the map
    const [mapResetKey, setMapResetKey] = useState(0)

    const resetForm = () => {
        setStep(1)
        setTitle('')
        setDescription('')
        setLocationLat('')
        setLocationLng('')
        setLocationPolygon([])
        setFile(null)
        setAuditReport(null)
        setError(null)
        setFieldErrors({})
        setArea('')
        setCarbonAmount('')
        setMapResetKey((k) => k + 1)
    }

    const { mutate: createProject, isPending } = useMutation({
        mutationFn: async () => {
            // Close the polygon by repeating first point (backend requires min=4)
            const closedPolygon: [number, number][] =
                locationPolygon.length >= 3 ? [...locationPolygon, locationPolygon[0]] : locationPolygon

            const formData = new FormData()
            formData.append('title', title)
            formData.append('description', description)
            formData.append('locationPolygon', JSON.stringify(closedPolygon))
            formData.append('area', area)
            formData.append('carbonAmount', carbonAmount)
            if (file) formData.append('image', file)
            if (auditReport) formData.append('auditReport', auditReport)

            const token = await getToken()
            return await axiosInstance.post('/projects', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            })
        },
        onSuccess: () => {
            setOpen(false)
            resetForm()
            queryClient.invalidateQueries({ queryKey: ['projects', 'mine'] })
        },
        onError: (err: AxiosError<ApiErrorResponse>) => {
            setError(err.response?.data?.message || 'Failed to create project')
        }
    })

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setFieldErrors({})

        const parsed = step1Schema.safeParse({ title, description, carbonAmount, file, auditReport })
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
        createProject()
    }

    const handleOpenChange = (value: boolean) => {
        if (!value) resetForm()
        setOpen(value)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>Create Project</Button>
            </DialogTrigger>
            <DialogContent className={step === 2 ? 'sm:max-w-2xl' : 'sm:max-w-lg'}>
                <DialogHeader>
                    <DialogTitle>{step === 1 ? 'Add Project — Details' : 'Add Project — Location'}</DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? 'Step 1 of 2: Fill in the project details.'
                            : 'Step 2 of 2: Draw your project boundary on the map.'}
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
                                    placeholder="Sarawak Mangrove"
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
                                    placeholder="Project details..."
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
                                    placeholder="1000"
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
                                            <button
                                                type="button"
                                                onClick={() => setFile(null)}
                                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                aria-label="Remove file">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
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
                                        />
                                    )}
                                    {file && (
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
                                <Label className="text-right">Audit Report</Label>
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
                                        />
                                    )}
                                    {auditReport && (
                                        <button
                                            type="button"
                                            onClick={() => setAuditReport(null)}
                                            className="mt-1 text-xs text-muted-foreground underline hover:text-foreground">
                                            Change file
                                        </button>
                                    )}
                                </div>
                                {fieldErrors.auditReport && (
                                    <div className="col-start-2 col-span-3 text-xs text-destructive">
                                        {fieldErrors.auditReport}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
                                    resetKey={mapResetKey}
                                    onLocationChange={(lat, lng, calculatedArea) => {
                                        setLocationLat(lat != null ? String(lat) : '')
                                        setLocationLng(lng != null ? String(lng) : '')
                                        setArea(calculatedArea != null ? String(calculatedArea) : '')
                                    }}
                                    onPolygonChange={(polygon) => setLocationPolygon(polygon)}
                                />
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3 px-1">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Centroid Lat</Label>
                                    <Input
                                        value={locationLat}
                                        readOnly
                                        className="bg-muted text-sm h-8"
                                        placeholder="—"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Centroid Lng</Label>
                                    <Input
                                        value={locationLng}
                                        readOnly
                                        className="bg-muted text-sm h-8"
                                        placeholder="—"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Area (hectares)</Label>
                                    <Input value={area} readOnly className="bg-muted text-sm h-8" placeholder="—" />
                                    {fieldErrors.area && (
                                        <p className="text-xs text-destructive mt-1">{fieldErrors.area}</p>
                                    )}
                                </div>
                            </div>
                            {fieldErrors.locationPolygon && (
                                <p className="text-xs text-destructive px-1">{fieldErrors.locationPolygon}</p>
                            )}
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
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Creating...' : 'Create Project'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
