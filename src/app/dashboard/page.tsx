'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Users, Clock, Plus, TrendingUp, Settings, Building2, BarChart3, Repeat, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { AnalyticsOverview } from '@/components/dashboard/analytics-overview'
import { NotificationCenter } from '@/components/dashboard/notification-center'
import RecurringAppointments from '@/components/dashboard/recurring-appointments'
import WaitlistManagement from '@/components/dashboard/waitlist-management'

interface DashboardStats {
  totalAppointments: number
  todayAppointments: number
  totalClients: number
  totalServices: number
  growthPercentage: string
  thisMonthAppointments: number
  lastMonthAppointments: number
  recentActivity?: ActivityItem[]
}

interface ActivityItem {
  id: string
  type: string
  title: string
  subtitle: string
  time: string
  status: string
}

interface Tenant {
  id: string
  name: string
  slug: string
}

export default function Dashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    todayAppointments: 0,
    totalClients: 0,
    totalServices: 0,
    growthPercentage: '0.0%',
    thisMonthAppointments: 0,
    lastMonthAppointments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (session) {
      if (session.user.role === 'ADMIN') {
        fetchTenants()
      } else {
        // For non-admin users, use their own tenant
        setSelectedTenantId(session.user.tenantId)
      }
    }
  }, [session])

  useEffect(() => {
    if (selectedTenantId) {
      fetchDashboardStats()
    }
  }, [selectedTenantId])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data)
        // Set the first tenant as default or current user's tenant
        if (data.length > 0) {
          setSelectedTenantId(session?.user.tenantId || data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    }
  }

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      let url = '/api/dashboard/stats'
      
      // For admin users viewing specific tenant
      if (session?.user.role === 'ADMIN' && selectedTenantId && selectedTenantId !== session.user.tenantId) {
        url += `?tenantId=${selectedTenantId}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error('Failed to fetch dashboard stats')
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }
  if (!session) {
    return null
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user.name}!
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Loading your dashboard...
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }  return (
    <div className="p-4 lg:p-6">
      {/* Welcome Section */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Welcome back, {session.user.name}!
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Here's what's happening with your appointments today.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            {/* Tenant Selector for Admin Users */}
            {session.user.role === 'ADMIN' && tenants.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm whitespace-nowrap">Analytics</TabsTrigger>
            <TabsTrigger value="recurring" className="text-xs sm:text-sm whitespace-nowrap">Recurring</TabsTrigger>
            <TabsTrigger value="waitlist" className="text-xs sm:text-sm whitespace-nowrap">Waitlist</TabsTrigger>
            <TabsTrigger value="quick-actions" className="text-xs sm:text-sm whitespace-nowrap">Actions</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm whitespace-nowrap">Activity</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.growthPercentage.startsWith('-') ? '' : '+'}
                  {stats.growthPercentage} from last month
                </p>
              </CardContent>
            </Card>
        
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.todayAppointments === 1 ? 'appointment' : 'appointments'} today
                </p>
              </CardContent>
            </Card>
        
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  {session.user.role === 'CLIENT' ? 'your account' : 'registered clients'}
                </p>
              </CardContent>
            </Card>
        
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Services</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalServices}</div>
                <p className="text-xs text-muted-foreground">services available</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Database:</span>
                  <span className="text-green-600">Connected</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Email Service:</span>
                  <span className="text-green-600">AWS SES Ready</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>User Role:</span>
                  <span className="font-medium">{session.user.role}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tenant:</span>
                  <span className="font-medium">{session.user.tenantName}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>This Month</CardTitle>
                <CardDescription>Monthly performance summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Appointments:</span>
                  <span className="font-medium">{stats.thisMonthAppointments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Month:</span>
                  <span className="font-medium">{stats.lastMonthAppointments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Growth:</span>
                  <span className={`font-medium ${stats.growthPercentage.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.growthPercentage}
                  </span>
                </div>
              </CardContent>
            </Card>            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Navigate to common actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/dashboard/appointments" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                </Link>
                <Link href="/dashboard/book" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Book Appointment
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('recurring')}
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  Recurring Appointments
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('waitlist')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Waitlist Management
                </Button>
                <Link href="/dashboard/settings" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsOverview tenantId={selectedTenantId} />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <RecurringAppointments />
        </TabsContent>

        <TabsContent value="waitlist" className="space-y-6">
          <WaitlistManagement />
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Management</CardTitle>
                <CardDescription>Create and manage appointments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/book">
                  <Button className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Book New Appointment
                  </Button>
                </Link>
                <Link href="/dashboard/appointments">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    View All Appointments
                  </Button>
                </Link>
                <Link href={session.user.role === 'CLIENT' ? '/dashboard/my-appointments' : '/dashboard/appointments'}>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    My Appointments
                  </Button>
                </Link>
              </CardContent>
            </Card>            {(session.user.role === 'PROVIDER' || session.user.role === 'ADMIN') && (
              <Card>
                <CardHeader>
                  <CardTitle>Business Management</CardTitle>
                  <CardDescription>Manage your business settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/dashboard/services">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Services
                    </Button>
                  </Link>
                  <Link href="/dashboard/users">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Button>
                  </Link>
                  <Link href="/dashboard/settings">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      Business Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Advanced Features</CardTitle>
                <CardDescription>Recurring appointments and waitlist</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('recurring')}
                >
                  <Repeat className="mr-2 h-4 w-4" />
                  Recurring Appointments
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('waitlist')}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Waitlist Management
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Templates
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
                <CardDescription>View business insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('analytics')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
                <Link href="/dashboard/clients">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Client Management
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Export Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates on your appointments and business</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.subtitle}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(activity.time).toLocaleDateString()} at {new Date(activity.time).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        activity.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        activity.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        activity.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-sm">
                    No recent activity to show. Start by creating or booking an appointment.
                  </div>
                  <Link href="/dashboard/book">
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Book Your First Appointment
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
