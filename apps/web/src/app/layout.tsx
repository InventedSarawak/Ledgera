import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import ReactQueryProvider from '../providers/ReactQueryProvider'
import ClerkProviderWrapper from '../providers/ClerkProvider'
import Navbar from '@/components/Navbar'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin']
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin']
})

export const metadata: Metadata = {
    title: 'Ledgera - Carbon Credit Marketplace',
    description: 'Buy, sell, and retire verifiable carbon offsets backed by real-world assets on the blockchain.'
}

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ClerkProviderWrapper>
                    <ReactQueryProvider>
                        <Navbar />
                        {children}
                    </ReactQueryProvider>
                </ClerkProviderWrapper>
            </body>
        </html>
    )
}
