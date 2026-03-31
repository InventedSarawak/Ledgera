'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SignedOut, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Menu, X, ShoppingCart, Store } from 'lucide-react'

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
            <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <span className="text-2xl font-bold tracking-tight text-slate-900">Ledgera</span>
                    </Link>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:flex md:items-center md:space-x-3">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                                    <ShoppingCart className="h-4 w-4" />
                                    Buy Credits
                                </Button>
                            </SignInButton>
                            <SignInButton mode="modal">
                                <Button variant="outline" size="sm" className="gap-1.5 text-sm">
                                    <Store className="h-4 w-4" />
                                    Sell Credits
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
                        <Link
                            href="/"
                            className="block rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setMobileMenuOpen(false)}>
                            Dashboard
                        </Link>
                    </div>
                    <div className="border-t border-slate-200 px-4 pb-3 pt-4">
                        <SignedOut>
                            <div className="space-y-2">
                                <SignInButton mode="modal">
                                    <Button variant="default" size="default" className="w-full gap-2">
                                        <ShoppingCart className="h-4 w-4" />
                                        Buy Credits
                                    </Button>
                                </SignInButton>
                                <SignInButton mode="modal">
                                    <Button variant="outline" size="default" className="w-full gap-2">
                                        <Store className="h-4 w-4" />
                                        Sell Credits
                                    </Button>
                                </SignInButton>
                            </div>
                        </SignedOut>
                    </div>
                </div>
            )}
        </nav>
    )
}
