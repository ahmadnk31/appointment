'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, Clock, Plus, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalAppointments: number
  todayAppointments: number
  totalClients: number
  totalServices: number
}

export default function Dashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    todayAppointments: 0,
    totalClients: 0,
    totalServices: 0,
  })

  useEffect(() => {
    // Fetch dashboard stats here
    // For now, using dummy data
    setStats({
      totalAppointments: 45,
      todayAppointments: 3,
      totalClients: 28,
      totalServices: 8,
    })
  }, [])

  if (!session) {
    return null
  }
  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session.user.name}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here's what's happening with your appointments today.
        </p>
      </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  All time appointments
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
                  Scheduled for today
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
                  Registered clients
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalServices}</div>
                <p className="text-xs text-muted-foreground">
                  Available services
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks you can perform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.user.role === 'CLIENT' && (
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Book New Appointment
                  </Button>
                )}
                
                {(session.user.role === 'PROVIDER' || session.user.role === 'ADMIN') && (
                  <>
                    <Button className="w-full justify-start" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Service
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      View Calendar
                    </Button>
                  </>
                )}
                
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  My Appointments
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates on your appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  No recent activity to show. Start by creating or booking an appointment.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Current system information
                </CardDescription>
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
          </div>
        </div>
      </main>
    </div>
  )
}
