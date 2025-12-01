import { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
    title: 'Sign Up - OpenRelief',
    description: 'Create your OpenRelief account to join the emergency coordination network',
}

export default function SignUpPage() {
    console.log('🔍 DEBUG: Signup page rendered')

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Join the OpenRelief emergency coordination network
                    </p>
                </div>
                <SignupForm />
            </div>
        </div>
    )
}