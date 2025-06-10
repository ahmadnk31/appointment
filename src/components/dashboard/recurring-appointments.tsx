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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Clock, Repeat, Edit, Trash2, Eye, User, DollarSign } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RecurringAppointment {
  id: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  maxOccurrences?: number;
  isActive: boolean;
  duration: number;
  notes?: string;
  paymentMethod: 'CASH' | 'ONLINE';
  paymentAmount?: number;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  provider: {
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
  appointments: Array<{
    id: string;
    startTime: string;
    status: string;
  }>;
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

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function RecurringAppointments() {
  const [recurringAppointments, setRecurringAppointments] = useState<RecurringAppointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);  const [formData, setFormData] = useState<{
    serviceId: string;
    providerId: string;
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    interval: number;
    daysOfWeek: number[];
    dayOfMonth: number;
    endDate: string;
    maxOccurrences: string;
    duration: number;
    notes: string;
    paymentMethod: 'CASH' | 'ONLINE';
    paymentAmount: string;
    startDate: string;
    startTime: string;
  }>({
    serviceId: '',
    providerId: '',
    frequency: 'WEEKLY',
    interval: 1,
    daysOfWeek: [],
    dayOfMonth: 1,
    endDate: '',
    maxOccurrences: '',
    duration: 60,
    notes: '',
    paymentMethod: 'CASH',
    paymentAmount: '',
    startDate: '',
    startTime: '09:00',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recurringRes, servicesRes, providersRes] = await Promise.all([
        fetch('/api/recurring-appointments'),
        fetch('/api/services'),
        fetch('/api/users?role=PROVIDER'),
      ]);

      if (recurringRes.ok) {
        const recurringData = await recurringRes.json();
        setRecurringAppointments(recurringData.recurringAppointments || []);
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
    
    if (!formData.serviceId || !formData.startDate || !formData.startTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedService = services.find(s => s.id === formData.serviceId);
      const submitData = {
        ...formData,
        duration: selectedService?.duration || formData.duration,
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : selectedService?.price,
        maxOccurrences: formData.maxOccurrences ? parseInt(formData.maxOccurrences) : undefined,
        startDate: `${formData.startDate}T${formData.startTime}:00.000Z`,
      };

      const url = editingId 
        ? `/api/recurring-appointments/${editingId}` 
        : '/api/recurring-appointments';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: editingId 
            ? 'Recurring appointment updated successfully'
            : `Recurring appointment created with ${data.generatedAppointments} appointments`,
        });
        
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save recurring appointment');
      }
    } catch (error) {
      console.error('Error saving recurring appointment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save recurring appointment',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (appointment: RecurringAppointment) => {
    setEditingId(appointment.id);
    setFormData({
      serviceId: appointment.service.id,
      providerId: appointment.provider.id,
      frequency: appointment.frequency,
      interval: appointment.interval,
      daysOfWeek: appointment.daysOfWeek ? JSON.parse(appointment.daysOfWeek as any) : [],
      dayOfMonth: appointment.dayOfMonth || 1,
      endDate: appointment.endDate ? format(parseISO(appointment.endDate), 'yyyy-MM-dd') : '',
      maxOccurrences: appointment.maxOccurrences?.toString() || '',
      duration: appointment.duration,
      notes: appointment.notes || '',
      paymentMethod: appointment.paymentMethod,
      paymentAmount: appointment.paymentAmount?.toString() || '',
      startDate: '',
      startTime: '09:00',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring appointment? This will cancel all future appointments.')) {
      return;
    }

    try {
      const response = await fetch(`/api/recurring-appointments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Recurring appointment deleted successfully',
        });
        fetchData();
      } else {
        throw new Error('Failed to delete recurring appointment');
      }
    } catch (error) {
      console.error('Error deleting recurring appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete recurring appointment',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/recurring-appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Recurring appointment ${!isActive ? 'activated' : 'deactivated'}`,
        });
        fetchData();
      } else {
        throw new Error('Failed to update recurring appointment');
      }
    } catch (error) {
      console.error('Error updating recurring appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update recurring appointment',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      serviceId: '',
      providerId: '',
      frequency: 'WEEKLY',
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: 1,
      endDate: '',
      maxOccurrences: '',
      duration: 60,
      notes: '',
      paymentMethod: 'CASH',
      paymentAmount: '',
      startDate: '',
      startTime: '09:00',
    });
    setEditingId(null);
  };

  const getFrequencyDisplay = (appointment: RecurringAppointment) => {
    let display = `Every ${appointment.interval > 1 ? appointment.interval + ' ' : ''}`;
    
    switch (appointment.frequency) {
      case 'DAILY':
        display += appointment.interval === 1 ? 'day' : 'days';
        break;
      case 'WEEKLY':
        display += appointment.interval === 1 ? 'week' : 'weeks';
        if (appointment.daysOfWeek) {
          const days = JSON.parse(appointment.daysOfWeek as any);
          const dayNames = days.map((d: number) => daysOfWeek.find(day => day.value === d)?.label).join(', ');
          display += ` on ${dayNames}`;
        }
        break;
      case 'BIWEEKLY':
        display = 'Every 2 weeks';
        break;
      case 'MONTHLY':
        display += appointment.interval === 1 ? 'month' : 'months';
        if (appointment.dayOfMonth) {
          display += ` on the ${appointment.dayOfMonth}${getOrdinalSuffix(appointment.dayOfMonth)}`;
        }
        break;
      case 'QUARTERLY':
        display += appointment.interval === 1 ? 'quarter' : 'quarters';
        break;
      case 'YEARLY':
        display += appointment.interval === 1 ? 'year' : 'years';
        break;
    }
    
    return display;
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading recurring appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recurring Appointments</h2>
          <p className="text-gray-600">Manage recurring appointment schedules</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Recurring Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Recurring Appointment' : 'Create Recurring Appointment'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceId">Service *</Label>
                  <Select
                    value={formData.serviceId}
                    onValueChange={(value) => {
                      const service = services.find(s => s.id === value);
                      setFormData(prev => ({
                        ...prev,
                        serviceId: value,
                        duration: service?.duration || prev.duration,
                        paymentAmount: service?.price.toString() || prev.paymentAmount,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {service.duration}min - ${service.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="providerId">Provider</Label>
                  <Select
                    value={formData.providerId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, providerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="interval">Interval</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.interval}
                    onChange={(e) => setFormData(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              {(formData.frequency === 'WEEKLY' || formData.frequency === 'BIWEEKLY') && (
                <div>
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {daysOfWeek.map(day => (
                      <label key={day.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.daysOfWeek.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                daysOfWeek: [...prev.daysOfWeek, day.value]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                daysOfWeek: prev.daysOfWeek.filter(d => d !== day.value)
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.frequency === 'MONTHLY' && (
                <div>
                  <Label htmlFor="dayOfMonth">Day of Month</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="maxOccurrences">Max Occurrences (optional)</Label>
                  <Input
                    id="maxOccurrences"
                    type="number"
                    min="1"
                    value={formData.maxOccurrences}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxOccurrences: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentAmount">Payment Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={formData.paymentAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes for this recurring appointment..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? 'Update' : 'Create'} Recurring Appointment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {recurringAppointments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Repeat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Recurring Appointments</h3>
              <p className="text-gray-500 mb-4">
                Create your first recurring appointment to get started.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Recurring Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          recurringAppointments.map((appointment) => (
            <Card key={appointment.id} className={`${!appointment.isActive ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {appointment.service.name}
                      {!appointment.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {getFrequencyDisplay(appointment)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={appointment.isActive}
                      onCheckedChange={() => toggleActive(appointment.id, appointment.isActive)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(appointment)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(appointment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">Client:</span>
                      <span className="ml-1">{appointment.client.name}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">Provider:</span>
                      <span className="ml-1">{appointment.provider.name}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">Duration:</span>
                      <span className="ml-1">{appointment.duration} minutes</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">Amount:</span>
                      <span className="ml-1">${appointment.paymentAmount || appointment.service.price}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Generated:</span>
                      <span className="ml-1">{appointment.appointments.length} appointments</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Created:</span>
                      <span className="ml-1">{format(parseISO(appointment.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{appointment.notes}</p>
                  </div>
                )}

                {appointment.appointments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Recent Appointments</h4>
                    <div className="space-y-1">
                      {appointment.appointments.slice(0, 3).map((apt) => (
                        <div key={apt.id} className="flex justify-between items-center text-sm">
                          <span>{format(parseISO(apt.startTime), 'MMM d, yyyy h:mm a')}</span>
                          <Badge 
                            variant={
                              apt.status === 'CONFIRMED' ? 'default' :
                              apt.status === 'COMPLETED' ? 'secondary' :
                              apt.status === 'CANCELLED' ? 'destructive' : 'outline'
                            }
                          >
                            {apt.status}
                          </Badge>
                        </div>
                      ))}
                      {appointment.appointments.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{appointment.appointments.length - 3} more appointments
                        </p>
                      )}
                    </div>
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
