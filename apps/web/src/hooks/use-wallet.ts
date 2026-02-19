'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { CHAIN_ID_HEX, RPC_URL } from '@/lib/constants'
import axiosInstance from '@/utils/axios'

const WALLET_STORAGE_KEY = 'ledgera_wallet_address'

interface UseWalletReturn {
    walletAddress: string | null
    hasMetaMask: boolean
    isConnecting: boolean
    connectWallet: () => Promise<string | null>
    disconnectWallet: () => void
}

export function useWallet(): UseWalletReturn {
    const { toast } = useToast()
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [hasMetaMask, setHasMetaMask] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const connectingRef = useRef(false)

    // SSR-safe MetaMask detection + restore from localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return

        const detected = !!window.ethereum
        setHasMetaMask(detected)

        // Restore wallet from localStorage
        const saved = localStorage.getItem(WALLET_STORAGE_KEY)
        if (saved) {
            setWalletAddress(saved)
        }

        // Also check if MetaMask already has a connected account
        if (detected) {
            const ethereum = window.ethereum as unknown as Record<string, unknown>
            if (ethereum?.selectedAddress) {
                const addr = ethereum.selectedAddress as string
                setWalletAddress(addr)
                localStorage.setItem(WALLET_STORAGE_KEY, addr)
            }
        }

        // Listen for account changes
        if (detected && window.ethereum?.on) {
            const handleAccountsChanged = (...args: unknown[]) => {
                const accounts = args[0] as string[]
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0])
                    localStorage.setItem(WALLET_STORAGE_KEY, accounts[0])
                } else {
                    setWalletAddress(null)
                    localStorage.removeItem(WALLET_STORAGE_KEY)
                }
            }
            window.ethereum.on('accountsChanged', handleAccountsChanged)
            return () => {
                window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged)
            }
        }
    }, [])

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

    // Save wallet address to backend
    const saveWalletToBackend = useCallback(async (address: string) => {
        try {
            await axiosInstance.patch('/auth/profile', { walletAddress: address })
        } catch (err) {
            console.warn('Failed to save wallet address to backend:', err)
        }
    }, [])

    const connectWallet = useCallback(async (): Promise<string | null> => {
        if (typeof window === 'undefined' || !window.ethereum) {
            return null
        }

        // Prevent concurrent MetaMask requests
        if (connectingRef.current) {
            toast({
                title: 'Check MetaMask',
                description: 'A connection request is already pending. Please check your MetaMask extension.',
                variant: 'destructive'
            })
            return null
        }
        connectingRef.current = true
        setIsConnecting(true)

        try {
            // Request accounts (single MetaMask popup)
            const accounts = (await window.ethereum.request({
                method: 'eth_requestAccounts'
            })) as string[]

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found')
            }

            const address = accounts[0]

            // Silently try to switch/add network (no extra popup)
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: CHAIN_ID_HEX }]
                })
            } catch (switchError: unknown) {
                const err = switchError as { code?: number }
                if (err.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                                {
                                    chainId: CHAIN_ID_HEX,
                                    chainName: 'Anvil Local',
                                    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                                    rpcUrls: [RPC_URL],
                                    blockExplorerUrls: null
                                }
                            ]
                        })
                    } catch {
                        // User rejected chain add — not fatal
                    }
                }
            }

            // Persist everywhere
            setWalletAddress(address)
            localStorage.setItem(WALLET_STORAGE_KEY, address)
            await saveWalletToBackend(address)

            toast({
                title: 'Wallet Connected',
                description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`
            })

            return address
        } catch (error: unknown) {
            const err = error as { code?: number | string; message?: string }

            if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
                toast({
                    title: 'Connection Cancelled',
                    description: 'You rejected the wallet connection request',
                    variant: 'destructive'
                })
            } else if (err.code === -32002) {
                toast({
                    title: 'Check MetaMask',
                    description: 'A connection request is already pending. Please check your MetaMask extension.',
                    variant: 'destructive'
                })
            } else {
                toast({
                    title: 'Wallet Connection Failed',
                    description: err.message || 'Failed to connect MetaMask',
                    variant: 'destructive'
                })
            }
            return null
        } finally {
            connectingRef.current = false
            setIsConnecting(false)
        }
    }, [toast, saveWalletToBackend])

    const disconnectWallet = useCallback(() => {
        setWalletAddress(null)
        localStorage.removeItem(WALLET_STORAGE_KEY)
    }, [])

    return {
        walletAddress,
        hasMetaMask,
        isConnecting,
        connectWallet,
        disconnectWallet
    }
}
