import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)'])

const isOnboardingRoute = createRouteMatcher(['/onboarding'])

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims } = await auth()

    if (userId) {
        const metadata = sessionClaims?.metadata as CustomJwtSessionClaims['metadata']
        const role = metadata?.role

        if (!role && !isOnboardingRoute(req)) {
            const onboardingUrl = new URL('/onboarding', req.url)
            return NextResponse.redirect(onboardingUrl)
        }

        if (role && isOnboardingRoute(req)) {
            const dashboardUrl = new URL('/', req.url)
            return NextResponse.redirect(dashboardUrl)
        }
    }

    if (!isPublicRoute(req)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)'
    ]
}
