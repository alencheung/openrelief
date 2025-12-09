'use client'

import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { WifiIcon, WifiOffIcon } from 'lucide-react'

export function NetworkStatusIndicator() {
  const { isOnline } = useNetworkStatus()
  const [show, setShow] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined

    if (!isOnline) {
      setShow(true)
    } else {
      timer = setTimeout(() => setShow(false), 3000)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [isOnline])

  if (!show) {
    return null
  }

  return (
    <div className={`fixed bottom-4 left-4 z-50 px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 transition-colors ${isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {isOnline ? (
        <>
          <WifiIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Back Online</span>
        </>
      ) : (
        <>
          <WifiOffIcon className="h-4 w-4" />
          <span className="text-sm font-medium">You are offline</span>
        </>
      )}
    </div>
  )
}
