'use client'

import {
  Flame,
  Heart,
  Shield,
  Smartphone,
  Map,
  Users,
  Bell,
  Globe,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const features = [
  {
    name: 'Emergency Reporting',
    description: 'Quickly report emergencies with location, photos, and severity levels.',
    icon: Flame,
    color: 'text-red-500',
  },
  {
    name: 'Trust-Based Verification',
    description: 'Community-verified reports with weighted trust scoring system.',
    icon: Shield,
    color: 'text-green-500',
  },
  {
    name: 'Real-Time Alerts',
    description: 'Instant notifications for emergencies in your area.',
    icon: Bell,
    color: 'text-blue-500',
  },
  {
    name: 'Offline First',
    description: 'Full functionality even without internet connectivity.',
    icon: Smartphone,
    color: 'text-purple-500',
  },
  {
    name: 'Interactive Maps',
    description: 'Live map view with spatial filtering and routing.',
    icon: Map,
    color: 'text-orange-500',
  },
  {
    name: 'Privacy Protected',
    description: 'Your data is encrypted and privacy-respecting.',
    icon: Lock,
    color: 'text-gray-500',
  },
]

export default function Features() {
  return (
    <div id="features" className="py-24 sm:py-32">
      <div className="container-responsive">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything You Need for Emergency Response
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Built with modern technology and designed for reliability in critical situations
          </p>
        </div>

        <div className="mx-auto mt-20 max-w-2xl sm:mt-24 lg:mt-32">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${feature.color} bg-opacity-10`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-20">
          <div className="rounded-2xl bg-gray-900 py-24 px-6 sm:py-32 sm:px-16 lg:px-24">
            <div className="relative mx-auto max-w-2xl">
              <div className="text-center">
                <h3 className="text-3xl font-bold leading-8 text-white">
                  Ready to Make a Difference?
                </h3>
                <p className="mx-auto mt-5 max-w-xl text-lg leading-7 text-gray-300">
                  Join thousands of volunteers and emergency responders using OpenRelief to coordinate
                  disaster response efforts worldwide.
                </p>
              </div>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button
                  asChild
                  variant="default"
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100"
                >
                  <a href="/signup">
                    Get Started
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-gray-900"
                >
                  <a href="/demo">
                    View Demo
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-32">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Trusted by Emergency Response Teams
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              Used by communities, NGOs, and emergency services worldwide
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-8 text-center lg:grid-cols-4">
            <div className="flex flex-col items-center">
              <Users className="h-12 w-12 text-gray-600" />
              <div className="mt-4 text-3xl font-bold leading-9 text-gray-900">
                50K+
              </div>
              <div className="mt-2 text-base leading-7 text-gray-600">
                Active Users
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Globe className="h-12 w-12 text-gray-600" />
              <div className="mt-4 text-3xl font-bold leading-9 text-gray-900">
                120+
              </div>
              <div className="mt-2 text-base leading-7 text-gray-600">
                Countries
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Heart className="h-12 w-12 text-gray-600" />
              <div className="mt-4 text-3xl font-bold leading-9 text-gray-900">
                10K+
              </div>
              <div className="mt-2 text-base leading-7 text-gray-600">
                Lives Impacted
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Shield className="h-12 w-12 text-gray-600" />
              <div className="mt-4 text-3xl font-bold leading-9 text-gray-900">
                99.9%
              </div>
              <div className="mt-2 text-base leading-7 text-gray-600">
                Uptime
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}