'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { AxiosError } from 'axios'

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

// Map removed: using direct form inputs for coordinates and area.

export function CreateProjectDialog() {
    const [open, setOpen] = useState(false)
    const { getToken } = useAuth()
    const queryClient = useQueryClient()

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [locationLat, setLocationLat] = useState('')
    const [locationLng, setLocationLng] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [area, setArea] = useState('')

    const schema = z.object({
        title: z
            .string()
            .min(3, 'Title must be at least 3 characters')
            .max(150, 'Title must not exceed 150 characters'),
        description: z.string().min(10, 'Description must be at least 10 characters'),
        locationLat: z.preprocess(
            (v) => Number(v),
            z.number({ invalid_type_error: 'Latitude must be a number' }).gte(-90).lte(90)
        ),
        locationLng: z.preprocess(
            (v) => Number(v),
            z.number({ invalid_type_error: 'Longitude must be a number' }).gte(-180).lte(180)
        ),
        area: z.preprocess(
            (v) => Number(v),
            z.number({ invalid_type_error: 'Area must be a number' }).gt(0, 'Area must be greater than 0')
        ),
        file: z
            .instanceof(File, { message: 'Cover image is required' })
            .refine((f) => f.size <= 5 * 1024 * 1024, 'Image must be 5MB or smaller')
            .refine((f) => f.type.startsWith('image/'), 'File must be an image')
    })

    const { mutate: createProject, isPending } = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            formData.append('title', title)
            formData.append('description', description)
            formData.append('locationLat', locationLat)
            formData.append('locationLng', locationLng)
            formData.append('area', area)
            if (file) formData.append('image', file)

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
            setTitle('')
            setDescription('')
            setLocationLat('')
            setLocationLng('')
            setFile(null)
            setError(null)
            setFieldErrors({})
            setArea('')
            queryClient.invalidateQueries({ queryKey: ['projects', 'mine'] })
        },
        onError: (err: AxiosError<ApiErrorResponse>) => {
            setError(err.response?.data?.message || 'Failed to create project')
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setFieldErrors({})
        const parsed = schema.safeParse({ title, description, locationLat, locationLng, area, file })
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
        createProject()
    }

    // No map interactions; coordinates and area are entered directly.

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Create Project</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Add Project</DialogTitle>
                    <DialogDescription>Create a new Carbon Credit Project here.</DialogDescription>
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
                            />
                            {fieldErrors.file && (
                                <div className="col-start-2 col-span-3 text-xs text-destructive">
                                    {fieldErrors.file}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="area" className="text-right">
                                Area (hectares)
                            </Label>
                            <Input
                                id="area"
                                type="number"
                                step="any"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                className="col-span-3"
                            />
                            {fieldErrors.area && (
                                <div className="col-start-2 col-span-3 text-xs text-destructive">
                                    {fieldErrors.area}
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
                                placeholder="1.2345"
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
                                placeholder="101.567"
                            />
                            {fieldErrors.locationLng && (
                                <div className="col-start-2 col-span-3 text-xs text-destructive">
                                    {fieldErrors.locationLng}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Creating...' : 'Create Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
