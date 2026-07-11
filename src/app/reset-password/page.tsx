import { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Set New Password - OpenRelief',
  description: 'Set a new password for your OpenRelief account'
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
