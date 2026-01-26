'use client'

import { Button } from '@/components/ui/button'

interface PaginationProps {
    page: number
    limit: number
    total: number
    onPageChange: (page: number) => void
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
    const pageCount = Math.max(1, Math.ceil(total / Math.max(1, limit)))
    const start = total === 0 ? 0 : (page - 1) * limit + 1
    const end = Math.min(page * limit, total)

    return (
        <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{start}</span>–
                <span className="font-medium text-foreground">{end}</span> of
                <span className="ml-1 font-medium text-foreground">{total}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                    Previous
                </Button>
                <div className="text-sm">
                    Page <span className="font-medium">{page}</span> of <span className="font-medium">{pageCount}</span>
                </div>
                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
                    Next
                </Button>
            </div>
        </div>
    )
}
