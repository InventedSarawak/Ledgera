import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

export default function AuthNav() {
    return (
        <nav style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
            <SignedIn>
                <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
                <SignInButton fallbackRedirectUrl="/" />
            </SignedOut>
        </nav>
    )
}
