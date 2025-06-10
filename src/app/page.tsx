'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Calendar, 
  Users, 
  Clock, 
  Star, 
  CheckCircle, 
  Smartphone, 
  Globe, 
  Shield, 
  Zap,
  BarChart3,
  CreditCard,
  HeadphonesIcon,
  ArrowRight,
  PlayCircle
} from 'lucide-react'

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading AppointmentSaaS</h2>
          <p className="text-gray-500">Please wait while we prepare your experience...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 lg:py-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Calendar className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <span className="ml-3 text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                AppointmentSaaS
              </span>
            </div>
            <div className="flex space-x-2 lg:space-x-4">
              <Link href="/register">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm lg:text-base">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline" className="text-sm lg:text-base">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-6 text-sm font-medium px-4 py-2">
              🚀 Now with Multi-Tenant Support
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Streamline Your
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block lg:inline">
                {" "}Appointments
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              The complete multi-tenant appointment booking solution trusted by businesses worldwide. 
              Manage schedules, book appointments, process payments, and grow your business with our powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/register">
                <Button size="lg" className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-2 w-full sm:w-auto">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              ✓ No credit card required  ✓ 14-day free trial  ✓ Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to help you manage appointments efficiently and grow your business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-8 w-8 text-blue-600 mx-auto" />
                </div>
                <CardTitle className="text-xl font-bold">Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Intelligent calendar management with conflict detection, automated reminders, and flexible booking rules.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-green-600 mx-auto" />
                </div>
                <CardTitle className="text-xl font-bold">Multi-Tenant Support</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Manage multiple businesses from one platform with isolated data, custom branding, and separate billing.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-r from-purple-100 to-violet-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="h-8 w-8 text-purple-600 mx-auto" />
                </div>
                <CardTitle className="text-xl font-bold">Payment Processing</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Secure online payments with Stripe integration, invoicing, and automated payment reminders.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-r from-orange-100 to-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Smartphone className="h-8 w-8 text-orange-600 mx-auto" />
                </div>
                <CardTitle className="text-xl font-bold">Mobile Optimized</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Fully responsive design that works perfectly on all devices for both you and your clients.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-r from-teal-100 to-cyan-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-teal-600 mx-auto" />
                </div>
                <CardTitle className="text-xl font-bold">Analytics & Reports</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Comprehensive insights into your business performance with detailed analytics and reporting.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-r from-pink-100 to-rose-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-8 w-8 text-pink-600 mx-auto" />
                </div>
                <CardTitle className="text-xl font-bold">Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Bank-level security with data encryption, secure hosting, and compliance with industry standards.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">
                Why Choose AppointmentSaaS?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join thousands of businesses who have transformed their appointment management with our platform.
              </p>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Save 10+ Hours Per Week</h3>
                    <p className="text-gray-600">Automated scheduling and reminders reduce manual work significantly.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Reduce No-Shows by 80%</h3>
                    <p className="text-gray-600">Smart reminder system and easy rescheduling keep clients engaged.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Increase Revenue by 30%</h3>
                    <p className="text-gray-600">Optimize scheduling, reduce gaps, and capture more appointments.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">24/7 Online Booking</h3>
                    <p className="text-gray-600">Clients can book appointments anytime, even outside business hours.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Dr. Sarah Johnson</h4>
                        <p className="text-sm text-gray-500">Dental Clinic</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">1,247</p>
                      <p className="text-xs text-gray-500">Appointments</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">94%</p>
                      <p className="text-xs text-gray-500">Show Rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">$52k</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Users Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Try the Live Demo
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the full power of our platform with pre-configured demo accounts. 
              No setup required - start exploring immediately.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-full">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-center text-xl font-bold">Admin Access</CardTitle>
                <CardDescription className="text-center text-gray-600">
                  Full system management and analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center relative">
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="mb-2 text-sm"><strong>Email:</strong> admin@demo-clinic.com</p>
                  <p className="mb-0 text-sm"><strong>Password:</strong> demo123</p>
                </div>
                <Link href="/auth/signin">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                    Login as Admin
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-full">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-center text-xl font-bold">Provider Access</CardTitle>
                <CardDescription className="text-center text-gray-600">
                  Manage appointments and services
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center relative">
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="mb-2 text-sm"><strong>Email:</strong> dr.smith@demo-clinic.com</p>
                  <p className="mb-0 text-sm"><strong>Password:</strong> demo123</p>
                </div>
                <Link href="/auth/signin">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                    Login as Provider
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-3 rounded-full">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-center text-xl font-bold">Client Access</CardTitle>
                <CardDescription className="text-center text-gray-600">
                  Book and manage appointments
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center relative">
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="mb-2 text-sm"><strong>Email:</strong> john.doe@example.com</p>
                  <p className="mb-0 text-sm"><strong>Password:</strong> demo123</p>
                </div>
                <Link href="/auth/signin">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700">
                    Login as Client
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Trusted by Businesses Worldwide
            </h2>
            <p className="text-lg lg:text-xl text-gray-600">
              See what our customers have to say about their experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">
                  "AppointmentSaaS has revolutionized how we manage our clinic. The multi-tenant feature allows us to manage multiple locations seamlessly."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    DS
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold">Dr. Sarah Miller</p>
                    <p className="text-sm text-gray-500">Medical Practice Owner</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">
                  "The automated reminders have reduced our no-shows by 75%. The ROI was evident within the first month of implementation."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                    MJ
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold">Mark Johnson</p>
                    <p className="text-sm text-gray-500">Dental Clinic Manager</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">
                  "Easy to use, powerful features, and excellent customer support. Our clients love the online booking system."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold">
                    LW
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold">Lisa Wong</p>
                    <p className="text-sm text-gray-500">Wellness Center Owner</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using AppointmentSaaS to streamline their operations and boost revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="px-8 py-4 text-lg bg-white text-blue-600 hover:bg-gray-100 w-full sm:w-auto">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-2 border-white text-white hover:bg-white hover:text-blue-600 w-full sm:w-auto">
                <HeadphonesIcon className="mr-2 h-5 w-5" />
                Contact Sales
              </Button>
            </Link>
          </div>
          <p className="text-sm text-blue-200 mt-6">
            Questions? Email us at hello@appointmentsaas.com
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold">AppointmentSaaS</span>
              </div>
              <p className="text-gray-400 mb-4">
                The complete appointment booking solution for modern businesses.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 AppointmentSaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}


