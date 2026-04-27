'use client'

import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { RPC_URL } from '@/lib/constants'

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css'

export default function SolanaProvider({ children }: { children: React.ReactNode }) {
    const endpoint = useMemo(() => RPC_URL, [])

    const wallets = useMemo(
        () => [new PhantomWalletAdapter()],
        [] // You can add other wallets here
    )

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}
