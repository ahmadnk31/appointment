'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Mail, Clock, Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TenantSettings {
  businessName: string
  businessEmail: string
  businessPhone?: string
  businessAddress?: string
  timeZone: string
  workingHours: {
    [key: string]: {
      start: string
      end: string
      enabled: boolean
    }
  }
  bookingSettings: {
    enableOnlineBooking: boolean
    requireConfirmation: boolean
    allowCancellation: boolean
    cancellationDeadline: number
    bufferTime: number
    maxAdvanceBooking: number
  }
  emailSettings: {
    sendConfirmation: boolean
    sendReminder: boolean
    reminderTime: number
    fromName: string
    fromEmail: string
  }
  paymentSettings?: {
    enablePayments: boolean
    acceptCash: boolean
    acceptOnline: boolean
    currency: string
    requirePaymentUpfront: boolean
    stripeSettings: {
      publicKey: string
      secretKey: string
      webhookSecret: string
    }
  }
  cancellationSettings?: {
    allowCancellation: boolean
    cancellationDeadlineHours: number
    refundPolicy: 'full' | 'partial' | 'none'
    partialRefundPercentage: number
    requireReason: boolean
    notifyProvider: boolean
    notifyClient: boolean
  }
}

interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  settings?: TenantSettings
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

export default function TenantSettingsPage() {
  const { data: session } = useSession()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (session?.user?.tenantId) {
      fetchTenantSettings()
    }
  }, [session])

  const fetchTenantSettings = async () => {
    try {
      const response = await fetch(`/api/tenants/${session?.user?.tenantId}`)
      if (response.ok) {
        const data = await response.json()
        setTenant(data)
        setSettings(data.settings || getDefaultSettings())
      }
    } catch (error) {
      console.error('Error fetching tenant settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const getDefaultSettings = (): TenantSettings => ({
    businessName: tenant?.name || '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    timeZone: 'UTC',
    workingHours: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '13:00', enabled: false },
      sunday: { start: '09:00', end: '17:00', enabled: false }
    },
    bookingSettings: {
      enableOnlineBooking: true,
      requireConfirmation: true,
      allowCancellation: true,
      cancellationDeadline: 24,
      bufferTime: 15,
      maxAdvanceBooking: 30
    },
    emailSettings: {
      sendConfirmation: true,
      sendReminder: true,
      reminderTime: 24,
      fromName: tenant?.name || '',
      fromEmail: ''
    }
  })

  const handleSave = async () => {
    if (!tenant || !settings) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tenant.name,
          domain: tenant.domain,
          settings
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        await fetchTenantSettings() // Refresh data
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const updateWorkingHours = (day: string, field: string, value: string | boolean) => {
    if (!settings) return
    
    setSettings({
      ...settings,
      workingHours: {
        ...settings.workingHours,
        [day]: {
          ...settings.workingHours[day],
          [field]: value
        }
      }
    })
  }

  const updateBookingSettings = (field: string, value: any) => {
    if (!settings) return
    
    setSettings({
      ...settings,
      bookingSettings: {
        ...settings.bookingSettings,
        [field]: value
      }
    })
  }
  const updateEmailSettings = (field: string, value: any) => {
    if (!settings) return
    
    setSettings({
      ...settings,
      emailSettings: {
        ...settings.emailSettings,
        [field]: value
      }
    })
  }
  const updatePaymentSettings = (field: string, value: any) => {
    if (!settings) return
    
    const defaultPaymentSettings = {
      enablePayments: false,
      acceptCash: true,
      acceptOnline: false,
      currency: 'USD',
      requirePaymentUpfront: false,
      stripeSettings: {
        publicKey: '',
        secretKey: '',
        webhookSecret: ''
      }
    }
    
    setSettings({
      ...settings,
      paymentSettings: {
        ...defaultPaymentSettings,
        ...settings.paymentSettings,
        [field]: value
      }
    })
  }

  const updateStripeSettings = (field: string, value: any) => {
    if (!settings) return
    
    const defaultPaymentSettings = {
      enablePayments: false,
      acceptCash: true,
      acceptOnline: false,
      currency: 'USD',
      requirePaymentUpfront: false,
      stripeSettings: {
        publicKey: '',
        secretKey: '',
        webhookSecret: ''
      }
    }
    
    const defaultStripeSettings = {
      publicKey: '',
      secretKey: '',
      webhookSecret: ''
    }
    
    setSettings({
      ...settings,
      paymentSettings: {
        ...defaultPaymentSettings,
        ...settings.paymentSettings,
        stripeSettings: {
          ...defaultStripeSettings,
          ...settings.paymentSettings?.stripeSettings,
          [field]: value
        }
      }
    })
  }

  const updateCancellationSettings = (field: string, value: any) => {
    if (!settings) return
    
    const defaultCancellationSettings = {
      allowCancellation: true,
      cancellationDeadlineHours: 24,
      refundPolicy: 'full' as const,
      partialRefundPercentage: 50,
      requireReason: true,
      notifyProvider: true,
      notifyClient: true
    }
    
    setSettings({
      ...settings,
      cancellationSettings: {
        ...defaultCancellationSettings,
        ...settings.cancellationSettings,
        [field]: value
      }
    })
  }

  if (!session?.user) {
    return <div>Unauthorized</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Settings Not Found</h3>
            <p className="text-gray-600">Unable to load tenant settings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tenant Settings</h1>
          <p className="text-gray-600">Configure your organization settings and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="business">Business Info</TabsTrigger>
          <TabsTrigger value="hours">Working Hours</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Update your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={settings.businessEmail}
                    onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="businessPhone">Phone Number</Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    value={settings.businessPhone || ''}
                    onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <Select value={settings.timeZone} onValueChange={(value) => setSettings({ ...settings, timeZone: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Textarea
                  id="businessAddress"
                  value={settings.businessAddress || ''}
                  onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Working Hours
              </CardTitle>
              <CardDescription>
                Set your business operating hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.key} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-24">
                    <Label className="font-medium">{day.label}</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.workingHours[day.key]?.enabled || false}
                      onCheckedChange={(checked) => updateWorkingHours(day.key, 'enabled', checked)}
                    />
                    <span className="text-sm text-gray-600">Open</span>
                  </div>

                  {settings.workingHours[day.key]?.enabled && (
                    <>
                      <div className="grid gap-2">
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={settings.workingHours[day.key]?.start || '09:00'}
                          onChange={(e) => updateWorkingHours(day.key, 'start', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={settings.workingHours[day.key]?.end || '17:00'}
                          onChange={(e) => updateWorkingHours(day.key, 'end', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Booking Settings
              </CardTitle>
              <CardDescription>
                Configure how clients can book and manage appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable Online Booking</Label>
                    <p className="text-sm text-gray-600">Allow clients to book appointments online</p>
                  </div>
                  <Switch
                    checked={settings.bookingSettings.enableOnlineBooking}
                    onCheckedChange={(checked) => updateBookingSettings('enableOnlineBooking', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Require Confirmation</Label>
                    <p className="text-sm text-gray-600">Appointments need manual confirmation</p>
                  </div>
                  <Switch
                    checked={settings.bookingSettings.requireConfirmation}
                    onCheckedChange={(checked) => updateBookingSettings('requireConfirmation', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Allow Cancellation</Label>
                    <p className="text-sm text-gray-600">Clients can cancel their appointments</p>
                  </div>
                  <Switch
                    checked={settings.bookingSettings.allowCancellation}
                    onCheckedChange={(checked) => updateBookingSettings('allowCancellation', checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cancellationDeadline">Cancellation Deadline (hours)</Label>
                  <Input
                    id="cancellationDeadline"
                    type="number"
                    min="0"
                    value={settings.bookingSettings.cancellationDeadline}
                    onChange={(e) => updateBookingSettings('cancellationDeadline', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="bufferTime">Buffer Time (minutes)</Label>
                  <Input
                    id="bufferTime"
                    type="number"
                    min="0"
                    value={settings.bookingSettings.bufferTime}
                    onChange={(e) => updateBookingSettings('bufferTime', parseInt(e.target.value))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxAdvanceBooking">Max Advance Booking (days)</Label>
                  <Input
                    id="maxAdvanceBooking"
                    type="number"
                    min="1"
                    value={settings.bookingSettings.maxAdvanceBooking}
                    onChange={(e) => updateBookingSettings('maxAdvanceBooking', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Configure email notifications and sender information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Send Confirmation Emails</Label>
                    <p className="text-sm text-gray-600">Email clients when appointments are booked</p>
                  </div>
                  <Switch
                    checked={settings.emailSettings.sendConfirmation}
                    onCheckedChange={(checked) => updateEmailSettings('sendConfirmation', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Send Reminder Emails</Label>
                    <p className="text-sm text-gray-600">Email clients before their appointments</p>
                  </div>
                  <Switch
                    checked={settings.emailSettings.sendReminder}
                    onCheckedChange={(checked) => updateEmailSettings('sendReminder', checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={settings.emailSettings.fromName}
                    onChange={(e) => updateEmailSettings('fromName', e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={settings.emailSettings.fromEmail}
                    onChange={(e) => updateEmailSettings('fromEmail', e.target.value)}
                  />
                </div>
              </div>              <div className="grid gap-2">
                <Label htmlFor="reminderTime">Reminder Time (hours before appointment)</Label>
                <Input
                  id="reminderTime"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.emailSettings.reminderTime}
                  onChange={(e) => updateEmailSettings('reminderTime', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure payment methods and Stripe integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable Payments</Label>
                    <p className="text-sm text-gray-600">Allow clients to pay for appointments</p>
                  </div>
                  <Switch
                    checked={settings.paymentSettings?.enablePayments || false}
                    onCheckedChange={(checked) => updatePaymentSettings('enablePayments', checked)}
                  />
                </div>

                {settings.paymentSettings?.enablePayments && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Accept Cash Payments</Label>
                        <p className="text-sm text-gray-600">Allow in-person cash payments</p>
                      </div>
                      <Switch
                        checked={settings.paymentSettings?.acceptCash || false}
                        onCheckedChange={(checked) => updatePaymentSettings('acceptCash', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Accept Online Payments</Label>
                        <p className="text-sm text-gray-600">Allow online payments via Stripe</p>
                      </div>
                      <Switch
                        checked={settings.paymentSettings?.acceptOnline || false}
                        onCheckedChange={(checked) => updatePaymentSettings('acceptOnline', checked)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={settings.paymentSettings?.currency || 'USD'} 
                        onValueChange={(value) => updatePaymentSettings('currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {settings.paymentSettings?.acceptOnline && (
                      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-medium">Stripe Settings</h4>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="stripePublicKey">Publishable Key</Label>
                            <Input
                              id="stripePublicKey"
                              type="password"
                              placeholder="pk_test_..."
                              value={settings.paymentSettings?.stripeSettings?.publicKey || ''}
                              onChange={(e) => updateStripeSettings('publicKey', e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="stripeSecretKey">Secret Key</Label>
                            <Input
                              id="stripeSecretKey"
                              type="password"
                              placeholder="sk_test_..."
                              value={settings.paymentSettings?.stripeSettings?.secretKey || ''}
                              onChange={(e) => updateStripeSettings('secretKey', e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="webhookSecret">Webhook Secret</Label>
                            <Input
                              id="webhookSecret"
                              type="password"
                              placeholder="whsec_..."
                              value={settings.paymentSettings?.stripeSettings?.webhookSecret || ''}
                              onChange={(e) => updateStripeSettings('webhookSecret', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancellation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Cancellation Settings
              </CardTitle>
              <CardDescription>
                Configure appointment cancellation policies and refunds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Allow Cancellations</Label>
                    <p className="text-sm text-gray-600">Allow clients to cancel appointments</p>
                  </div>
                  <Switch
                    checked={settings.cancellationSettings?.allowCancellation || false}
                    onCheckedChange={(checked) => updateCancellationSettings('allowCancellation', checked)}
                  />
                </div>

                {settings.cancellationSettings?.allowCancellation && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="cancellationDeadline">Cancellation Deadline (hours)</Label>
                      <Input
                        id="cancellationDeadline"
                        type="number"
                        min="1"
                        max="168"
                        value={settings.cancellationSettings?.cancellationDeadlineHours || 24}
                        onChange={(e) => updateCancellationSettings('cancellationDeadlineHours', parseInt(e.target.value))}
                      />
                      <p className="text-sm text-gray-600">
                        Minimum hours before appointment to allow cancellation
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="refundPolicy">Refund Policy</Label>
                      <Select 
                        value={settings.cancellationSettings?.refundPolicy || 'full'} 
                        onValueChange={(value) => updateCancellationSettings('refundPolicy', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Refund</SelectItem>
                          <SelectItem value="partial">Partial Refund</SelectItem>
                          <SelectItem value="none">No Refund</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {settings.cancellationSettings?.refundPolicy === 'partial' && (
                      <div className="grid gap-2">
                        <Label htmlFor="partialRefundPercentage">Partial Refund Percentage</Label>
                        <Input
                          id="partialRefundPercentage"
                          type="number"
                          min="0"
                          max="100"
                          value={settings.cancellationSettings?.partialRefundPercentage || 50}
                          onChange={(e) => updateCancellationSettings('partialRefundPercentage', parseInt(e.target.value))}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Require Cancellation Reason</Label>
                        <p className="text-sm text-gray-600">Ask clients to provide a reason for cancellation</p>
                      </div>
                      <Switch
                        checked={settings.cancellationSettings?.requireReason || false}
                        onCheckedChange={(checked) => updateCancellationSettings('requireReason', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Notify Provider</Label>
                        <p className="text-sm text-gray-600">Send email notification to provider when cancelled</p>
                      </div>
                      <Switch
                        checked={settings.cancellationSettings?.notifyProvider || false}
                        onCheckedChange={(checked) => updateCancellationSettings('notifyProvider', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Notify Client</Label>
                        <p className="text-sm text-gray-600">Send confirmation email to client when cancelled</p>
                      </div>
                      <Switch
                        checked={settings.cancellationSettings?.notifyClient || false}
                        onCheckedChange={(checked) => updateCancellationSettings('notifyClient', checked)}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
