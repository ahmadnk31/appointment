'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  Home,
  Clock,
  Plus,
  List,
  UserPlus,
  Building2
} from 'lucide-react'

const getNavigationItems = (role: string) => {
  const baseItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['ADMIN', 'PROVIDER', 'CLIENT']
    }
  ]
  if (role === 'ADMIN') {
    return [
      ...baseItems,
      {
        label: 'All Appointments',
        href: '/dashboard/appointments',
        icon: Calendar,
        roles: ['ADMIN']
      },
      {
        label: 'Manage Services',
        href: '/dashboard/services',
        icon: Settings,
        roles: ['ADMIN']
      },
      {
        label: 'Manage Users',
        href: '/dashboard/users',
        icon: Users,
        roles: ['ADMIN']
      },
      {
        label: 'Tenant Management',
        href: '/dashboard/tenants',
        icon: Building2,
        roles: ['ADMIN']
      },
      {
        label: 'Tenant Settings',
        href: '/dashboard/settings',
        icon: Settings,
        roles: ['ADMIN']
      }
    ]
  }

  if (role === 'PROVIDER') {
    return [
      ...baseItems,
      {
        label: 'My Appointments',
        href: '/dashboard/appointments',
        icon: Calendar,
        roles: ['PROVIDER']
      },
      {
        label: 'My Services',
        href: '/dashboard/services',
        icon: Settings,
        roles: ['PROVIDER']
      },
      {
        label: 'My Clients',
        href: '/dashboard/clients',
        icon: Users,
        roles: ['PROVIDER']
      },
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
        roles: ['PROVIDER']
      }
    ]
  }

  if (role === 'CLIENT') {
    return [
      ...baseItems,
      {
        label: 'Book Appointment',
        href: '/dashboard/book',
        icon: Plus,
        roles: ['CLIENT']
      },
      {
        label: 'My Appointments',
        href: '/dashboard/my-appointments',
        icon: List,
        roles: ['CLIENT']
      }
    ]
  }

  return baseItems
}

export function DashboardSidebar({ onItemClick }: { onItemClick?: () => void }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  if (!session?.user) return null

  const navigationItems = getNavigationItems(session.user.role)
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'PROVIDER':
        return 'bg-blue-100 text-blue-800'
      case 'CLIENT':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }
  return (
    <div className="w-64 bg-white shadow-lg flex flex-col h-full">
      {/* Header - Hide on mobile since we have it in layout */}
      <div className="p-6 border-b hidden lg:block">
        <div className="flex items-center space-x-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">AppointmentSaaS</span>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 lg:p-6 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
            <AvatarImage src={session.user.image || undefined} />
            <AvatarFallback className="text-xs lg:text-sm">
              {session.user.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {session.user.email}
            </p>
            <span className={cn(
              'inline-block px-2 py-1 text-xs font-medium rounded-full mt-1',
              getRoleColor(session.user.role)
            )}>
              {session.user.role}
            </span>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            Tenant: {session.user.tenantName}
          </p>
        </div>
      </div>      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link key={item.href} href={item.href} onClick={onItemClick}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-blue-600 text-white"
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
