'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import axiosInstance from '@/utils/axios'

interface UseWalletReturn {
    walletAddress: string | null
    isConnected: boolean
    solBalance: number | null
    refreshBalance: () => Promise<void>
}

export function useWallet(): UseWalletReturn {
    const { publicKey, connected } = useSolanaWallet()
    const { connection } = useConnection()
    const [solBalance, setSolBalance] = useState<number | null>(null)

    const walletAddress = publicKey?.toBase58() ?? null

    // Fetch SOL balance
    const refreshBalance = useCallback(async () => {
        if (!publicKey) {
            setSolBalance(null)
            return
        }
        try {
            const balance = await connection.getBalance(publicKey)
            setSolBalance(balance / LAMPORTS_PER_SOL)
        } catch (err) {
            console.warn('Failed to fetch SOL balance:', err)
            setSolBalance(null)
        }
    }, [publicKey, connection])

    // Refresh balance when wallet connects/changes
    useEffect(() => {
        refreshBalance()
    }, [refreshBalance])

    // Keep backend in sync whenever wallet address changes
    const syncedRef = useRef<string | null>(null)
    useEffect(() => {
        if (walletAddress && walletAddress !== syncedRef.current) {
            syncedRef.current = walletAddress
            axiosInstance.patch('/auth/profile', { walletAddress }).catch(() => {
                // Silently ignore — will retry on next page load
            })
        }
    }, [walletAddress])

    return {
        walletAddress,
        isConnected: connected,
        solBalance,
        refreshBalance
    }
}
