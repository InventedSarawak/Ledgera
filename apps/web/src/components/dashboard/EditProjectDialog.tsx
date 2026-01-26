'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
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

interface EditProjectDialogProps {
    project: Project
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
    const { getToken } = useAuth()
    const queryClient = useQueryClient()

    const [title, setTitle] = useState(project.title)
    const [description, setDescription] = useState(project.description)
    const [locationLat, setLocationLat] = useState(String(project.locationLat))
    const [locationLng, setLocationLng] = useState(String(project.locationLng))
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    // Single-step form (removed step-based flow)
    const [area, setArea] = useState(String((project.area ?? '') as unknown as string))
    // Top-left is represented by locationLat/locationLng; map removed

    const schema = z.object({
        title: z
            .string()
            .min(3, 'Title must be at least 3 characters')
            .max(150, 'Title must not exceed 150 characters'),
        description: z.string().min(10, 'Description must be at least 10 characters'),
        locationLat: z.preprocess(
            (v) => (typeof v === 'string' ? parseFloat(v) : v),
            z
                .number({ invalid_type_error: 'Latitude must be a number' })
                .gte(-90, 'Latitude must be between -90 and 90')
                .lte(90, 'Latitude must be between -90 and 90')
        ),
        locationLng: z.preprocess(
            (v) => (typeof v === 'string' ? parseFloat(v) : v),
            z
                .number({ invalid_type_error: 'Longitude must be a number' })
                .gte(-180, 'Longitude must be between -180 and 180')
                .lte(180, 'Longitude must be between -180 and 180')
        ),
        area: z.preprocess(
            (v) => (typeof v === 'string' ? parseFloat(v) : v),
            z.number({ invalid_type_error: 'Area must be a number' }).gt(0, 'Area must be greater than 0')
        ),
        file: z
            .instanceof(File)
            .refine((f) => f.size <= 5 * 1024 * 1024, 'Image must be 5MB or smaller')
            .refine((f) => f.type.startsWith('image/'), 'File must be an image')
            .optional()
    })

    const handleOpenChange = (value: boolean) => {
        if (value) {
            setTitle(project.title)
            setDescription(project.description)
            setLocationLat(String(project.locationLat))
            setLocationLng(String(project.locationLng))
            setFile(null)
            setError(null)
            setFieldErrors({})
            setArea(String((project.area ?? '') as unknown as string))
        }
        onOpenChange(value)
    }

    const { mutate: updateProject, isPending } = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            if (title) formData.append('title', title)
            if (description) formData.append('description', description)
            if (locationLat) formData.append('locationLat', locationLat)
            if (locationLng) formData.append('locationLng', locationLng)
            if (file) formData.append('image', file)
            if (area) formData.append('area', area)
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setFieldErrors({})

        const parsed = schema.safeParse({ title, description, locationLat, locationLng, area, file: file ?? undefined })
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
        updateProject()
    }

    const isReadOnly = project.status === 'PENDING' || project.status === 'APPROVED' || project.status === 'DEPLOYED'

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>Update your project details.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
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
                            <Label htmlFor="lat" className="text-right">
                                Latitude
                            </Label>
                            <Input
                                id="lat"
                                type="number"
                                step="any"
                                value={locationLat}
                                onChange={(e) => setLocationLat(e.target.value)}
                                className="col-span-3"
                                disabled={isReadOnly}
                            />
                            {fieldErrors.locationLat && (
                                <div className="col-start-2 col-span-3 text-xs text-destructive">
                                    {fieldErrors.locationLat}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lng" className="text-right">
                                Longitude
                            </Label>
                            <Input
                                id="lng"
                                type="number"
                                step="any"
                                value={locationLng}
                                onChange={(e) => setLocationLng(e.target.value)}
                                className="col-span-3"
                                disabled={isReadOnly}
                            />
                            {fieldErrors.locationLng && (
                                <div className="col-start-2 col-span-3 text-xs text-destructive">
                                    {fieldErrors.locationLng}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="image" className="text-right">
                                Cover Image
                            </Label>
                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) setFile(e.target.files[0])
                                }}
                                className="col-span-3 cursor-pointer"
                                disabled={isReadOnly}
                            />
                            {fieldErrors.file && (
                                <div className="col-start-2 col-span-3 text-xs text-destructive">
                                    {fieldErrors.file}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="area" className="text-right">
                                Area (sq km)
                            </Label>
                            <Input
                                id="area"
                                type="number"
                                step="any"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                className="col-span-3"
                                disabled={isReadOnly}
                            />
                            {fieldErrors.area && (
                                <div className="col-start-2 col-span-3 text-xs text-destructive">
                                    {fieldErrors.area}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending || isReadOnly}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? 'Updating...' : 'Update Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
