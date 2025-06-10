import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateRecurringAppointmentSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  interval: z.number().min(1).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  endDate: z.string().datetime().optional(),
  maxOccurrences: z.number().min(1).optional(),
  duration: z.number().min(15).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  paymentMethod: z.enum(['CASH', 'ONLINE']).optional(),
  paymentAmount: z.number().optional(),
});

// GET /api/recurring-appointments/[id] - Get specific recurring appointment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: any = {
      id: params.id,
      tenantId: user.tenantId,
    };

    // Role-based access control
    if (user.role === 'PROVIDER') {
      where.providerId = session.user.id;
    } else if (user.role === 'CLIENT') {
      where.clientId = session.user.id;
    }

    const recurringAppointment = await prisma.recurringAppointment.findFirst({
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
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            notes: true,
            paymentStatus: true
          },
          orderBy: { startTime: 'asc' }
        }
      }
    });

    if (!recurringAppointment) {
      return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ recurringAppointment });

  } catch (error) {
    console.error('Error fetching recurring appointment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring appointment' },
      { status: 500 }
    );
  }
}

// PUT /api/recurring-appointments/[id] - Update recurring appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updateRecurringAppointmentSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find existing recurring appointment
    const existingRecurring = await prisma.recurringAppointment.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenantId,
        ...(user.role === 'CLIENT' ? { clientId: session.user.id } : {}),
        ...(user.role === 'PROVIDER' ? { providerId: session.user.id } : {})
      },
      include: {
        client: { select: { name: true, email: true } },
        provider: { select: { name: true, email: true } },
        service: { select: { name: true } }
      }
    });

    if (!existingRecurring) {
      return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 });
    }

    // Update recurring appointment
    const updateData: any = {};
    
    if (data.frequency) updateData.frequency = data.frequency;
    if (data.interval) updateData.interval = data.interval;
    if (data.daysOfWeek) updateData.daysOfWeek = JSON.stringify(data.daysOfWeek);
    if (data.dayOfMonth) updateData.dayOfMonth = data.dayOfMonth;
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.maxOccurrences) updateData.maxOccurrences = data.maxOccurrences;
    if (data.duration) updateData.duration = data.duration;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;
    if (data.paymentAmount) updateData.paymentAmount = data.paymentAmount;

    const updatedRecurring = await prisma.recurringAppointment.update({
      where: { id: params.id },
      data: updateData,
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

    // If deactivating, cancel all future appointments
    if (data.isActive === false) {
      await prisma.appointment.updateMany({
        where: {
          recurringAppointmentId: params.id,
          startTime: {
            gte: new Date()
          },
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'Recurring appointment deactivated',
          cancelledAt: new Date()
        }
      });
    }

    // Create notification
    const notificationMessage = data.isActive === false 
      ? `Recurring appointment for ${existingRecurring.service.name} has been deactivated`
      : `Recurring appointment for ${existingRecurring.service.name} has been updated`;

    await prisma.notification.create({
      data: {
        type: 'recurring_appointment_updated',
        title: 'Recurring Appointment Updated',
        message: notificationMessage,
        userId: user.role === 'CLIENT' ? existingRecurring.providerId : existingRecurring.clientId,
        tenantId: user.tenantId,
        data: JSON.stringify({
          recurringAppointmentId: params.id,
          changes: Object.keys(updateData)
        })
      }
    });

    return NextResponse.json({ recurringAppointment: updatedRecurring });

  } catch (error) {
    console.error('Error updating recurring appointment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update recurring appointment' },
      { status: 500 }
    );
  }
}

// DELETE /api/recurring-appointments/[id] - Delete recurring appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find existing recurring appointment
    const existingRecurring = await prisma.recurringAppointment.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenantId,
        ...(user.role === 'CLIENT' ? { clientId: session.user.id } : {}),
        ...(user.role === 'PROVIDER' ? { providerId: session.user.id } : {})
      },
      include: {
        client: { select: { name: true, email: true } },
        provider: { select: { name: true, email: true } },
        service: { select: { name: true } }
      }
    });

    if (!existingRecurring) {
      return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 });
    }

    // Cancel all future appointments first
    await prisma.appointment.updateMany({
      where: {
        recurringAppointmentId: params.id,
        startTime: {
          gte: new Date()
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      data: {
        status: 'CANCELLED',
        cancellationReason: 'Recurring appointment deleted',
        cancelledAt: new Date()
      }
    });

    // Delete the recurring appointment
    await prisma.recurringAppointment.delete({
      where: { id: params.id }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'recurring_appointment_deleted',
        title: 'Recurring Appointment Deleted',
        message: `Recurring appointment for ${existingRecurring.service.name} has been deleted`,
        userId: user.role === 'CLIENT' ? existingRecurring.providerId : existingRecurring.clientId,
        tenantId: user.tenantId,
        data: JSON.stringify({
          recurringAppointmentId: params.id,
          serviceName: existingRecurring.service.name
        })
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Recurring appointment deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting recurring appointment:', error);
    return NextResponse.json(
      { error: 'Failed to delete recurring appointment' },
      { status: 500 }
    );
  }
}
