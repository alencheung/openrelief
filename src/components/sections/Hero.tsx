'use client'

import { useState } from 'react'
import { Play, Shield, Users, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useMobileDetection } from '@/hooks/useMobileDetection'

export default function Hero() {
  const [isPlaying, setIsPlaying] = useState(false)
  const { isMobile, isTablet, breakpoint } = useMobileDetection()

  const handleWatchVideo = () => {
    setIsPlaying(true)
    // In a real implementation, this would open a video modal
    console.log('Play demo video')
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container-responsive py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 safe-area-inset-top">
        <div className="text-center">
          <h1 className={cn(
            'font-bold tracking-tight text-gray-900',
            isMobile ? 'text-3xl sm:text-4xl'
              : isTablet ? 'text-5xl'
                : 'text-6xl lg:text-7xl'
          )}>
            Emergency Coordination
            <span className="block text-primary">Made Simple</span>
          </h1>
          <p className={cn(
            'leading-8 text-gray-600',
            isMobile ? 'mt-4 text-sm max-w-lg'
              : isTablet ? 'mt-5 text-base max-w-xl'
                : 'mt-6 text-lg max-w-2xl mx-auto'
          )}>
            Open-source platform that connects victims with resources through decentralized emergency coordination.
            Real-time alerts, trust-based verification, and offline-first design.
          </p>
          <div className={cn(
            'flex items-center justify-center',
            isMobile ? 'mt-6 flex-col gap-3 w-full px-4'
              : isTablet ? 'mt-8 gap-x-4'
                : 'mt-10 gap-x-6'
          )}>
            <Button
              onClick={handleWatchVideo}
              variant="default"
              size={isMobile ? 'lg' : 'lg'}
              className={cn(
                'flex items-center gap-2 touch-target',
                isMobile && 'w-full'
              )}
            >
              <Play className="h-5 w-5" />
              {isMobile ? 'Watch Demo' : 'Watch Demo'}
            </Button>
            <Button
              asChild
              variant="outline"
              size={isMobile ? 'lg' : 'lg'}
              className={cn(
                'flex items-center gap-2 touch-target',
                isMobile && 'w-full'
              )}
            >
              <a href="#features">
                {isMobile ? 'Learn More' : 'Learn More'}
              </a>
            </Button>
          </div>
        </div>

        <div className={cn(
          'grid gap-8',
          isMobile ? 'mt-12 grid-cols-1'
            : isTablet ? 'mt-14 grid-cols-2'
              : 'mt-16 grid-cols-2 lg:grid-cols-4'
        )}>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900">
              Trust-Based System
            </h3>
            <p className="mt-2 text-base leading-7 text-gray-600">
              Community-verified emergency reports with weighted trust scoring
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900">
              Real-Time Alerts
            </h3>
            <p className="mt-2 text-base leading-7 text-gray-600">
              Instant notifications for emergencies in your area
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900">
              Community-Powered
            </h3>
            <p className="mt-2 text-base leading-7 text-gray-600">
              Decentralized coordination without single points of failure
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900">
              Offline First
            </h3>
            <p className="mt-2 text-base leading-7 text-gray-600">
              Works even when internet connectivity is lost
            </p>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden">
        <div className="aspect-[1155/678] w-[36.125rem] bg-gradient-to-br from-primary to-primary/20 opacity-20" />
      </div>
    </div>
  )
}