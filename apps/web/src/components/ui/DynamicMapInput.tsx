'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const DynamicMapInput = dynamic(() => import('./ProjectMapInput'), {
    ssr: false,
    loading: () => (
        <div className="h-87.5 w-full rounded-md border flex flex-col items-center justify-center bg-muted/50 col-span-4 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading Map...</span>
        </div>
    )
})

export default DynamicMapInput
