'use client'

import { useEffect, useState } from 'react'

interface NoSSRProviderProps {
    children: React.ReactNode
}

/**
 * Prevents hydration mismatches caused by browser extensions
 * by delaying rendering until after client-side hydration
 */
export function NoSSRProvider({ children }: NoSSRProviderProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        // Return a placeholder that matches the server-rendered HTML
        return <div style={{ visibility: 'hidden' }}>{children}</div>
    }

    return <>{children}</>
}