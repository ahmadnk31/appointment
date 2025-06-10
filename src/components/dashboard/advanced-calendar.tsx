'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, addDays, isToday, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import React from 'react'

interface Appointment {
  id: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  notes?: string
  service: {
    id: string
    name: string
    duration: number
    price: number
  }
  client: {
    id: string
    name: string
    email: string
    phone?: string
  }
  provider: {
    id: string
    name: string
  }
  payment?: {
    id: string
    amount: number
    status: string
  }
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface CalendarView {
  type: 'month' | 'week' | 'day'
  date: Date
}

export default function AdvancedCalendar() {
  const { data: session } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<CalendarView>({ type: 'month', date: new Date() })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProvider, setFilterProvider] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAppointments()
    fetchServices()
    fetchUsers()
  }, [view.date])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const startDate = startOfMonth(view.date)
      const endDate = endOfMonth(view.date)
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      const response = await fetch(`/api/appointments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.filter((user: User) => user.role === 'PROVIDER' || user.role === 'CLIENT'))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus
      const matchesProvider = filterProvider === 'all' || appointment.provider.id === filterProvider
      const matchesSearch = searchTerm === '' || 
        appointment.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.client.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesStatus && matchesProvider && matchesSearch
    })
  }, [appointments, filterStatus, filterProvider, searchTerm])

  const getAppointmentsForDate = (date: Date) => {
    return filteredAppointments.filter(appointment => 
      isSameDay(parseISO(appointment.startTime), date)
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-500'
      case 'PENDING': return 'bg-yellow-500'
      case 'CANCELLED': return 'bg-red-500'
      case 'COMPLETED': return 'bg-blue-500'
      case 'NO_SHOW': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'default'
      case 'PENDING': return 'secondary'
      case 'CANCELLED': return 'destructive'
      case 'COMPLETED': return 'outline'
      case 'NO_SHOW': return 'outline'
      default: return 'secondary'
    }
  }

  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(view.date)
    const monthEnd = endOfMonth(view.date)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Week headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map(day => {
          const dayAppointments = getAppointmentsForDate(day)
          const isCurrentMonth = isSameMonth(day, view.date)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-24 p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors",
                !isCurrentMonth && "bg-gray-50 text-gray-400",
                isSelected && "bg-blue-50 border-blue-300",
                isToday(day) && "bg-blue-100 border-blue-500"
              )}
              onClick={() => setSelectedDate(day)}
            >
              <div className="text-sm font-medium mb-1">
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(appointment => (
                  <div
                    key={appointment.id}
                    className={cn(
                      "text-xs p-1 rounded text-white truncate cursor-pointer",
                      getStatusColor(appointment.status)
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedAppointment(appointment)
                      setIsViewDialogOpen(true)
                    }}
                    title={`${appointment.client.name} - ${appointment.service.name}`}
                  >
                    {format(parseISO(appointment.startTime), 'HH:mm')} {appointment.client.name}
                  </div>
                ))}
                
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(view.date)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8 AM to 7 PM

    return (
      <div className="grid grid-cols-8 gap-1">
        {/* Time column header */}
        <div className="p-2 text-center text-sm font-medium text-gray-500">
          Time
        </div>
        
        {/* Day headers */}
        {weekDays.map(day => (
          <div key={day.toISOString()} className="p-2 text-center text-sm font-medium text-gray-500">
            <div>{format(day, 'EEE')}</div>
            <div className={cn(
              "text-lg font-bold",
              isToday(day) && "text-blue-600"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
        
        {/* Time slots */}
        {hours.map(hour => (
          <React.Fragment key={hour}>
            {/* Time label */}
            <div className="p-2 text-sm text-gray-500 border-r">
              {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
            </div>
            
            {/* Time slots for each day */}
            {weekDays.map(day => {
              const slotAppointments = getAppointmentsForDate(day).filter(apt => 
                new Date(apt.startTime).getHours() === hour
              )
              
              return (
                <div 
                  key={`${day.toISOString()}-${hour}`}
                  className="min-h-16 p-1 border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    const slotDate = new Date(day)
                    slotDate.setHours(hour, 0, 0, 0)
                    setSelectedDate(slotDate)
                    setIsDialogOpen(true)
                  }}
                >
                  {slotAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      className={cn(
                        "text-xs p-1 rounded text-white mb-1 cursor-pointer",
                        getStatusColor(appointment.status)
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAppointment(appointment)
                        setIsViewDialogOpen(true)
                      }}
                    >
                      <div className="font-medium">{appointment.client.name}</div>
                      <div>{appointment.service.name}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    )
  }

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(view.date).sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {format(view.date, 'EEEE, MMMM d, yyyy')}
          </h3>
          <p className="text-gray-600">{dayAppointments.length} appointments</p>
        </div>
        
        <div className="space-y-2">
          {dayAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No appointments scheduled for this day</p>
                  <Button 
                    onClick={() => setIsDialogOpen(true)} 
                    className="mt-4"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            dayAppointments.map(appointment => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">
                          {format(parseISO(appointment.startTime), 'h:mm a')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {appointment.service.duration}min
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">{appointment.client.name}</h4>
                          <Badge variant={getStatusBadgeVariant(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{appointment.service.name}</p>
                        <p className="text-xs text-gray-500">{appointment.client.email}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium">${appointment.service.price}</div>
                        {appointment.payment && (
                          <div className="text-xs text-gray-500">
                            {appointment.payment.status}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          setIsViewDialogOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600">Manage your appointments and schedule</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
          <Button variant="outline" onClick={fetchAppointments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView(prev => ({ ...prev, date: subMonths(prev.date, 1) }))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-lg font-semibold">
                {format(view.date, 'MMMM yyyy')}
              </h2>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView(prev => ({ ...prev, date: addMonths(prev.date, 1) }))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView(prev => ({ ...prev, date: new Date() }))}
              >
                Today
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Tabs value={view.type} onValueChange={(value) => setView(prev => ({ ...prev, type: value as any }))}>
                <TabsList>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search clients, services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="provider-filter">Provider</Label>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {users.filter(user => user.role === 'PROVIDER').map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div>
              {view.type === 'month' && renderCalendarGrid()}
              {view.type === 'week' && renderWeekView()}
              {view.type === 'day' && renderDayView()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedAppointment.client.name}</h3>
                <Badge variant={getStatusBadgeVariant(selectedAppointment.status)}>
                  {selectedAppointment.status}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span>{selectedAppointment.service.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span>{format(parseISO(selectedAppointment.startTime), 'MMM d, yyyy')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span>
                    {format(parseISO(selectedAppointment.startTime), 'h:mm a')} - 
                    {format(parseISO(selectedAppointment.endTime), 'h:mm a')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span>{selectedAppointment.service.duration} minutes</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span>${selectedAppointment.service.price}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Provider:</span>
                  <span>{selectedAppointment.provider.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Client Email:</span>
                  <span>{selectedAppointment.client.email}</span>
                </div>
                
                {selectedAppointment.client.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client Phone:</span>
                    <span>{selectedAppointment.client.phone}</span>
                  </div>
                )}
                
                {selectedAppointment.payment && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <span className="capitalize">{selectedAppointment.payment.status}</span>
                  </div>
                )}
                
                {selectedAppointment.notes && (
                  <div>
                    <span className="text-gray-600 block mb-1">Notes:</span>
                    <p className="text-sm bg-gray-50 p-2 rounded">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
