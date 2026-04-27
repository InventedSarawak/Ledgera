'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import axiosInstance from '@/utils/axios'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

const WALLET_STORAGE_KEY = 'ledgera_wallet_address'

interface UseWalletReturn {
    walletAddress: string | null
    hasMetaMask: boolean // kept for backward compatibility naming
    isConnecting: boolean
    connectWallet: () => Promise<string | null>
    disconnectWallet: () => void
}

export function useWallet(): UseWalletReturn {
    const { toast } = useToast()
    const { publicKey, connecting, disconnect, wallets } = useSolanaWallet()
    const { setVisible } = useWalletModal()

    const walletAddress = publicKey ? publicKey.toBase58() : null
    const hasMetaMask = wallets.length > 0

    // Keep backend in sync whenever wallet address changes
    const syncedRef = useRef<string | null>(null)
    useEffect(() => {
        if (walletAddress && walletAddress !== syncedRef.current) {
            syncedRef.current = walletAddress
            localStorage.setItem(WALLET_STORAGE_KEY, walletAddress)
            axiosInstance.patch('/auth/profile', { walletAddress }).catch(() => {
                // Silently ignore — will retry on next page load
            })
        } else if (!walletAddress) {
            localStorage.removeItem(WALLET_STORAGE_KEY)
        }
    }, [walletAddress])

    const connectWallet = useCallback(async (): Promise<string | null> => {
        if (typeof window === 'undefined') {
            return null
        }

        try {
            setVisible(true)
            // The wallet adapter handles the actual connection asynchronously via the modal
            return null
        } catch {
            toast({
                title: 'Wallet Connection Failed',
                description: 'Failed to open wallet connection modal',
                variant: 'destructive'
            })
            return null
        }
    }, [setVisible, toast])

    const disconnectWallet = useCallback(() => {
        disconnect()
    }, [disconnect])

    return {
        walletAddress,
        hasMetaMask,
        isConnecting: connecting,
        connectWallet,
        disconnectWallet
    }
}
