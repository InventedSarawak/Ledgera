'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const pathname = usePathname()
    const { isSignedIn } = useAuth()

    const navLinks = [
        { name: 'Marketplace', href: '/marketplace' },
        { name: 'About', href: '/about' }
    ]

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <span className="text-2xl font-bold tracking-tight text-slate-900">Ledgera</span>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex md:items-center md:space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:flex md:items-center md:space-x-4">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <Button variant="ghost" size="default">
                                    Sign In
                                </Button>
                            </SignInButton>
                            <SignInButton mode="modal">
                                <Button variant="default" size="default">
                                    Get Started
                                </Button>
                            </SignInButton>
                        </SignedOut>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            <span className="sr-only">Open main menu</span>
                            {mobileMenuOpen ? (
                                <X className="h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="border-t border-slate-200 bg-white md:hidden">
                    <div className="space-y-1 px-4 pb-3 pt-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="block rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => setMobileMenuOpen(false)}>
                                {link.name}
                            </Link>
                        ))}
                        <SignedIn>
                            <Link
                                href="/dashboard"
                                className="block rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => setMobileMenuOpen(false)}>
                                Dashboard
                            </Link>
                        </SignedIn>
                    </div>
                    <div className="border-t border-slate-200 px-4 pb-3 pt-4">
                        <SignedOut>
                            <div className="space-y-2">
                                <SignInButton mode="modal">
                                    <Button variant="ghost" size="default" className="w-full">
                                        Sign In
                                    </Button>
                                </SignInButton>
                                <SignInButton mode="modal">
                                    <Button variant="default" size="default" className="w-full">
                                        Get Started
                                    </Button>
                                </SignInButton>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            <div className="flex items-center space-x-3">
                                <UserButton
                                    afterSignOutUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: 'h-10 w-10'
                                        }
                                    }}
                                />
                                <span className="text-sm font-medium text-slate-900">My Account</span>
                            </div>
                        </SignedIn>
                    </div>
                </div>
            )}
        </nav>
    )
}
