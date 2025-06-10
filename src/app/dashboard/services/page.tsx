'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  isActive: boolean
  imageUrl?: string
  imageKey?: string
}

export default function ServicesPage() {
  const { data: session } = useSession()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
    imageUrl: '',
    imageKey: ''
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingService ? `/api/services/${editingService.id}` : '/api/services'
      const method = editingService ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchServices()
        setIsDialogOpen(false)
        setEditingService(null)
        setFormData({ name: '', description: '', duration: 30, price: 0, imageUrl: '', imageKey: '' })
      }
    } catch (error) {
      console.error('Error saving service:', error)
    }
  }
  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      imageUrl: service.imageUrl || '',
      imageKey: service.imageKey || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchServices()
      }
    } catch (error) {
      console.error('Error deleting service:', error)
    }
  }

  const toggleServiceStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        fetchServices()
      }
    } catch (error) {
      console.error('Error updating service status:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }
  return (
    <div className="container mx-auto p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Services</h1>
          <p className="text-gray-600">Manage your appointment services</p>
        </div>        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
              <DialogDescription>
                {editingService ? 'Update the service details below.' : 'Create a new service for your appointment system.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      required
                      min="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      required
                      min="0"
                    />                  </div>
                  
                </div>                <div className="grid gap-2">
                  <Label>Service Image</Label>
                  <ImageUpload
                    value={formData.imageUrl}
                    onChange={(url, key) => setFormData({ 
                      ...formData, 
                      imageUrl: url || '',
                      imageKey: key || ''
                    })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">        {services.map((service) => (
          <Card key={service.id}>
            {service.imageUrl && (
              <div className="w-full h-48 relative overflow-hidden rounded-t-lg">
                <img 
                  src={service.imageUrl} 
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="break-words">{service.name}</span>
                    <Badge variant={service.isActive ? "default" : "secondary"}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                  {service.description && (
                    <CardDescription className="mt-2 break-words">
                      {service.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(service)}
                    className="flex-1 sm:flex-none"
                  >
                    <Edit className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                    className="flex-1 sm:flex-none"
                  >
                    <Trash2 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </CardHeader>            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {service.duration} min
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    ${service.price}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleServiceStatus(service.id, service.isActive)}
                  className="w-full sm:w-auto"
                >
                  {service.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
