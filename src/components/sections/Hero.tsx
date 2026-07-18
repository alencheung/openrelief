'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Shield, Users, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { cn } from '@/lib/utils'

export default function Hero() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isMobile, isTablet, breakpoint } = useMobileDetection()
  const modalCloseRef = useRef<HTMLButtonElement>(null)

  // Opens an accessible demo modal. There is no hosted video asset yet, so the
  // modal shows an explainer and a CTA to launch the live map demo.
  const handleWatchVideo = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => setIsModalOpen(false)

  // Trap focus + close on Escape while the modal is open.
  useEffect(() => {
    if (!isModalOpen) return
    const previousActive = document.activeElement as HTMLElement | null
    modalCloseRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousActive?.focus()
    }
  }, [isModalOpen])

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container-responsive py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 safe-area-inset-top">
        <div className="text-center">
          <h1
            className={cn(
              'font-bold tracking-tight text-gray-900',
              isMobile ? 'text-3xl sm:text-4xl' : isTablet ? 'text-5xl' : 'text-6xl lg:text-7xl'
            )}
          >
            Emergency Coordination
            <span className="block text-primary">Made Simple</span>
          </h1>
          <p
            className={cn(
              'leading-8 text-gray-600',
              isMobile
                ? 'mt-4 text-sm max-w-lg'
                : isTablet
                  ? 'mt-5 text-base max-w-xl'
                  : 'mt-6 text-lg max-w-2xl mx-auto'
            )}
          >
            Open-source platform that connects victims with resources through decentralized
            emergency coordination. Real-time alerts, trust-based verification, and offline-first
            design.
          </p>
          <div
            className={cn(
              'flex items-center justify-center',
              isMobile
                ? 'mt-6 flex-col gap-3 w-full px-4'
                : isTablet
                  ? 'mt-8 gap-x-4'
                  : 'mt-10 gap-x-6'
            )}
          >
            <Button
              onClick={handleWatchVideo}
              variant="default"
              size={isMobile ? 'lg' : 'lg'}
              className={cn('flex items-center gap-2 touch-target', isMobile && 'w-full')}
            >
              <Play className="h-5 w-5" />
              {isMobile ? 'Watch Demo' : 'Watch Demo'}
            </Button>
            <Button
              asChild
              variant="outline"
              size={isMobile ? 'lg' : 'lg'}
              className={cn('flex items-center gap-2 touch-target', isMobile && 'w-full')}
            >
              <a href="#features">Learn More</a>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            'grid gap-8',
            isMobile
              ? 'mt-12 grid-cols-1'
              : isTablet
                ? 'mt-14 grid-cols-2'
                : 'mt-16 grid-cols-2 lg:grid-cols-4'
          )}
        >
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
            <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900">Real-Time Alerts</h3>
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
            <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900">Offline First</h3>
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

      {/* Demo modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              ref={modalCloseRef}
              type="button"
              onClick={closeModal}
              aria-label="Close demo dialog"
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Play className="h-7 w-7 text-primary" />
            </div>
            <h2 id="demo-modal-title" className="text-center text-xl font-bold text-gray-900">
              See OpenRelief in action
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              A hosted walkthrough video isn&apos;t available yet. The fastest way to see
              OpenRelief is to launch the live map demo below — sign in, then explore real-time
              emergency coordination, trust-based verification, and offline reporting.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild variant="default" size="lg" className="touch-target">
                <a href="/login">Launch the live demo</a>
              </Button>
              <Button onClick={closeModal} variant="outline" size="lg">
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
