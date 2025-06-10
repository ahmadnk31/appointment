'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Calendar, Users, Clock, Star } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">AppointmentSaaS</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
              <div className="flex space-x-4">
                <Link href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Get Started</Button>
                </Link>
              </div>
            </nav>
            <div className="md:hidden flex space-x-4">
              <Link href="/auth/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Streamline Your
            <span className="text-blue-600"> Appointments</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The complete multi-tenant appointment booking solution for businesses of all sizes. 
            Manage schedules, book appointments, and grow your business with ease.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 py-3">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="px-8 py-3">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features to manage your appointments efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Easy Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Intuitive calendar interface for effortless appointment booking and management
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Multi-Tenant</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Perfect for businesses with multiple service providers and locations
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Clock className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Real-time Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Instant notifications and updates for all appointment changes
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Star className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <CardTitle>Email Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automated email confirmations and reminders via AWS SES
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Users Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Try the Demo
            </h2>
            <p className="text-xl text-gray-600">
              Test the system with pre-configured demo accounts
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Admin Access</CardTitle>
                <CardDescription className="text-center">Full system management</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-2"><strong>Email:</strong> admin@demo-clinic.com</p>
                <p className="mb-4"><strong>Password:</strong> demo123</p>
                <Link href="/auth/signin">
                  <Button className="w-full">Login as Admin</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Provider Access</CardTitle>
                <CardDescription className="text-center">Manage appointments & services</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-2"><strong>Email:</strong> dr.smith@demo-clinic.com</p>
                <p className="mb-4"><strong>Password:</strong> demo123</p>
                <Link href="/auth/signin">
                  <Button className="w-full">Login as Provider</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Client Access</CardTitle>
                <CardDescription className="text-center">Book and manage appointments</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-2"><strong>Email:</strong> john.doe@example.com</p>
                <p className="mb-4"><strong>Password:</strong> demo123</p>
                <Link href="/auth/signin">
                  <Button className="w-full">Login as Client</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-blue-400" />
            <span className="ml-2 text-2xl font-bold">AppointmentSaaS</span>
          </div>
          <p className="text-gray-400">
            Built with Next.js, Prisma, and AWS SES
          </p>
        </div>
      </footer>
    </div>
  )
}
