'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Calendar, Clock, User, Plus, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

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
  }
  client: {
    id: string
    name: string
    email: string
  }
  provider: {
    id: string
    name: string
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

export default function AppointmentsPage() {
  const { data: session } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    serviceId: '',
    clientId: '',
    providerId: '',
    startTime: '',
    endTime: '',
    notes: ''
  })

  useEffect(() => {
    fetchAppointments()
    fetchServices()
    fetchUsers()
  }, [])

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
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
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingAppointment ? `/api/appointments/${editingAppointment.id}` : '/api/appointments'
      const method = editingAppointment ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchAppointments()
        setIsDialogOpen(false)
        setEditingAppointment(null)
        setFormData({
          serviceId: '',
          clientId: '',
          providerId: '',
          startTime: '',
          endTime: '',
          notes: ''
        })
      }
    } catch (error) {
      console.error('Error saving appointment:', error)
    }
  }

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setFormData({
      serviceId: appointment.service.id,
      clientId: appointment.client.id,
      providerId: appointment.provider.id,
      startTime: appointment.startTime.slice(0, 16), // Format for datetime-local input
      endTime: appointment.endTime.slice(0, 16),
      notes: appointment.notes || ''
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (appointmentId: string) => {
    setDeletingAppointmentId(appointmentId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingAppointmentId) return

    try {
      const response = await fetch(`/api/appointments/${deletingAppointmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchAppointments()
      }
    } catch (error) {
      console.error('Error deleting appointment:', error)
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingAppointmentId(null)
    }
  }

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchAppointments()
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
    }
  }

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (service && formData.startTime) {
      const startTime = new Date(formData.startTime)
      const endTime = new Date(startTime.getTime() + service.duration * 60000)
      setFormData(prev => ({
        ...prev,
        serviceId,
        endTime: endTime.toISOString().slice(0, 16)
      }))
    } else {
      setFormData(prev => ({ ...prev, serviceId }))
    }
  }

  const handleStartTimeChange = (startTime: string) => {
    const service = services.find(s => s.id === formData.serviceId)
    if (service && startTime) {
      const start = new Date(startTime)
      const end = new Date(start.getTime() + service.duration * 60000)
      setFormData(prev => ({
        ...prev,
        startTime,
        endTime: end.toISOString().slice(0, 16)
      }))
    } else {
      setFormData(prev => ({ ...prev, startTime }))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAppointmentTitle = (appointment: Appointment) => {
    return `${appointment.service.name} - ${appointment.client.name}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold truncate">Appointments</h1>
          <p className="text-gray-600">Manage your appointments</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto flex-shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      <div className="space-y-4">{/* Changed from grid gap-4 to space-y-4 for better mobile spacing */}
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first appointment</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment.id} className="w-full">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <span className="truncate">{getAppointmentTitle(appointment)}</span>
                      <Badge className={`${getStatusColor(appointment.status)} self-start sm:self-auto`}>
                        {appointment.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar className="w-4 h-4" />
                        <span className="whitespace-nowrap">{format(new Date(appointment.startTime), 'MMM dd, yyyy')}</span>
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-4 h-4" />
                        <span className="whitespace-nowrap">
                          {format(new Date(appointment.startTime), 'HH:mm')} - 
                          {format(new Date(appointment.endTime), 'HH:mm')}
                        </span>
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(appointment)}
                      className="w-full sm:w-auto"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      <span className="sm:inline lg:hidden xl:inline">Edit</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteClick(appointment.id)}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span className="sm:inline lg:hidden xl:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="min-w-0">
                    <h4 className="font-semibold mb-1">Service</h4>
                    <p className="text-sm text-gray-600 truncate">{appointment.service.name}</p>
                    <p className="text-sm text-gray-500">{appointment.service.duration} minutes</p>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold mb-1">Client</h4>
                    <p className="text-sm text-gray-600 truncate">{appointment.client.name}</p>
                    <p className="text-sm text-gray-500 break-all">{appointment.client.email}</p>
                  </div>
                  <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                    <h4 className="font-semibold mb-1">Provider</h4>
                    <p className="text-sm text-gray-600 truncate">{appointment.provider.name}</p>
                  </div>
                </div>
                {appointment.notes && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-1">Notes</h4>
                    <p className="text-sm text-gray-600 break-words">{appointment.notes}</p>
                  </div>
                )}
                {(appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button 
                      size="sm" 
                      onClick={() => updateAppointmentStatus(appointment.id, 'COMPLETED')}
                      className="w-full sm:w-auto"
                    >
                      Mark Complete
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateAppointmentStatus(appointment.id, 'CANCELLED')}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New/Edit Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
            <DialogDescription>
              {editingAppointment ? 'Update the appointment details below.' : 'Create a new appointment for your client.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="service">Service</Label>
                <Select value={formData.serviceId} onValueChange={handleServiceChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex flex-col">
                          <span>{service.name}</span>
                          <span className="text-xs text-gray-500">({service.duration} min - ${service.price})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client">Client</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(user => user.role === 'CLIENT').map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex flex-col">
                          <span>{client.name}</span>
                          <span className="text-xs text-gray-500 break-all">{client.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="provider">Provider</Label>
                <Select value={formData.providerId} onValueChange={(value) => setFormData({ ...formData, providerId: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(user => user.role === 'PROVIDER' || user.role === 'ADMIN').map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex flex-col">
                          <span>{provider.name}</span>
                          <span className="text-xs text-gray-500">({provider.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes or instructions"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto order-2 sm:order-1">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto order-1 sm:order-2">
                {editingAppointment ? 'Update Appointment' : 'Create Appointment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
