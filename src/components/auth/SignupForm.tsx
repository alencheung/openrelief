'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@/store/authStore'

export default function SignupForm() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { signUp } = useAuthActions()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('🔍 DEBUG: Signup form submitted', { email, passwordLength: password.length })

        if (!email || !password) {
            console.log('❌ DEBUG: Missing email or password')
            setError('Email and password are required')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            console.log('🔍 DEBUG: Calling signUp function')
            await signUp(email, password)
            console.log('✅ DEBUG: Signup successful')

            // Redirect to dashboard or home page after successful signup
            console.log('🔍 DEBUG: Redirecting after successful signup')
            router.push('/')
        } catch (err) {
            console.error('❌ DEBUG: Signup failed', err)
            setError(err instanceof Error ? err.message : 'Signup failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="rounded-md shadow-sm -space-y-px">
                <div>
                    <label htmlFor="email-address" className="sr-only">
                        Email address
                    </label>
                    <input
                        id="email-address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Email address"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="sr-only">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Password"
                    />
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Signing up...' : 'Sign up'}
                </button>
            </div>
        </form>
    )
}