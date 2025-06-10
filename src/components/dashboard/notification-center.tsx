'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Bell, 
  Calendar, 
  DollarSign, 
  User, 
  AlertCircle, 
  CheckCircle,
  X,
  Mail,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: 'appointment_booked' | 'appointment_cancelled' | 'payment_received' | 'review_received' | 'system_alert'
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: string
  priority: 'low' | 'medium' | 'high'
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchNotifications()
      connectWebSocket()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [session])

  const connectWebSocket = () => {
    if (!session?.user) return

    try {
      // In a real implementation, you'd use your WebSocket server URL
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? `wss://${window.location.host}/api/ws`
        : `ws://localhost:3001/ws`
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        // Send authentication
        ws.send(JSON.stringify({
          type: 'auth',
          token: session.user.id,
          tenantId: session.user.tenantId
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'notification') {
            handleNewNotification(data.notification)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, 5000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      // Fallback to polling
      startPolling()
    }
  }

  const startPolling = () => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      })
    }

    // Play notification sound (optional)
    playNotificationSound()
  }

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {
        // Ignore errors if audio can't be played
      })
    } catch (error) {
      // Ignore audio errors
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_booked':
      case 'appointment_cancelled':
        return Calendar
      case 'payment_received':
        return DollarSign
      case 'review_received':
        return User
      case 'system_alert':
        return AlertCircle
      default:
        return Bell
    }
  }

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'high') return 'text-red-500'
    if (priority === 'medium') return 'text-yellow-500'
    
    switch (type) {
      case 'appointment_booked':
        return 'text-green-500'
      case 'appointment_cancelled':
        return 'text-red-500'
      case 'payment_received':
        return 'text-green-500'
      case 'review_received':
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("relative", className)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type)
                    const iconColor = getNotificationColor(notification.type, notification.priority)
                    
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100",
                          !notification.read && "bg-blue-50"
                        )}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <Icon className={cn("h-4 w-4 mt-1 flex-shrink-0", iconColor)} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium text-gray-900",
                                !notification.read && "font-semibold"
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1 ml-2">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
