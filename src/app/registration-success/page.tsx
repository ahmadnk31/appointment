'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, ArrowRight } from 'lucide-react'

function RegistrationSuccessContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              Registration Successful!
            </CardTitle>
            <CardDescription>
              Your appointment hub has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <Mail className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-700">
                  We've sent a verification email to:
                </p>
                <p className="font-medium text-gray-900">
                  {email || 'your email address'}
                </p>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p>Please check your email and click the verification link to:</p>
                <ul className="text-left space-y-1">
                  <li>• Activate your account</li>
                  <li>• Access your dashboard</li>
                  <li>• Start managing appointments</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/auth/signin" className="block">
                <Button className="w-full">
                  Continue to Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the email?{' '}
                  <button className="text-blue-600 hover:underline">
                    Resend verification
                  </button>
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">What's Next?</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>1. Verify your email address</p>
                <p>2. Complete your business profile</p>
                <p>3. Set up your services</p>
                <p>4. Configure your booking settings</p>
                <p>5. Share your booking page with clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link href="/help" className="text-blue-600 hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegistrationSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RegistrationSuccessContent />
    </Suspense>
  )
}
