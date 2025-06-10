import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Clinic',
      slug: 'demo-clinic',
      domain: 'demo-clinic.localhost',
    },
  })

  // Create tenant settings
  await prisma.tenantSettings.create({
    data: {
      tenantId: tenant.id,
      businessName: 'Demo Clinic',
      businessEmail: 'info@demo-clinic.com',
      businessPhone: '+1-555-0123',
      businessAddress: '123 Main St, Demo City, DC 12345',
      timeZone: 'America/New_York',
      workingHours: {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '10:00', end: '14:00', enabled: true },
        sunday: { start: '10:00', end: '14:00', enabled: false },
      },      bookingSettings: {
        enableOnlineBooking: true,
        requireConfirmation: false,
        allowCancellation: true,
        cancellationDeadline: 24,
        bufferTime: 15,
        maxAdvanceBooking: 30,
        advanceBookingDays: 30,
        minimumNoticeHours: 24,
        cancellationHours: 24,
      },      emailSettings: {
        sendConfirmation: true,
        sendReminder: true,
        reminderHours: 24,
        sendCancellation: true,
      },
      paymentSettings: {
        enablePayments: true,
        acceptCash: true,
        acceptOnline: true,
        currency: 'USD',
        requirePaymentUpfront: false,
        stripeSettings: {
          publicKey: '',
          secretKey: '',
          webhookSecret: ''
        }
      },
      cancellationSettings: {
        allowCancellation: true,
        cancellationDeadlineHours: 24,
        refundPolicy: 'full',
        partialRefundPercentage: 50,
        requireReason: true,
        notifyProvider: true,
        notifyClient: true
      },
    },
  })

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('demo123', 10)

  // Create demo admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo-clinic.com',
      password: hashedPassword,
      name: 'Admin User',
      phone: '+1-555-0101',
      role: UserRole.ADMIN,
      tenantId: tenant.id,
      emailVerified: new Date(),
    },
  })

  // Create demo provider users
  const provider1 = await prisma.user.create({
    data: {
      email: 'dr.smith@demo-clinic.com',
      password: hashedPassword,
      name: 'Dr. John Smith',
      phone: '+1-555-0102',
      role: UserRole.PROVIDER,
      tenantId: tenant.id,
      emailVerified: new Date(),
    },
  })

  const provider2 = await prisma.user.create({
    data: {
      email: 'dr.johnson@demo-clinic.com',
      password: hashedPassword,
      name: 'Dr. Sarah Johnson',
      phone: '+1-555-0103',
      role: UserRole.PROVIDER,
      tenantId: tenant.id,
      emailVerified: new Date(),
    },
  })

  // Create demo client users
  const client1 = await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      password: hashedPassword,
      name: 'John Doe',
      phone: '+1-555-0201',
      role: UserRole.CLIENT,
      tenantId: tenant.id,
      emailVerified: new Date(),
    },
  })

  const client2 = await prisma.user.create({
    data: {
      email: 'jane.doe@example.com',
      password: hashedPassword,
      name: 'Jane Doe',
      phone: '+1-555-0202',
      role: UserRole.CLIENT,
      tenantId: tenant.id,
      emailVerified: new Date(),
    },
  })

  // Create demo services
  const service1 = await prisma.service.create({
    data: {
      name: 'General Consultation',
      description: 'General medical consultation and examination',
      duration: 30,
      price: 150.00,
      tenantId: tenant.id,
      providerId: provider1.id,
    },
  })

  const service2 = await prisma.service.create({
    data: {
      name: 'Specialist Consultation',
      description: 'Specialized medical consultation',
      duration: 45,
      price: 200.00,
      tenantId: tenant.id,
      providerId: provider1.id,
    },
  })

  const service3 = await prisma.service.create({
    data: {
      name: 'Dental Checkup',
      description: 'Regular dental examination and cleaning',
      duration: 60,
      price: 120.00,
      tenantId: tenant.id,
      providerId: provider2.id,
    },
  })

  const service4 = await prisma.service.create({
    data: {
      name: 'Dental Treatment',
      description: 'Dental treatment and procedures',
      duration: 90,
      price: 300.00,
      tenantId: tenant.id,
      providerId: provider2.id,
    },
  })

  // Create demo appointments
  // Today's appointments for testing
  const today1 = new Date()
  today1.setHours(9, 0, 0, 0)
  const today1EndTime = new Date(today1)
  today1EndTime.setMinutes(today1EndTime.getMinutes() + service1.duration)

  await prisma.appointment.create({
    data: {
      startTime: today1,
      endTime: today1EndTime,
      status: 'CONFIRMED',
      notes: 'Today morning appointment',
      tenantId: tenant.id,
      clientId: client1.id,
      providerId: provider1.id,
      serviceId: service1.id,
    },
  })

  const today2 = new Date()
  today2.setHours(14, 0, 0, 0)
  const today2EndTime = new Date(today2)
  today2EndTime.setMinutes(today2EndTime.getMinutes() + service2.duration)

  await prisma.appointment.create({
    data: {
      startTime: today2,
      endTime: today2EndTime,
      status: 'PENDING',
      notes: 'Today afternoon appointment',
      tenantId: tenant.id,
      clientId: client2.id,
      providerId: provider1.id,
      serviceId: service2.id,
    },
  })

  const today3 = new Date()
  today3.setHours(16, 30, 0, 0)
  const today3EndTime = new Date(today3)
  today3EndTime.setMinutes(today3EndTime.getMinutes() + service3.duration)

  await prisma.appointment.create({
    data: {
      startTime: today3,
      endTime: today3EndTime,
      status: 'CONFIRMED',
      notes: 'Today evening appointment',
      tenantId: tenant.id,
      clientId: client1.id,
      providerId: provider2.id,
      serviceId: service3.id,
    },
  })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const appointment1EndTime = new Date(tomorrow)
  appointment1EndTime.setMinutes(appointment1EndTime.getMinutes() + service1.duration)

  await prisma.appointment.create({
    data: {
      startTime: tomorrow,
      endTime: appointment1EndTime,
      status: 'CONFIRMED',
      notes: 'Regular checkup appointment',
      tenantId: tenant.id,
      clientId: client1.id,
      providerId: provider1.id,
      serviceId: service1.id,
    },
  })

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(14, 0, 0, 0)

  const appointment2EndTime = new Date(nextWeek)
  appointment2EndTime.setMinutes(appointment2EndTime.getMinutes() + service3.duration)

  await prisma.appointment.create({
    data: {
      startTime: nextWeek,
      endTime: appointment2EndTime,
      status: 'PENDING',
      notes: 'Dental cleaning appointment',
      tenantId: tenant.id,
      clientId: client2.id,
      providerId: provider2.id,
      serviceId: service3.id,
    },
  })

  console.log('Seed completed successfully!')
  console.log('\nDemo Users Created:')
  console.log('Admin: admin@demo-clinic.com / demo123')
  console.log('Provider 1: dr.smith@demo-clinic.com / demo123')
  console.log('Provider 2: dr.johnson@demo-clinic.com / demo123')
  console.log('Client 1: john.doe@example.com / demo123')
  console.log('Client 2: jane.doe@example.com / demo123')
  console.log('\nTenant: Demo Clinic (demo-clinic)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
