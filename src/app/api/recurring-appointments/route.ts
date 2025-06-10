import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addDays, addWeeks, addMonths, addQuarters, addYears, format, isAfter, isBefore } from 'date-fns';

// Validation schema for recurring appointments
const createRecurringAppointmentSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  interval: z.number().min(1).default(1),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0=Sunday, 6=Saturday
  dayOfMonth: z.number().min(1).max(31).optional(),
  endDate: z.string().datetime().optional(),
  maxOccurrences: z.number().min(1).optional(),
  duration: z.number().min(15),
  notes: z.string().optional(),
  serviceId: z.string(),
  providerId: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'ONLINE']).default('CASH'),
  paymentAmount: z.number().optional(),
  startDate: z.string().datetime(),
  startTime: z.string(), // Format: "HH:mm"
});

const updateRecurringAppointmentSchema = createRecurringAppointmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Helper function to generate appointment dates based on recurrence rules
function generateAppointmentDates(
  startDate: Date,
  frequency: string,
  interval: number,
  daysOfWeek?: number[],
  dayOfMonth?: number,
  endDate?: Date,
  maxOccurrences?: number
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  let count = 0;

  const maxDates = maxOccurrences || 52; // Default to 1 year worth
  const finalEndDate = endDate || addYears(startDate, 2); // Default to 2 years

  while (count < maxDates && isBefore(currentDate, finalEndDate)) {
    // For weekly recurrence, check if current day is in daysOfWeek
    if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
      if (daysOfWeek && daysOfWeek.includes(currentDate.getDay())) {
        dates.push(new Date(currentDate));
        count++;
      }
      currentDate = addDays(currentDate, 1);
      
      // Reset to start of next interval period
      if (currentDate.getDay() === 0) { // Sunday
        const weeksToAdd = frequency === 'BIWEEKLY' ? (interval * 2) - 1 : interval - 1;
        currentDate = addWeeks(currentDate, weeksToAdd);
      }
    } else if (frequency === 'MONTHLY') {
      if (dayOfMonth && currentDate.getDate() === dayOfMonth) {
        dates.push(new Date(currentDate));
        count++;
      }
      currentDate = addMonths(currentDate, interval);
    } else if (frequency === 'DAILY') {
      dates.push(new Date(currentDate));
      count++;
      currentDate = addDays(currentDate, interval);
    } else if (frequency === 'QUARTERLY') {
      dates.push(new Date(currentDate));
      count++;
      currentDate = addQuarters(currentDate, interval);
    } else if (frequency === 'YEARLY') {
      dates.push(new Date(currentDate));
      count++;
      currentDate = addYears(currentDate, interval);
    }
  }

  return dates;
}

// GET /api/recurring-appointments - Get all recurring appointments for tenant
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
    const providerId = searchParams.get('providerId');
    const serviceId = searchParams.get('serviceId');

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
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (providerId) {
      where.providerId = providerId;
    }

    if (serviceId) {
      where.serviceId = serviceId;
    }

    const [recurringAppointments, total] = await Promise.all([
      prisma.recurringAppointment.findMany({
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
          },
          appointments: {
            select: { id: true, startTime: true, status: true },
            orderBy: { startTime: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.recurringAppointment.count({ where })
    ]);

    return NextResponse.json({
      recurringAppointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching recurring appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring appointments' },
      { status: 500 }
    );
  }
}

// POST /api/recurring-appointments - Create new recurring appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createRecurringAppointmentSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify service exists and belongs to tenant
    const service = await prisma.service.findFirst({
      where: {
        id: data.serviceId,
        tenantId: user.tenantId,
        isActive: true
      }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Set provider - if not specified and user is provider, use current user
    let providerId = data.providerId;
    if (!providerId && user.role === 'PROVIDER') {
      providerId = session.user.id;
    } else if (!providerId) {
      providerId = service.providerId;
    }

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

    // Set client ID
    let clientId = session.user.id;
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only clients can create recurring appointments' }, { status: 403 });
    }    // Create recurring appointment
    const recurringAppointment = await prisma.recurringAppointment.create({
      data: {
        frequency: data.frequency,
        interval: data.interval,
        daysOfWeek: data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : null,
        dayOfMonth: data.dayOfMonth,
        endDate: data.endDate ? new Date(data.endDate) : null,
        maxOccurrences: data.maxOccurrences,
        duration: data.duration,
        notes: data.notes,
        tenantId: user.tenantId,
        clientId,
        providerId,
        serviceId: data.serviceId,
        paymentMethod: data.paymentMethod,
        paymentAmount: data.paymentAmount || service.price,
      },
      include: {
        client: {
          select: { id: true, name: true, email: true }
        },
        provider: {
          select: { id: true, name: true, email: true }
        },
        service: {
          select: { id: true, name: true, duration: true, price: true }
        }
      }
    });

    // Generate initial set of appointments (next 3 months)
    const startDate = new Date(data.startDate);
    const [hours, minutes] = data.startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);

    const appointmentDates = generateAppointmentDates(
      startDate,
      data.frequency,
      data.interval,
      data.daysOfWeek,
      data.dayOfMonth,
      data.endDate ? new Date(data.endDate) : addMonths(new Date(), 3),
      data.maxOccurrences ? Math.min(data.maxOccurrences, 20) : 20
    );

    // Create individual appointments
    const appointments = await Promise.all(
      appointmentDates.map(date => {
        const endTime = new Date(date);
        endTime.setMinutes(endTime.getMinutes() + data.duration);        return prisma.appointment.create({
          data: {
            startTime: date,
            endTime,
            notes: data.notes,
            tenantId: user.tenantId,
            clientId,
            providerId,
            serviceId: data.serviceId,
            recurringAppointmentId: recurringAppointment.id,
            paymentMethod: data.paymentMethod,
            paymentAmount: data.paymentAmount || service.price,
          }
        });
      })
    );

    // Create notification for provider
    await prisma.notification.create({
      data: {
        type: 'recurring_appointment_created',
        title: 'New Recurring Appointment',
        message: `${recurringAppointment.client.name} has created a recurring appointment for ${service.name}`,
        userId: providerId,
        tenantId: user.tenantId,
        data: JSON.stringify({
          recurringAppointmentId: recurringAppointment.id,
          appointmentCount: appointments.length
        })
      }
    });

    return NextResponse.json({
      recurringAppointment,
      generatedAppointments: appointments.length
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating recurring appointment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create recurring appointment' },
      { status: 500 }
    );
  }
}
