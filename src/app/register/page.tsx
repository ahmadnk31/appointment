'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
]

interface FormData {
  // Organization
  organizationName: string
  subdomain: string
  description: string
  
  // Business Info
  businessName: string
  businessEmail: string
  businessPhone: string
  businessAddress: string
  timeZone: string
  
  // Admin User
  adminName: string
  adminEmail: string
  adminPassword: string
  adminConfirmPassword: string
  
  // Legal
  termsAccepted: boolean
  marketingOptIn: boolean
}

export default function TenantRegistrationPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    subdomain: '',
    description: '',
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    timeZone: 'UTC',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: '',
    termsAccepted: false,
    marketingOptIn: false
  })

  const [subdomainChecked, setSubdomainChecked] = useState(false)
  const [subdomainAvailable, setSubdomainAvailable] = useState(false)

  const generateSubdomain = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .slice(0, 30) // Limit length
  }
  const checkSubdomainAvailability = async (subdomain: string) => {
    console.log('checkSubdomainAvailability called with:', subdomain)
    if (!subdomain || subdomain.length < 3) {
      console.log('Subdomain too short, not checking')
      setSubdomainChecked(false)
      return
    }

    try {
      console.log('Making API call to check availability')
      const response = await fetch('/api/tenants/check-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug: subdomain })
      })

      console.log('API response status:', response.status)
      const data = await response.json()
      console.log('API response data:', data)
      setSubdomainAvailable(data.available)
      setSubdomainChecked(true)
    } catch (error) {
      console.error('Error checking subdomain:', error)
      setSubdomainChecked(false)
    }
  }
  const handleOrganizationNameChange = (name: string) => {
    console.log('Organization name changed:', name)
    const newSubdomain = generateSubdomain(name)
    console.log('Generated subdomain:', newSubdomain)
    setFormData(prev => ({
      ...prev,
      organizationName: name,
      subdomain: newSubdomain,
      businessName: name // Auto-fill business name
    }))
    setSubdomainChecked(false)
    
    // Check availability for auto-generated subdomain
    if (newSubdomain && newSubdomain.length >= 3) {
      console.log('Checking availability for auto-generated subdomain:', newSubdomain)
      setTimeout(() => {
        checkSubdomainAvailability(newSubdomain)
      }, 500)
    }
  }
  const handleSubdomainChange = (subdomain: string) => {
    console.log('Subdomain manually changed:', subdomain)
    const cleanedSubdomain = generateSubdomain(subdomain)
    console.log('Cleaned subdomain:', cleanedSubdomain)
    setFormData(prev => ({ ...prev, subdomain: cleanedSubdomain }))
    setSubdomainChecked(false)
    
    // Debounced availability check
    if (cleanedSubdomain && cleanedSubdomain.length >= 3) {
      console.log('Checking availability for manually entered subdomain:', cleanedSubdomain)
      setTimeout(() => {
        checkSubdomainAvailability(cleanedSubdomain)
      }, 500)
    }
  }

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(
          formData.organizationName &&
          formData.subdomain &&
          subdomainChecked &&
          subdomainAvailable
        )
      case 2:
        return !!(
          formData.businessName &&
          formData.businessEmail &&
          formData.timeZone
        )
      case 3:
        return !!(
          formData.adminName &&
          formData.adminEmail &&
          formData.adminPassword &&
          formData.adminPassword === formData.adminConfirmPassword &&
          formData.adminPassword.length >= 6 &&
          formData.termsAccepted
        )
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(step) && step < 3) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep(3)) {
      setMessage({ type: 'error', text: 'Please fill in all required fields correctly.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/tenants/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.organizationName,
          slug: formData.subdomain,
          description: formData.description,
          businessName: formData.businessName,
          businessEmail: formData.businessEmail,
          businessPhone: formData.businessPhone,
          businessAddress: formData.businessAddress,
          timeZone: formData.timeZone,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          marketingOptIn: formData.marketingOptIn
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ 
          type: 'success', 
          text: 'Registration successful! Please check your email to verify your account.' 
        })
        
        // Redirect to success page or login
        setTimeout(() => {
          router.push(`/registration-success?email=${encodeURIComponent(formData.adminEmail)}`)
        }, 2000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Registration failed' })
      }
    } catch (error) {
      console.error('Registration error:', error)
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Appointment Hub
          </h1>
          <p className="text-gray-600">
            Start managing appointments for your business in minutes
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${i === step ? 'bg-blue-600 text-white' : 
                    i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                `}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i}
                </div>
                {i < 3 && (
                  <div className={`w-12 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Organization Setup'}
              {step === 2 && 'Business Information'}
              {step === 3 && 'Admin Account'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Choose your organization name and subdomain'}
              {step === 2 && 'Tell us about your business'}
              {step === 3 && 'Create your admin account'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}>
              {/* Step 1: Organization Setup */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="organizationName">Organization Name *</Label>
                    <Input
                      id="organizationName"
                      value={formData.organizationName}
                      onChange={(e) => handleOrganizationNameChange(e.target.value)}
                      placeholder="Acme Healthcare"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="subdomain">Choose Your Subdomain *</Label>
                    <div className="flex">
                      <Input
                        id="subdomain"
                        value={formData.subdomain}
                        onChange={(e) => handleSubdomainChange(e.target.value)}
                        placeholder="acme-healthcare"
                        className="rounded-r-none"                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[a-z0-9\-]+"
                      />
                      <div className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-md text-sm text-gray-600">
                        .appointmenthub.com
                      </div>
                    </div>
                    {formData.subdomain && (
                      <div className="mt-2 text-sm">
                        {!subdomainChecked && formData.subdomain.length >= 3 && (
                          <span className="text-gray-500">Checking availability...</span>
                        )}
                        {subdomainChecked && (
                          <span className={subdomainAvailable ? 'text-green-600' : 'text-red-600'}>
                            {subdomainAvailable ? '✓ Available' : '✗ Not available'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of your business..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Business Information */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessEmail">Business Email *</Label>
                      <Input
                        id="businessEmail"
                        type="email"
                        value={formData.businessEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessEmail: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessPhone">Phone Number</Label>
                      <Input
                        id="businessPhone"
                        type="tel"
                        value={formData.businessPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeZone">Time Zone *</Label>
                      <Select value={formData.timeZone} onValueChange={(value) => setFormData(prev => ({ ...prev, timeZone: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <Textarea
                      id="businessAddress"
                      value={formData.businessAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                      placeholder="123 Main St, City, State 12345"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Admin Account */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adminName">Your Name *</Label>
                      <Input
                        id="adminName"
                        value={formData.adminName}
                        onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminEmail">Your Email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adminPassword">Password *</Label>
                      <Input
                        id="adminPassword"
                        type="password"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                    </div>
                    <div>
                      <Label htmlFor="adminConfirmPassword">Confirm Password *</Label>
                      <Input
                        id="adminConfirmPassword"
                        type="password"
                        value={formData.adminConfirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, adminConfirmPassword: e.target.value }))}
                        required
                        minLength={6}
                      />
                      {formData.adminConfirmPassword && formData.adminPassword !== formData.adminConfirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="termsAccepted"
                        checked={formData.termsAccepted}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, termsAccepted: !!checked }))}
                      />
                      <Label htmlFor="termsAccepted" className="text-sm">
                        I agree to the{' '}
                        <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> *
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="marketingOptIn"
                        checked={formData.marketingOptIn}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, marketingOptIn: !!checked }))}
                      />
                      <Label htmlFor="marketingOptIn" className="text-sm">
                        Send me product updates and tips via email
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <div>
                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {step < 3 ? (
                    <Button 
                      type="button" 
                      onClick={handleNext}
                      disabled={!validateStep(step)}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={loading || !validateStep(3)}
                      className="min-w-[120px]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-blue-600 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  )
}
