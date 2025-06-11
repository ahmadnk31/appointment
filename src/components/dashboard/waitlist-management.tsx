'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Users, Plus, Edit, Trash2, Bell, Calendar, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface WaitlistEntry {
  id: string;
  preferredDate?: string;
  preferredTimeSlot?: string;
  flexibleDates: boolean;
  flexibleTimes: boolean;
  status: 'ACTIVE' | 'NOTIFIED' | 'BOOKED' | 'CANCELLED' | 'EXPIRED';
  priority: number;
  notes?: string;
  notificationSent: boolean;
  notifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  provider?: {
    id: string;
    name: string;
    email: string;
  };
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Provider {
  id: string;
  name: string;
  email: string;
}

const timeSlotOptions = [
  { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM - 5 PM)' },
  { value: 'evening', label: 'Evening (5 PM - 10 PM)' },
];

const statusColors = {
  ACTIVE: 'default',
  NOTIFIED: 'secondary',
  BOOKED: 'default',
  CANCELLED: 'destructive',
  EXPIRED: 'outline',
} as const;

export default function WaitlistManagement() {
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [formData, setFormData] = useState({
    serviceId: '',
    providerId: '',
    preferredDate: '',
    preferredTimeSlot: '',
    flexibleDates: false,
    flexibleTimes: false,
    notes: '',
    priority: 1,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [notifyData, setNotifyData] = useState({
    serviceId: '',
    providerId: '',
    availableSlots: [{ startTime: '', endTime: '' }],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [waitlistRes, servicesRes, providersRes] = await Promise.all([
        fetch('/api/waitlist'),
        fetch('/api/services'),
        fetch('/api/users?role=PROVIDER'),
      ]);

      if (waitlistRes.ok) {
        const waitlistData = await waitlistRes.json();
        setWaitlistEntries(waitlistData.waitlistEntries || []);
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData.services || []);
      }

      if (providersRes.ok) {
        const providersData = await providersRes.json();
        setProviders(providersData.users || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serviceId) {
      toast({
        title: 'Error',
        description: 'Please select a service',
        variant: 'destructive',
      });
      return;
    }

    try {
      const url = editingId 
        ? `/api/waitlist/${editingId}` 
        : '/api/waitlist';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          preferredDate: formData.preferredDate ? `${formData.preferredDate}T00:00:00.000Z` : undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingId 
            ? 'Waitlist entry updated successfully'
            : 'Added to waitlist successfully',
        });
        
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save waitlist entry');
      }
    } catch (error) {
      console.error('Error saving waitlist entry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save waitlist entry',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (entry: WaitlistEntry) => {
    setEditingId(entry.id);
    setFormData({
      serviceId: entry.service.id,
      providerId: entry.provider?.id || '',
      preferredDate: entry.preferredDate ? format(parseISO(entry.preferredDate), 'yyyy-MM-dd') : '',
      preferredTimeSlot: entry.preferredTimeSlot || '',
      flexibleDates: entry.flexibleDates,
      flexibleTimes: entry.flexibleTimes,
      notes: entry.notes || '',
      priority: entry.priority,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this waitlist entry?')) {
      return;
    }

    try {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Waitlist entry removed successfully',
        });
        fetchData();
      } else {
        throw new Error('Failed to remove waitlist entry');
      }
    } catch (error) {
      console.error('Error removing waitlist entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove waitlist entry',
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Waitlist status updated',
        });
        fetchData();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleNotifyWaitlist = async () => {
    if (!notifyData.availableSlots.some(slot => slot.startTime)) {
      toast({
        title: 'Error',
        description: 'Please provide at least one available time slot',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/waitlist/notify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifyData),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: result.message,
        });
        setIsNotifyDialogOpen(false);
        fetchData();
      } else {
        throw new Error('Failed to notify waitlist');
      }
    } catch (error) {
      console.error('Error notifying waitlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to notify waitlist',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      serviceId: '',
      providerId: '',
      preferredDate: '',
      preferredTimeSlot: '',
      flexibleDates: false,
      flexibleTimes: false,
      notes: '',
      priority: 1,
    });
    setEditingId(null);
  };

  const resetNotifyForm = () => {
    setNotifyData({
      serviceId: '',
      providerId: '',
      availableSlots: [{ startTime: '', endTime: '' }],
    });
  };

  const addTimeSlot = () => {
    setNotifyData(prev => ({
      ...prev,
      availableSlots: [...prev.availableSlots, { startTime: '', endTime: '' }],
    }));
  };

  const removeTimeSlot = (index: number) => {
    setNotifyData(prev => ({
      ...prev,
      availableSlots: prev.availableSlots.filter((_, i) => i !== index),
    }));
  };

  const updateTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setNotifyData(prev => ({
      ...prev,
      availableSlots: prev.availableSlots.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const filteredEntries = waitlistEntries.filter(entry => {
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
    if (filterService !== 'all' && entry.service.id !== filterService) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading waitlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold">Waitlist Management</h2>
          <p className="text-gray-600">Manage appointment waitlist and notify clients of available slots</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetNotifyForm} className="w-full sm:w-auto">
                <Bell className="h-4 w-4 mr-2" />
                Notify Waitlist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Notify Waitlist of Available Slots</DialogTitle>
              </DialogHeader>                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="notifyServiceId">Service</Label>
                      <Select
                        value={notifyData.serviceId}
                        onValueChange={(value) => setNotifyData(prev => ({ ...prev, serviceId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All services" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All services</SelectItem>
                          {services.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="notifyProviderId">Provider</Label>
                      <Select
                        value={notifyData.providerId}
                        onValueChange={(value) => setNotifyData(prev => ({ ...prev, providerId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All providers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All providers</SelectItem>
                          {providers.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                <div>
                  <Label>Available Time Slots</Label>
                  <div className="space-y-2 mt-2">
                    {notifyData.availableSlots.map((slot, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Input
                          type="datetime-local"
                          placeholder="Start time"
                          value={slot.startTime}
                          onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="datetime-local"
                          placeholder="End time"
                          value={slot.endTime}
                          onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                          className="flex-1"
                        />
                        {notifyData.availableSlots.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTimeSlot(index)}
                            className="w-full sm:w-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeSlot}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Slot
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsNotifyDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleNotifyWaitlist} className="w-full sm:w-auto">
                    <Bell className="h-4 w-4 mr-2" />
                    Notify Waitlist
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Join Waitlist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Edit Waitlist Entry' : 'Join Waitlist'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="serviceId">Service *</Label>
                    <Select
                      value={formData.serviceId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, serviceId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(service => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - ${service.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="providerId">Provider (Optional)</Label>
                    <Select
                      value={formData.providerId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, providerId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any provider</SelectItem>
                        {providers.map(provider => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredDate">Preferred Date</Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="preferredTimeSlot">Preferred Time</Label>
                    <Select
                      value={formData.preferredTimeSlot}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, preferredTimeSlot: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any time</SelectItem>
                        {timeSlotOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="flexibleDates"
                      checked={formData.flexibleDates}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, flexibleDates: checked }))}
                    />
                    <Label htmlFor="flexibleDates">Flexible with dates</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="flexibleTimes"
                      checked={formData.flexibleTimes}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, flexibleTimes: checked }))}
                    />
                    <Label htmlFor="flexibleTimes">Flexible with times</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="priority">Priority (1-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes or requirements..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? 'Update' : 'Join'} Waitlist
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="NOTIFIED">Notified</SelectItem>
            <SelectItem value="BOOKED">Booked</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {services.map(service => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Waitlist Entries */}
      <div className="grid gap-4">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Waitlist Entries</h3>
              <p className="text-gray-500 mb-4">
                No clients are currently on the waitlist with the selected filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">{entry.client.name}</span>
                      </div>
                      <Badge variant={statusColors[entry.status]} className="self-start sm:self-auto">
                        {entry.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {entry.service.name} - ${entry.service.price}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Select
                      value={entry.status}
                      onValueChange={(value) => handleStatusUpdate(entry.id, value)}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="NOTIFIED">Notified</SelectItem>
                        <SelectItem value="BOOKED">Booked</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="ml-1 sm:hidden">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-1 sm:hidden">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="break-all">{entry.client.email}</span>
                    </div>
                    {entry.client.phone && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 mr-2 flex-shrink-0">📞</span>
                        <span className="break-all">{entry.client.phone}</span>
                      </div>
                    )}
                    {entry.provider && (
                      <div className="flex items-start text-sm">
                        <User className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                        <span className="break-words">Provider: {entry.provider.name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {entry.preferredDate && (
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Preferred: {format(parseISO(entry.preferredDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {entry.preferredTimeSlot && (
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{timeSlotOptions.find(opt => opt.value === entry.preferredTimeSlot)?.label || entry.preferredTimeSlot}</span>
                      </div>
                    )}
                    <div className="flex space-x-2">
                      {entry.flexibleDates && (
                        <Badge variant="outline" className="text-xs">Flexible Dates</Badge>
                      )}
                      {entry.flexibleTimes && (
                        <Badge variant="outline" className="text-xs">Flexible Times</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Priority:</span>
                      <span className="ml-1">{entry.priority}/10</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Added:</span>
                      <span className="ml-1">{format(parseISO(entry.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    {entry.notificationSent && entry.notifiedAt && (
                      <div className="text-sm text-green-600">
                        <Bell className="h-3 w-3 inline mr-1" />
                        Notified {format(parseISO(entry.notifiedAt), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>
                </div>

                {entry.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{entry.notes}</p>
                  </div>
                )}

                {entry.expiresAt && (
                  <div className="mt-2 text-xs text-gray-500">
                    Expires: {format(parseISO(entry.expiresAt), 'MMM d, yyyy')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
