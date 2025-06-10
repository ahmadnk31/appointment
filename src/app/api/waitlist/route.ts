import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addDays, addHours } from 'date-fns';

// Validation schema for waitlist entries
const createWaitlistSchema = z.object({
  serviceId: z.string(),
  providerId: z.string().optional(),
  preferredDate: z.string().datetime().optional(),
  preferredTimeSlot: z.string().optional(), // "morning", "afternoon", "evening", or "HH:mm-HH:mm"
  flexibleDates: z.boolean().default(false),
  flexibleTimes: z.boolean().default(false),
  notes: z.string().optional(),
  priority: z.number().min(1).max(10).default(1),
});

const updateWaitlistSchema = z.object({
  status: z.enum(['ACTIVE', 'NOTIFIED', 'BOOKED', 'CANCELLED', 'EXPIRED']).optional(),
  preferredDate: z.string().datetime().optional(),
  preferredTimeSlot: z.string().optional(),
  flexibleDates: z.boolean().optional(),
  flexibleTimes: z.boolean().optional(),
  notes: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
});

// GET /api/waitlist - Get waitlist entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const serviceId = searchParams.get('serviceId');
    const providerId = searchParams.get('providerId');

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: any = {
      tenantId: user.tenantId,
    };

    // Role-based filtering
    if (user.role === 'PROVIDER') {
      where.providerId = session.user.id;
    } else if (user.role === 'CLIENT') {
      where.clientId = session.user.id;
    }

    // Additional filters
    if (status) {
      where.status = status.toUpperCase();
    }

    if (serviceId) {
      where.serviceId = serviceId;
    }

    if (providerId && user.role === 'ADMIN') {
      where.providerId = providerId;
    }

    const [waitlistEntries, total] = await Promise.all([
      prisma.waitlist.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true }
          },
          provider: {
            select: { id: true, name: true, email: true }
          },
          service: {
            select: { id: true, name: true, duration: true, price: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.waitlist.count({ where })
    ]);

    return NextResponse.json({
      waitlistEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    );
  }
}

// POST /api/waitlist - Add to waitlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createWaitlistSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only clients can join waitlist
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only clients can join waitlist' }, { status: 403 });
    }

    // Verify service exists and belongs to tenant
    const service = await prisma.service.findFirst({
      where: {
        id: data.serviceId,
        tenantId: user.tenantId,
        isActive: true
      },
      include: {
        provider: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Set provider - use specified provider or service default
    const providerId = data.providerId || service.providerId;

    // Verify provider exists
    const provider = await prisma.user.findFirst({
      where: {
        id: providerId,
        tenantId: user.tenantId,
        role: 'PROVIDER'
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check if user is already on waitlist for this service/provider combination
    const existingEntry = await prisma.waitlist.findFirst({
      where: {
        clientId: session.user.id,
        serviceId: data.serviceId,
        providerId,
        status: 'ACTIVE'
      }
    });

    if (existingEntry) {
      return NextResponse.json({ 
        error: 'You are already on the waitlist for this service' 
      }, { status: 400 });
    }

    // Set expiration date (default 30 days from now)
    const expiresAt = addDays(new Date(), 30);

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        tenantId: user.tenantId,
        clientId: session.user.id,
        serviceId: data.serviceId,
        providerId,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
        preferredTimeSlot: data.preferredTimeSlot,
        flexibleDates: data.flexibleDates,
        flexibleTimes: data.flexibleTimes,
        notes: data.notes,
        priority: data.priority,
        expiresAt,
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true }
        },
        provider: {
          select: { id: true, name: true, email: true }
        },
        service: {
          select: { id: true, name: true, duration: true, price: true }
        }
      }
    });

    // Create notification for provider
    await prisma.notification.create({
      data: {
        type: 'waitlist_joined',
        title: 'New Waitlist Entry',
        message: `${waitlistEntry.client.name} joined the waitlist for ${service.name}`,
        userId: providerId,
        tenantId: user.tenantId,
        data: JSON.stringify({
          waitlistId: waitlistEntry.id,
          serviceId: data.serviceId,
          clientName: waitlistEntry.client.name,
          preferredDate: data.preferredDate,
          preferredTimeSlot: data.preferredTimeSlot
        })
      }
    });

    return NextResponse.json({ waitlistEntry }, { status: 201 });

  } catch (error) {
    console.error('Error creating waitlist entry:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create waitlist entry' },
      { status: 500 }
    );
  }
}

// PUT /api/waitlist/notify - Notify waitlist clients of available slots
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { availableSlots, serviceId, providerId } = body;

    if (!availableSlots || !Array.isArray(availableSlots)) {
      return NextResponse.json({ error: 'Available slots required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user || user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Find active waitlist entries
    const where: any = {
      tenantId: user.tenantId,
      status: 'ACTIVE',
      expiresAt: {
        gt: new Date()
      }
    };

    if (serviceId) where.serviceId = serviceId;
    if (providerId) where.providerId = providerId;
    if (user.role === 'PROVIDER') where.providerId = session.user.id;

    const waitlistEntries = await prisma.waitlist.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, email: true }
        },
        service: {
          select: { name: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    let notifiedCount = 0;

    // Notify waitlist clients based on their preferences
    for (const entry of waitlistEntries) {
      let shouldNotify = false;

      // Check if any available slots match their preferences
      for (const slot of availableSlots) {
        const slotDate = new Date(slot.startTime);
        
        // If they have a preferred date, check if it matches
        if (entry.preferredDate) {
          const preferredDate = new Date(entry.preferredDate);
          if (slotDate.toDateString() === preferredDate.toDateString()) {
            shouldNotify = true;
            break;
          }
        }

        // If they're flexible with dates, notify for any slot
        if (entry.flexibleDates) {
          shouldNotify = true;
          break;
        }

        // Check time slot preferences
        if (entry.preferredTimeSlot && !entry.flexibleTimes) {
          const slotHour = slotDate.getHours();
          
          if (entry.preferredTimeSlot === 'morning' && slotHour >= 6 && slotHour < 12) {
            shouldNotify = true;
            break;
          } else if (entry.preferredTimeSlot === 'afternoon' && slotHour >= 12 && slotHour < 17) {
            shouldNotify = true;
            break;
          } else if (entry.preferredTimeSlot === 'evening' && slotHour >= 17 && slotHour < 22) {
            shouldNotify = true;
            break;
          }
        }
      }

      if (shouldNotify && !entry.notificationSent) {
        // Update waitlist entry status
        await prisma.waitlist.update({
          where: { id: entry.id },
          data: {
            status: 'NOTIFIED',
            notificationSent: true,
            notifiedAt: new Date()
          }
        });

        // Create notification for client
        await prisma.notification.create({
          data: {
            type: 'waitlist_slot_available',
            title: 'Appointment Slot Available',
            message: `A slot is now available for ${entry.service.name}. Book now!`,
            userId: entry.clientId,
            tenantId: user.tenantId,
            priority: 'high',
            data: JSON.stringify({
              waitlistId: entry.id,
              serviceId: entry.serviceId,
              providerId: entry.providerId,
              availableSlots: availableSlots.slice(0, 3) // Send first 3 slots
            })
          }
        });

        notifiedCount++;
      }
    }

    return NextResponse.json({
      notifiedCount,
      message: `${notifiedCount} clients were notified of available slots`
    });

  } catch (error) {
    console.error('Error notifying waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to notify waitlist' },
      { status: 500 }
    );
  }
}
