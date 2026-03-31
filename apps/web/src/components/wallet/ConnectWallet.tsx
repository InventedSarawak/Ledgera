'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EthereumProvider {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    on?: (event: string, callback: (...args: unknown[]) => void) => void
    removeListener?: (event: string, callback: (...args: unknown[]) => void) => void
}

declare global {
    interface Window {
        ethereum?: EthereumProvider
    }
}

interface ConnectWalletProps {
    onConnect: (address: string) => void
    currentAddress?: string | null
}

export function ConnectWallet({ onConnect, currentAddress }: ConnectWalletProps) {
    const [isConnecting, setIsConnecting] = useState(false)
    const [address, setAddress] = useState<string | null>(currentAddress || null)
    const { toast } = useToast()

    useEffect(() => {
        if (currentAddress) {
            setAddress(currentAddress)
        }
    }, [currentAddress])

    const addAnvilNetwork = async () => {
        if (!window.ethereum) return

        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                    {
                        chainId: '0x7A69', // 31337 in hex
                        chainName: 'Anvil Local',
                        nativeCurrency: {
                            name: 'Ethereum',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['http://127.0.0.1:8545'],
                        blockExplorerUrls: null
                    }
                ]
            })
        } catch (error) {
            console.error('Failed to add Anvil network:', error)
            toast({
                title: 'Network Error',
                description: error instanceof Error ? error.message : 'Failed to add Anvil network',
                variant: 'destructive'
            })
        }
    }

    const connectWallet = async () => {
        if (!window.ethereum) {
            toast({
                title: 'MetaMask Not Found',
                description: 'Please install MetaMask to connect your wallet',
                variant: 'destructive'
            })
            return
        }

        setIsConnecting(true)

        try {
            // First, try to add/switch to Anvil network
            await addAnvilNetwork()

            // Request account access
            const accounts = (await window.ethereum.request({
                method: 'eth_requestAccounts'
            })) as string[]

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found')
            }

            const walletAddress = accounts[0]
            setAddress(walletAddress)
            onConnect(walletAddress)

            toast({
                title: 'Wallet Connected',
                description: `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            })
        } catch (error) {
            console.error('Failed to connect wallet:', error)
            toast({
                title: 'Connection Failed',
                description: error instanceof Error ? error.message : 'Failed to connect wallet',
                variant: 'destructive'
            })
        } finally {
            setIsConnecting(false)
        }
    }

    const disconnectWallet = () => {
        setAddress(null)
        onConnect('')
        toast({
            title: 'Wallet Disconnected',
            description: 'Your wallet has been disconnected'
        })
    }

    if (address) {
        return (
            <div className="flex items-center gap-2">
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <Button variant="outline" size="sm" onClick={disconnectWallet}>
                    Disconnect
                </Button>
            </div>
        )
    }

    return (
        <Button onClick={connectWallet} disabled={isConnecting} className="gap-2">
            <Wallet className="h-4 w-4" />
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </Button>
    )
}
