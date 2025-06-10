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
import { Building2, Users, Calendar, Settings, Plus, Edit, Trash2, Globe, Mail, Phone, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  createdAt: string
  updatedAt: string
  settings?: {
    businessName: string
    businessEmail: string
    businessPhone?: string
    businessAddress?: string
    timeZone: string
  }
  _count: {
    users: number
    services: number
    appointments: number
  }
}

export default function TenantsPage() {
  const { data: session } = useSession()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    timeZone: 'UTC',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingTenant ? `/api/tenants/${editingTenant.id}` : '/api/tenants'
      const method = editingTenant ? 'PUT' : 'POST'
      
      const payload = editingTenant 
        ? {
            name: formData.name,
            domain: formData.domain || null,
            settings: {
              businessName: formData.businessName,
              businessEmail: formData.businessEmail,
              businessPhone: formData.businessPhone || null,
              businessAddress: formData.businessAddress || null,
              timeZone: formData.timeZone
            }
          }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        fetchTenants()
        setIsDialogOpen(false)
        setEditingTenant(null)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save tenant')
      }
    } catch (error) {
      console.error('Error saving tenant:', error)
      alert('Failed to save tenant')
    }
  }

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || '',
      businessName: tenant.settings?.businessName || '',
      businessEmail: tenant.settings?.businessEmail || '',
      businessPhone: tenant.settings?.businessPhone || '',
      businessAddress: tenant.settings?.businessAddress || '',
      timeZone: tenant.settings?.timeZone || 'UTC',
      adminName: '',
      adminEmail: '',
      adminPassword: ''
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (tenantId: string) => {
    setDeletingTenantId(tenantId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingTenantId) return

    try {
      const response = await fetch(`/api/tenants/${deletingTenantId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTenants()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete tenant')
      }
    } catch (error) {
      console.error('Error deleting tenant:', error)
      alert('Failed to delete tenant')
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingTenantId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      domain: '',
      businessName: '',
      businessEmail: '',
      businessPhone: '',
      businessAddress: '',
      timeZone: 'UTC',
      adminName: '',
      adminEmail: '',
      adminPassword: ''
    })
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Only super admins can access this page
  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access tenant management.</p>
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
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-gray-600">Manage client organizations and their settings</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      <div className="grid gap-6">
        {tenants.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tenants</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first tenant organization.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Tenant
              </Button>
            </CardContent>
          </Card>
        ) : (
          tenants.map((tenant) => (
            <Card key={tenant.id}>              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        <span className="break-words">{tenant.name}</span>
                      </div>
                      <Badge variant="outline">{tenant.slug}</Badge>
                    </CardTitle>
                    <CardDescription>
                      <div className="grid gap-2">
                        {tenant.settings?.businessEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4" />
                            <span className="break-all">{tenant.settings.businessEmail}</span>
                          </div>
                        )}
                        {tenant.settings?.businessPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4" />
                            {tenant.settings.businessPhone}
                          </div>
                        )}
                        {tenant.domain && (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="w-4 h-4" />
                            <span className="break-all">{tenant.domain}</span>
                          </div>
                        )}
                        {tenant.settings?.businessAddress && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span className="break-words">{tenant.settings.businessAddress}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          {tenant.settings?.timeZone || 'UTC'}
                        </div>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(tenant)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteClick(tenant.id)}
                      disabled={tenant._count.users > 0 || tenant._count.appointments > 0}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500">Users</span>
                    </div>
                    <div className="text-2xl font-bold">{tenant._count.users}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500">Services</span>
                    </div>
                    <div className="text-2xl font-bold">{tenant._count.services}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500">Appointments</span>
                    </div>
                    <div className="text-2xl font-bold">{tenant._count.appointments}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                  Created: {format(new Date(tenant.createdAt), 'MMM dd, yyyy')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New/Edit Tenant Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
            </DialogTitle>
            <DialogDescription>
              {editingTenant 
                ? 'Update tenant information and settings.' 
                : 'Create a new tenant organization with admin user.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold">Basic Information</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value
                        setFormData({ 
                          ...formData, 
                          name,
                          slug: editingTenant ? formData.slug : generateSlug(name)
                        })
                      }}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      disabled={!!editingTenant}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="domain">Custom Domain (Optional)</Label>
                  <Input
                    id="domain"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  />
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h4 className="font-semibold">Business Information</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="businessPhone">Phone (Optional)</Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="timeZone">Time Zone</Label>
                    <Select value={formData.timeZone} onValueChange={(value) => setFormData({ ...formData, timeZone: value })}>
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
                  <Label htmlFor="businessAddress">Address (Optional)</Label>
                  <Textarea
                    id="businessAddress"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              {/* Admin User (only for new tenants) */}
              {!editingTenant && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Admin User</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="adminName">Admin Name</Label>
                      <Input
                        id="adminName"
                        value={formData.adminName}
                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="adminEmail">Admin Email</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="adminPassword">Admin Password</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false)
                setEditingTenant(null)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTenant ? 'Update Tenant' : 'Create Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tenant? This action cannot be undone and will remove all associated data.
              <br />
              <strong>Note:</strong> Tenants with existing users or appointments cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
