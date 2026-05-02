'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import { useWallet as useAppWallet } from '@/hooks/use-wallet'

interface ConnectWalletProps {
    onConnect: (address: string) => void
    currentAddress?: string | null
}

export function ConnectWallet({ onConnect, currentAddress }: ConnectWalletProps) {
    const { walletAddress, isConnecting, connectWallet, disconnectWallet } = useAppWallet()

    // Whenever walletAddress from hooks updates (because the user connected via Solana popup),
    // we trigger onConnect.
    useEffect(() => {
        if (walletAddress && walletAddress !== currentAddress) {
            onConnect(walletAddress)
        } else if (!walletAddress && currentAddress) {
            onConnect('')
        }
    }, [walletAddress, currentAddress, onConnect])

    const displayAddress = walletAddress || currentAddress

    if (displayAddress) {
        return (
            <div className="flex items-center gap-2">
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
                </div>
                <Button variant="outline" size="sm" onClick={() => disconnectWallet()}>
                    Disconnect
                </Button>
            </div>
        )
    }

    return (
        <Button onClick={() => connectWallet()} disabled={isConnecting} className="gap-2">
            <Wallet className="h-4 w-4" />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
    )
}
