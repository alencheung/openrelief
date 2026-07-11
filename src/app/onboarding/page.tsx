import { Metadata } from 'next'
import OnboardingFlow from './OnboardingFlow'

export const metadata: Metadata = {
  title: 'Complete Your Profile - OpenRelief',
  description: 'Set up your OpenRelief profile to start reporting emergencies'
}

export default function OnboardingPage() {
  return <OnboardingFlow />
}
