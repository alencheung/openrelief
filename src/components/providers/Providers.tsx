'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/toaster'
import { PWAManager } from '@/components/pwa/PWAManager'
import { NoSSRProvider } from '@/components/providers/NoSSRProvider'

interface ProvidersProps {
    children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
    // Create QueryClient inside the component to ensure it's created on the client side only
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        retry: 3,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            <PWAManager>
                <NoSSRProvider>
                    {children}
                    <Toaster />
                    {process.env.NODE_ENV === 'development' && (
                        <ReactQueryDevtools initialIsOpen={false} />
                    )}
                </NoSSRProvider>
            </PWAManager>
        </QueryClientProvider>
    )
}