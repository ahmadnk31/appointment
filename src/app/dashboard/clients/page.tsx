'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent,  CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Users, Plus, Edit, Trash2, Mail, Phone, Calendar, Search, UserX, Eye } from 'lucide-react'
import { format } from 'date-fns'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  isActive: boolean
  createdAt: string
  _count?: {
    appointments: number
  }
}

interface Appointment {
  id: string
  title: string
  date: string
  time: string
  status: string
  service: {
    name: string
  }
}

export default function ClientsPage() {
  const { data: session } = useSession()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/users?role=CLIENT')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientAppointments = async (clientId: string) => {
    try {
      const response = await fetch(`/api/appointments?clientId=${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setClientAppointments(data)
      }
    } catch (error) {
      console.error('Error fetching client appointments:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingClient ? `/api/users/${editingClient.id}` : '/api/users'
      const method = editingClient ? 'PUT' : 'POST'
      
      const payload = editingClient 
        ? { name: formData.name, email: formData.email, phone: formData.phone, role: 'CLIENT' }
        : { ...formData, role: 'CLIENT' }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        fetchClients()
        setIsDialogOpen(false)
        setEditingClient(null)
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: ''
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save client')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Failed to save client')
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      password: ''
    })
    setIsDialogOpen(true)
  }

  const handleView = async (client: Client) => {
    setViewingClient(client)
    await fetchClientAppointments(client.id)
    setIsViewDialogOpen(true)
  }

  const handleDeleteClick = (clientId: string) => {
    setDeletingClientId(clientId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingClientId) return

    try {
      const response = await fetch(`/api/users/${deletingClientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchClients()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client')
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingClientId(null)
    }
  }

  const toggleClientStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        fetchClients()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update client status')
      }
    } catch (error) {
      console.error('Error updating client status:', error)
      alert('Failed to update client status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Only providers and admins can access this page
  if (session?.user?.role === 'CLIENT') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <UserX className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-gray-600">Manage your clients and view their appointment history</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Get started by adding your first client'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{client.name}</CardTitle>
                      <Badge variant={client.isActive ? "default" : "secondary"}>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </span>
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleView(client)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteClick(client.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-1">Client Since</h4>
                    <p className="text-sm text-gray-600">
                      {format(new Date(client.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Total Appointments</h4>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {client._count?.appointments || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New/Edit Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Update the client details below.' : 'Create a new client account.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {!editingClient && (
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingClient ? 'Update Client' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Client Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>
              View client information and appointment history
            </DialogDescription>
          </DialogHeader>
          {viewingClient && (
            <div className="grid gap-6 py-4">
              {/* Client Info */}
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold">Client Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="font-medium">{viewingClient.name}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{viewingClient.email}</p>
                  </div>
                  {viewingClient.phone && (
                    <div>
                      <Label>Phone</Label>
                      <p className="font-medium">{viewingClient.phone}</p>
                    </div>
                  )}
                  <div>
                    <Label>Status</Label>
                    <Badge variant={viewingClient.isActive ? "default" : "secondary"}>
                      {viewingClient.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Appointment History */}
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold">Recent Appointments</h3>
                {clientAppointments.length === 0 ? (
                  <p className="text-gray-600">No appointments found</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clientAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{appointment.title}</p>
                          <p className="text-sm text-gray-600">{appointment.service.name}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(appointment.date), 'MMM dd, yyyy')} at {appointment.time}
                          </p>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone and will also delete all associated appointments.
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
