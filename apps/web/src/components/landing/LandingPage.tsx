import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Leaf, Shield, TrendingUp, Users, Globe, Lock } from 'lucide-react'

export function LandingPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                            Tokenized Carbon Credits for a <span className="text-green-600">Sustainable Future</span>
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-slate-600">
                            Buy, sell, and retire verifiable carbon offsets backed by real-world assets on the
                            blockchain. Join the revolution in transparent, trustworthy climate action.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-4">
                            <Link href="/marketplace">
                                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                                    Explore Marketplace
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="lg" variant="outline">
                                    Register Project
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">How It Works</h2>
                        <p className="mt-4 text-lg text-slate-600">
                            A simple, transparent process for sustainable impact
                        </p>
                    </div>

                    <div className="mt-16 grid gap-8 md:grid-cols-3">
                        {/* Step 1 */}
                        <Card className="border-slate-200 bg-white">
                            <CardHeader>
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                                    <Leaf className="h-6 w-6 text-green-600" />
                                </div>
                                <CardTitle className="text-xl">Supply</CardTitle>
                                <CardDescription>
                                    Project suppliers upload verified real-world asset data and carbon offset projects
                                    to the platform.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm font-medium text-green-600">
                                    <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                                        1
                                    </span>
                                    Register Assets
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 2 */}
                        <Card className="border-slate-200 bg-white">
                            <CardHeader>
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                                    <Shield className="h-6 w-6 text-blue-600" />
                                </div>
                                <CardTitle className="text-xl">Verify</CardTitle>
                                <CardDescription>
                                    Admins and validators review, verify, and tokenize approved carbon credit projects
                                    on-chain.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm font-medium text-blue-600">
                                    <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                                        2
                                    </span>
                                    Tokenize Credits
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 3 */}
                        <Card className="border-slate-200 bg-white">
                            <CardHeader>
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                                    <TrendingUp className="h-6 w-6 text-purple-600" />
                                </div>
                                <CardTitle className="text-xl">Trade</CardTitle>
                                <CardDescription>
                                    Buyers purchase verified carbon credits on the marketplace and retire them to offset
                                    emissions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm font-medium text-purple-600">
                                    <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs text-white">
                                        3
                                    </span>
                                    Offset & Retire
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Featured Projects Section */}
            <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            Featured Projects
                        </h2>
                        <p className="mt-4 text-lg text-slate-600">
                            Discover verified carbon offset projects from around the world
                        </p>
                    </div>

                    <div className="mt-16 grid gap-8 md:grid-cols-3">
                        {/* Project 1 */}
                        <Card className="overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-lg">
                            <div className="h-48 bg-linear-to-br from-green-400 to-green-600" />
                            <CardHeader>
                                <CardTitle>Sarawak Mangrove Restoration</CardTitle>
                                <CardDescription>
                                    <div className="flex items-center text-slate-600">
                                        <Globe className="mr-1.5 h-4 w-4" />
                                        Sarawak, Malaysia
                                    </div>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold text-slate-900">$25</span>
                                    <span className="text-sm text-slate-600">per ton CO₂</span>
                                </div>
                                <Link href="/marketplace">
                                    <Button className="mt-4 w-full" variant="outline">
                                        View Details
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Project 2 */}
                        <Card className="overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-lg">
                            <div className="h-48 bg-linear-to-br from-blue-400 to-blue-600" />
                            <CardHeader>
                                <CardTitle>Amazon Rainforest Conservation</CardTitle>
                                <CardDescription>
                                    <div className="flex items-center text-slate-600">
                                        <Globe className="mr-1.5 h-4 w-4" />
                                        Acre, Brazil
                                    </div>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold text-slate-900">$30</span>
                                    <span className="text-sm text-slate-600">per ton CO₂</span>
                                </div>
                                <Link href="/marketplace">
                                    <Button className="mt-4 w-full" variant="outline">
                                        View Details
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Project 3 */}
                        <Card className="overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-lg">
                            <div className="h-48 bg-linear-to-br from-emerald-400 to-emerald-600" />
                            <CardHeader>
                                <CardTitle>Solar Farm Initiative</CardTitle>
                                <CardDescription>
                                    <div className="flex items-center text-slate-600">
                                        <Globe className="mr-1.5 h-4 w-4" />
                                        Gujarat, India
                                    </div>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold text-slate-900">$18</span>
                                    <span className="text-sm text-slate-600">per ton CO₂</span>
                                </div>
                                <Link href="/marketplace">
                                    <Button className="mt-4 w-full" variant="outline">
                                        View Details
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Trust/Stats Section */}
            <section className="bg-slate-900 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="text-center">
                            <div className="mb-4 flex justify-center">
                                <Leaf className="h-12 w-12 text-green-500" />
                            </div>
                            <div className="text-4xl font-bold text-white">10,000+</div>
                            <div className="mt-2 text-lg text-slate-400">Tons CO₂ Offset</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-4 flex justify-center">
                                <Users className="h-12 w-12 text-blue-500" />
                            </div>
                            <div className="text-4xl font-bold text-white">50+</div>
                            <div className="mt-2 text-lg text-slate-400">Verified Projects</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-4 flex justify-center">
                                <Lock className="h-12 w-12 text-purple-500" />
                            </div>
                            <div className="text-4xl font-bold text-white">100%</div>
                            <div className="mt-2 text-lg text-slate-400">On-Chain Transparency</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-8 md:grid-cols-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Ledgera</h3>
                            <p className="mt-2 text-sm text-slate-600">
                                Building a sustainable future through blockchain technology.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">Platform</h4>
                            <ul className="mt-4 space-y-2">
                                <li>
                                    <Link href="/marketplace" className="text-sm text-slate-600 hover:text-slate-900">
                                        Marketplace
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/governance" className="text-sm text-slate-600 hover:text-slate-900">
                                        Governance
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/projects" className="text-sm text-slate-600 hover:text-slate-900">
                                        Projects
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">Company</h4>
                            <ul className="mt-4 space-y-2">
                                <li>
                                    <Link href="/about" className="text-sm text-slate-600 hover:text-slate-900">
                                        About
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/contact" className="text-sm text-slate-600 hover:text-slate-900">
                                        Contact
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/careers" className="text-sm text-slate-600 hover:text-slate-900">
                                        Careers
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
                            <ul className="mt-4 space-y-2">
                                <li>
                                    <Link href="/privacy" className="text-sm text-slate-600 hover:text-slate-900">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/terms" className="text-sm text-slate-600 hover:text-slate-900">
                                        Terms of Service
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-slate-200 pt-8 text-center">
                        <p className="text-sm text-slate-600">
                            © {new Date().getFullYear()} Ledgera. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
