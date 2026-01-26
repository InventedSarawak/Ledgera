import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Globe, Target, Award } from 'lucide-react'

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-32 bg-slate-50">
                <div className="mx-auto max-w-7xl text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                        About <span className="text-green-600">Ledgera</span>
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
                        We are bridging the gap between real-world environmental assets and the digital economy. Our
                        mission is to make carbon offsetting transparent, accessible, and impactful.
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Our Mission
                            </h2>
                            <p className="mt-4 text-lg text-slate-600">
                                Climate change is the defining challenge of our time. At Ledgera, we believe that
                                transparent markets are essential for effective climate action. By tokenizing real-world
                                carbon credits, we ensure that every offset is unique, traceable, and drives real
                                impact.
                            </p>
                            <div className="mt-8">
                                <Link href="/marketplace">
                                    <Button size="lg" className="bg-green-600 hover:bg-green-700">
                                        Join Our Mission
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Card className="bg-green-50 border-green-100">
                                <CardHeader>
                                    <Target className="h-8 w-8 text-green-600 mb-2" />
                                    <CardTitle>Transparency</CardTitle>
                                    <CardDescription>Immutable records for all carbon assets.</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="bg-blue-50 border-blue-100">
                                <CardHeader>
                                    <Globe className="h-8 w-8 text-blue-600 mb-2" />
                                    <CardTitle>Global Access</CardTitle>
                                    <CardDescription>Connecting projects and buyers worldwide.</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="bg-purple-50 border-purple-100">
                                <CardHeader>
                                    <Users className="h-8 w-8 text-purple-600 mb-2" />
                                    <CardTitle>Community</CardTitle>
                                    <CardDescription>Empowering local communities.</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="bg-orange-50 border-orange-100">
                                <CardHeader>
                                    <Award className="h-8 w-8 text-orange-600 mb-2" />
                                    <CardTitle>Quality</CardTitle>
                                    <CardDescription>Only verified, high-quality credits.</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
