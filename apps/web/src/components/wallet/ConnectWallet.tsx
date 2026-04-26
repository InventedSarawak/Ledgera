'use client'

import { useWallet } from '@/hooks/use-wallet'
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui'

interface ConnectWalletProps {
    onConnect?: (address: string) => void
    currentAddress?: string | null
}

export function ConnectWallet({ onConnect }: ConnectWalletProps) {
    const { walletAddress, isConnected, solBalance } = useWallet()

    // Notify parent when wallet connects
    if (isConnected && walletAddress && onConnect) {
        onConnect(walletAddress)
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
                <WalletMultiButton />
                {isConnected && <WalletDisconnectButton />}
            </div>

            {isConnected && walletAddress && (
                <div className="rounded-md bg-muted px-4 py-2 text-sm text-center space-y-1">
                    <p className="font-mono text-xs">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                    {solBalance !== null && (
                        <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">{solBalance.toFixed(4)}</span> SOL
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
