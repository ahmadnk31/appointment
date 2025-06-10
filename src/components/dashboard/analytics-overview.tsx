'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Users, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  Star,
  BarChart3
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface AnalyticsData {
  overview: {
    totalAppointments: number
    totalRevenue: number
    totalClients: number
    averageRating: number
    appointmentGrowth: number
    revenueGrowth: number
    clientGrowth: number
    completionRate: number
  }
  monthlyStats: {
    month: string
    appointments: number
    revenue: number
    newClients: number
  }[]
  serviceStats: {
    serviceName: string
    bookings: number
    revenue: number
    avgRating: number
  }[]
  timeSlotStats: {
    hour: number
    bookings: number
  }[]
  topClients: {
    name: string
    email: string
    totalAppointments: number
    totalSpent: number
  }[]
}

interface AnalyticsOverviewProps {
  tenantId?: string
}

export function AnalyticsOverview({ tenantId }: AnalyticsOverviewProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month') // week, month, quarter, year
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, tenantId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let url = `/api/dashboard/analytics?timeRange=${timeRange}`
      if (tenantId) {
        url += `&tenantId=${tenantId}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        throw new Error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-gray-500 mb-4">{error || 'No analytics data available'}</p>
            <Button onClick={fetchAnalytics} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { overview, monthlyStats, serviceStats, timeSlotStats, topClients } = analytics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
          <p className="text-gray-600">Detailed insights into your business performance</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalAppointments.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {overview.appointmentGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={overview.appointmentGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(overview.appointmentGrowth)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {overview.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={overview.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(overview.revenueGrowth)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalClients.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {overview.clientGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={overview.clientGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(overview.clientGrowth)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.completionRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Star className="h-3 w-3 mr-1 text-yellow-500" />
              <span>Avg Rating: {overview.averageRating}/5</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="clients">Top Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Track your business growth over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{stat.month}</p>
                      <p className="text-sm text-gray-600">{stat.appointments} appointments</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${stat.revenue.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{stat.newClients} new clients</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Performance</CardTitle>
              <CardDescription>See which services are most popular</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceStats.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{service.serviceName}</p>
                      <p className="text-sm text-gray-600">{service.bookings} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${service.revenue.toLocaleString()}</p>
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="h-3 w-3 mr-1 text-yellow-500" />
                        {service.avgRating}/5
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Popular Time Slots</CardTitle>
              <CardDescription>Optimize your schedule based on booking patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeSlotStats.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">
                        {format(new Date().setHours(slot.hour, 0, 0, 0), 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (slot.bookings / Math.max(...timeSlotStats.map(s => s.bookings))) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{slot.bookings}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Clients</CardTitle>
              <CardDescription>Your most valuable customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${client.totalSpent.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{client.totalAppointments} appointments</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
