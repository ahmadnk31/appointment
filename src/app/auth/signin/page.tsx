'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { Calendar, Eye, EyeOff } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Get the session to check user info
        const session = await getSession()
        if (session) {
          router.push(callbackUrl)
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center mb-6">
            <Calendar className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-2xl font-bold text-gray-900">AppointmentSaaS</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Or use one of the demo accounts below
          </p>
        </div>

        {/* Demo accounts info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800">Demo Accounts</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-blue-700 space-y-1">
            <div><strong>Admin:</strong> admin@demo-clinic.com / demo123</div>
            <div><strong>Provider:</strong> dr.smith@demo-clinic.com / demo123</div>
            <div><strong>Client:</strong> john.doe@example.com / demo123</div>
          </CardContent>
        </Card>

        {/* Sign in form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* Quick demo login buttons */}
            <div className="mt-6 space-y-2">
              <div className="text-sm text-center text-gray-600 mb-3">Quick Demo Login:</div>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail('admin@demo-clinic.com')
                    setPassword('demo123')
                  }}
                  disabled={isLoading}
                >
                  Login as Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail('dr.smith@demo-clinic.com')
                    setPassword('demo123')
                  }}
                  disabled={isLoading}
                >
                  Login as Provider
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail('john.doe@example.com')
                    setPassword('demo123')
                  }}
                  disabled={isLoading}
                >
                  Login as Client
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-500">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
