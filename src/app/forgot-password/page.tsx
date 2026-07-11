import { Metadata } from 'next'
import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password - OpenRelief',
  description: 'Reset your OpenRelief account password'
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
