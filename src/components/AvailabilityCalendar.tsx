'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'

interface TimeSlot {
  time: string
  available: boolean
  datetime?: string
}

interface DayAvailability {
  date: Date
  totalSlots: number
  availableSlots: number
  timeSlots: TimeSlot[]
}

interface AvailabilityCalendarProps {
  tenantSlug: string
  providerId: string
  onTimeSelect: (date: Date, time: string) => void
  selectedDate?: Date
  selectedTime?: string
}

export default function AvailabilityCalendar({ 
  tenantSlug, 
  providerId, 
  onTimeSelect, 
  selectedDate, 
  selectedTime 
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({})
  const [loading, setLoading] = useState(false)
  const [selectedDaySlots, setSelectedDaySlots] = useState<TimeSlot[]>([])

  useEffect(() => {
    fetchMonthAvailability()
  }, [currentMonth, providerId, tenantSlug])

  useEffect(() => {
    if (selectedDate) {
      const dateKey = selectedDate.toISOString().split('T')[0]
      const dayAvailability = availability[dateKey]
      setSelectedDaySlots(dayAvailability?.timeSlots || [])
    }
  }, [selectedDate, availability])

  const fetchMonthAvailability = async () => {
    if (!providerId || !tenantSlug) return
    
    setLoading(true)
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    const newAvailability: Record<string, DayAvailability> = {}
    
    // Fetch availability for each day in the month
    const fetchPromises = daysInMonth.map(async (date) => {
      // Skip past dates and Sundays
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (date < today || date.getDay() === 0) {
        return
      }
      
      try {
        const dateString = date.toISOString().split('T')[0]
        const response = await fetch(
          `/api/appointments/availability?tenant=${tenantSlug}&providerId=${providerId}&date=${dateString}`
        )
        
        if (response.ok) {
          const timeSlots: TimeSlot[] = await response.json()
          const availableSlots = timeSlots.filter(slot => slot.available).length
          
          newAvailability[dateString] = {
            date,
            totalSlots: timeSlots.length,
            availableSlots,
            timeSlots
          }
        }
      } catch (error) {
        console.error(`Error fetching availability for ${date}:`, error)
      }
    })
    
    await Promise.all(fetchPromises)
    setAvailability(newAvailability)
    setLoading(false)
  }

  const getDayAvailability = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    return availability[dateKey]
  }

  const getAvailabilityColor = (dayAvailability: DayAvailability | undefined) => {
    if (!dayAvailability) return 'text-gray-300'
    
    const ratio = dayAvailability.availableSlots / dayAvailability.totalSlots
    if (ratio === 0) return 'text-red-500'
    if (ratio < 0.3) return 'text-orange-500'
    if (ratio < 0.7) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getAvailabilityBadge = (dayAvailability: DayAvailability | undefined) => {
    if (!dayAvailability) return null
    
    const ratio = dayAvailability.availableSlots / dayAvailability.totalSlots
    if (ratio === 0) return 'Full'
    if (ratio < 0.3) return 'Limited'
    if (ratio < 0.7) return 'Available'
    return 'Open'
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    
    // Always allow date selection, even if no slots available (for better UX)
    // This will show the "no slots available" message
    onTimeSelect(date, '')
  }

  const handleTimeSelect = (time: string) => {
    if (selectedDate) {
      onTimeSelect(selectedDate, time)
    }
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Availability Calendar
              </CardTitle>
              <CardDescription>
                Select a date to view available time slots
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-700">Widely Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span className="text-gray-700">Limited Availability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-gray-700">Fully Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span className="text-gray-700">Unavailable</span>
            </div>
          </div>

          {/* Calendar */}
          <div className="relative">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              disabled={(date) => {
                // Disable past dates and Sundays
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (date < today || date.getDay() === 0) {
                  return true
                }
                return false
              }}
              modifiers={{
                available: (date) => {
                  const dayAvailability = getDayAvailability(date)
                  return dayAvailability && dayAvailability.availableSlots > 0
                },
                full: (date) => {
                  const dayAvailability = getDayAvailability(date)
                  return dayAvailability && dayAvailability.availableSlots === 0
                },
                limited: (date) => {
                  const dayAvailability = getDayAvailability(date)
                  if (!dayAvailability) return false
                  const ratio = dayAvailability.availableSlots / dayAvailability.totalSlots
                  return ratio > 0 && ratio < 0.5
                }
              }}
              modifiersClassNames={{
                available: "bg-green-100 text-green-800 hover:bg-green-200 border border-green-300",
                full: "bg-red-100 text-red-800 opacity-50 cursor-not-allowed",
                limited: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300"
              }}
              className="w-full"
              classNames={{
                months: "flex flex-col space-y-4",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                day_range_end: "day-range-end",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible"
              }}
            />
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Availability Summary for Selected Date */}
      {selectedDate && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-medium">
                {format(selectedDate, 'PPPP')}
              </p>
              {(() => {
                const dayAvailability = getDayAvailability(selectedDate)
                if (!dayAvailability) {
                  return (
                    <p className="text-gray-500 mt-2">
                      Loading availability...
                    </p>
                  )
                }
                if (dayAvailability.availableSlots === 0) {
                  return (
                    <p className="text-red-600 mt-2">
                      No available time slots
                    </p>
                  )
                }
                return (
                  <p className="text-green-600 mt-2">
                    {dayAvailability.availableSlots} of {dayAvailability.totalSlots} slots available
                  </p>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Slots for Selected Date */}
      {selectedDate && selectedDaySlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Available Times - {format(selectedDate, 'PPPP')}
            </CardTitle>
            <CardDescription>
              {selectedDaySlots.filter(slot => slot.available).length} of {selectedDaySlots.length} slots available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {selectedDaySlots.map((slot) => (
                <Button
                  key={slot.time}
                  type="button"
                  variant={selectedTime === slot.time ? "default" : "outline"}
                  size="sm"
                  disabled={!slot.available}
                  onClick={() => handleTimeSelect(slot.time)}
                  className={cn(
                    "h-10 text-sm",
                    !slot.available && "opacity-50 cursor-not-allowed",
                    selectedTime === slot.time && "bg-blue-600 text-white"
                  )}
                >
                  {slot.time}
                </Button>
              ))}
            </div>
            
            {selectedDaySlots.filter(slot => slot.available).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No available time slots for this date</p>
                <p className="text-sm">Please select a different date</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
