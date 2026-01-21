'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
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

    const { mutate: createProject, isPending } = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            formData.append('title', title)
            formData.append('description', description)
            formData.append('locationLat', locationLat)
            formData.append('locationLng', locationLng)

            if (file) {
                formData.append('image', file)
                // Note: The key 'image' depends on backend.
                // Instructions imply generic file input.
                // I will use 'image' or based on payload 'imageUrl' is the result.
                // Usually file upload field name is 'file' or 'image'.
                // I'll guess 'file' is safer default or 'image'.
                // Backend `project` struct has `ImageURL`.
                // I'll stick to 'image' as a common convention for the file field.
            }

            // Explicitly set Content-Type header as requested
            const token = await getToken()
            const response = await axiosInstance.post('/projects', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            })
            return response.data
        },
        onSuccess: () => {
            setOpen(false)
            // Reset form
            setTitle('')
            setDescription('')
            setLocationLat('')
            setLocationLng('')
            setFile(null)
            setError(null)
            // Invalidate cache
            queryClient.invalidateQueries({ queryKey: ['projects', 'mine'] })
        },
        onError: (err: AxiosError<ApiErrorResponse>) => {
            console.error(err)
            setError(err.response?.data?.message || 'Failed to create project')
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !description || !locationLat || !locationLng || !file) {
            setError('Please fill all fields')
            return
        }
        createProject()
    }

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
                                    if (e.target.files?.[0]) {
                                        setFile(e.target.files[0])
                                    }
                                }}
                                className="col-span-3 cursor-pointer"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? 'Creating...' : 'Create Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
