import { AuthSync } from '@/components/AuthSync'
import { ClerkProvider } from '@clerk/nextjs'

export default function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <AuthSync />
            {children}
        </ClerkProvider>
    )
}
