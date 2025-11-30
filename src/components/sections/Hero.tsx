'use client'

import { useState } from 'react'
import { Play, Shield, Users, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function Hero() {
  const [isPlaying, setIsPlaying] = useState(false)

  const handleWatchVideo = () => {
    setIsPlaying(true)
    // In a real implementation, this would open a video modal
    console.log('Play demo video')
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container-responsive py-20 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Emergency Coordination
            <span className="block text-primary">Made Simple</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Open-source platform that connects victims with resources through decentralized emergency coordination.
            Real-time alerts, trust-based verification, and offline-first design.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              onClick={handleWatchVideo}
              variant="default"
              size="lg"
              className="flex items-center gap-2"
            >
              <Play className="h-5 w-5" />
              Watch Demo
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <a href="#features">
                Learn More
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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