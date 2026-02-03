'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import axiosInstance from '@/utils/axios'
import { Project } from '@/lib/types'

interface DeleteProjectDialogProps {
    project: Project
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DeleteProjectDialog({ project, open, onOpenChange }: DeleteProjectDialogProps) {
    const { getToken } = useAuth()
    const queryClient = useQueryClient()

    const { mutate: deleteProject, isPending } = useMutation({
        mutationFn: async () => {
            const token = await getToken()
            await axiosInstance.delete(`/projects/${project.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
        },
        onSuccess: () => {
            onOpenChange(false)
            queryClient.invalidateQueries({ queryKey: ['projects', 'mine'] })
        }
    })

    const isBlocked = project.status === 'PENDING' || project.status === 'APPROVED' || project.status === 'DEPLOYED'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Delete Project</DialogTitle>
                    <DialogDescription>
                        {isBlocked
                            ? 'This project cannot be deleted after submission/approval/deployment.'
                            : 'This action cannot be undone. This will permanently delete the project.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2 text-sm">
                    <p>
                        Are you sure you want to delete <span className="font-semibold">{project.title}</span>?
                    </p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={isBlocked || isPending}
                        onClick={() => deleteProject()}>
                        {isPending ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
