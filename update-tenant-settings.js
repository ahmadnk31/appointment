const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateTenantSettings() {
  try {
    console.log('Updating tenant settings...')
    
    // Find the demo-clinic tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: 'demo-clinic' }
    })
    
    if (!tenant) {
      console.error('Demo clinic tenant not found')
      return
    }
    
    // Update tenant settings to enable online booking
    await prisma.tenantSettings.update({
      where: { tenantId: tenant.id },
      data: {
        bookingSettings: {
          enableOnlineBooking: true,
          requireConfirmation: false,
          allowCancellation: true,
          cancellationDeadline: 24,
          bufferTime: 15,
          maxAdvanceBooking: 30,
        }
      }
    })
    
    console.log('Tenant settings updated successfully!')
    console.log('Online booking is now enabled for demo-clinic')
    
  } catch (error) {
    console.error('Error updating tenant settings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateTenantSettings()
