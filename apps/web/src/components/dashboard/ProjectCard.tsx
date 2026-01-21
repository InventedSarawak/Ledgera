import Image from 'next/image'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Project } from '@/lib/types'

interface ProjectCardProps {
    project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
    const isDeployed = project.status === 'DEPLOYED'

    return (
        <Card className="overflow-hidden bg-white">
            <div className="relative h-48 w-full bg-gray-100">
                {project.imageUrl ? (
                    <Image src={project.imageUrl} alt={project.title} fill className="object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">No Image</div>
                )}
                <div className="absolute right-2 top-2">
                    <Badge
                        className={
                            isDeployed
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                        }>
                        {project.status}
                    </Badge>
                </div>
            </div>
            <CardHeader>
                <div className="flex flex-col gap-1">
                    <h3 className="line-clamp-1 text-lg font-semibold leading-none tracking-tight">{project.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">
                            {project.locationLat.toFixed(2)}, {project.locationLng.toFixed(2)}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="line-clamp-2 text-sm text-neutral-600">{project.description}</p>
            </CardContent>
            <CardFooter>
                <Button variant="ghost" className="w-full text-neutral-600">
                    View Details
                </Button>
            </CardFooter>
        </Card>
    )
}
