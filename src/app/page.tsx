import { Metadata } from 'next'
import Hero from '@/components/sections/Hero'
import Features from '@/components/sections/Features'
import EmergencyMap from '@/components/map/EmergencyMap'
import AuthGuard from '@/components/auth/AuthGuard'

export const metadata: Metadata = {
  title: 'OpenRelief - Emergency Coordination Platform',
  description: 'Connect victims with resources through our decentralized emergency coordination platform'
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main>
        <Hero />
        <Features />
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <AuthGuard>
              <EmergencyMap />
            </AuthGuard>
          </div>
        </section>
      </main>
    </div>
  )
}