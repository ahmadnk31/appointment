# Appointment Booking SaaS - Multi-Tenant System

A comprehensive multi-tenant appointment booking system built with Next.js 15, featuring payment processing, email notifications, and Google Calendar integration.

## 🌟 Features

### Core Features
- **Multi-tenant Architecture** - Support for multiple businesses with isolated data
- **Role-based Access Control** - Admin, Provider, and Client roles with appropriate permissions
- **Public Booking System** - Allow clients to book appointments without registration
- **Dashboard Management** - Complete appointment, service, and user management
- **Real-time Availability** - Dynamic availability checking with conflict prevention
- **Email Notifications** - Automated confirmation, reminder, and cancellation emails
- **Payment Processing** - Stripe integration for online payments
- **Cancellation System** - Flexible cancellation policies with refund management

### Google Calendar Integration ✨
- **Automatic Event Creation** - Calendar events created when appointments are booked
- **Event Synchronization** - Updates sync between the system and Google Calendar
- **Smart Event Details** - Rich event descriptions with appointment information
- **Attendee Management** - Both client and provider added as attendees
- **Reminder Setup** - Automatic email and popup reminders
- **Error Resilience** - Calendar failures don't prevent appointment operations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Stripe account (for payments)
- AWS account (for email via SES)
- Google Cloud account (optional, for calendar integration)

### Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd a1
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. **Database Setup**
```bash
npm run db:push
npm run db:seed
```

4. **Start Development Server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📋 Environment Configuration

### Required Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/appointment_db"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# AWS SES (Email)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
SES_FROM_EMAIL="noreply@yourdomain.com"

# Stripe (Payments)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Optional: Google Calendar Integration
```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_REFRESH_TOKEN="your-google-refresh-token"
GOOGLE_ACCESS_TOKEN="your-google-access-token"
```

## 🔧 Google Calendar Setup

For detailed Google Calendar integration setup, see [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md).

**Quick Setup:**
1. Create a Google Cloud project and enable Calendar API
2. Set up OAuth 2.0 credentials
3. Visit `/api/calendar/setup` to get your tokens
4. Add tokens to your environment variables
5. Restart the application

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Email**: AWS SES
- **Calendar**: Google Calendar API
- **File Storage**: AWS S3

### Database Schema
- **Tenants** - Business organizations
- **Users** - Admin, Provider, and Client users  
- **Services** - Appointment types offered by providers
- **Appointments** - Bookings with payment and calendar integration
- **Settings** - Tenant-specific configuration

## 📚 API Documentation

### Appointment Endpoints
- `GET /api/appointments` - List appointments (with filtering)
- `POST /api/appointments` - Create appointment (authenticated)
- `PUT /api/appointments/[id]` - Update appointment
- `DELETE /api/appointments/[id]` - Delete appointment
- `POST /api/appointments/public` - Public booking (no auth)

### Calendar Integration
- `GET /api/calendar/setup` - OAuth setup for calendar integration

### Other Endpoints
- `GET /api/services` - List services
- `GET /api/users` - List users (by role)
- `GET /api/appointments/availability` - Check availability

## 🎯 Usage Examples

### Public Booking Flow
1. Client visits tenant's public booking page
2. Selects service and provider
3. Chooses available time slot
4. Enters contact information
5. Completes payment (if required)
6. Receives confirmation email
7. Calendar event automatically created

### Dashboard Management
1. Provider/Admin logs into dashboard
2. Views upcoming appointments
3. Creates, updates, or cancels appointments
4. Calendar events sync automatically
5. Email notifications sent to clients

## 🔄 Google Calendar Workflow

### Appointment Creation
```javascript
// When appointment is created
const calendarEventId = await calendarService.createAppointmentEvent({
  title: `${service.name} - ${client.name}`,
  description: `Appointment details...`,
  startTime: appointment.startTime,
  endTime: appointment.endTime,
  attendees: [client.email, provider.email],
  location: tenant.name,
})

// Store event ID in appointment record
await prisma.appointment.update({
  where: { id: appointment.id },
  data: { calendarEventId }
})
```

### Appointment Updates
- Time changes → Calendar event updated
- Cancellation → Calendar event deleted
- Status changes → Event description updated

## 🧪 Testing

### Test the System
```bash
# Run the test script
npm run test-system

# Test specific endpoints
npm run test-api
npm run test-services
npm run test-availability
```

### Demo Data
The seed script creates:
- Demo tenant (HealthCare Plus)
- Test users (admin, providers, clients)
- Sample services and appointments
- Default tenant settings

Login credentials:
- **Admin**: admin@healthcare-plus.com / password123
- **Provider**: dr.smith@healthcare-plus.com / password123
- **Client**: john.doe@example.com / password123

## 📝 Key Features Explained

### Multi-Tenant Support
- Each tenant has isolated data and settings
- Custom domains and branding support
- Tenant-specific booking configurations

### Booking Rules
- Configurable working hours
- Buffer time between appointments
- Advance booking limits
- Cancellation policies

### Payment Integration
- Online payments via Stripe
- Cash payment support
- Refund management
- Payment status tracking

### Email Notifications
- Appointment confirmations
- Reminder emails (24h before)
- Cancellation notifications
- Status update alerts

### Calendar Integration Benefits
- **Automatic Synchronization**: No manual calendar entry needed
- **Conflict Prevention**: Real-time availability checking
- **Professional Experience**: Clients and providers get calendar invites
- **Reminder Management**: Built-in email and popup reminders
- **Multi-Platform Access**: Events available on all calendar-enabled devices

## 🚦 Production Deployment

### Environment Setup
1. Set production environment variables
2. Configure production database
3. Set up Stripe webhooks
4. Configure AWS SES with verified domain
5. Update Google Calendar OAuth settings

### Security Checklist
- [ ] Secure environment variables
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up proper OAuth consent screen
- [ ] Implement rate limiting
- [ ] Enable audit logging

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema changes
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed database

### File Structure
```
src/
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # Admin dashboard
│   └── book/         # Public booking
├── components/        # Reusable components
├── lib/              # Utilities and services
│   ├── calendar.ts   # Google Calendar integration
│   ├── email.ts      # Email service
│   └── stripe.ts     # Payment processing
└── types/            # TypeScript definitions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or issues:
1. Check the setup guides (SETUP.md, GOOGLE_CALENDAR_SETUP.md)
2. Review the payment guide (PAYMENT_CANCELLATION_GUIDE.md)
3. Check application logs for error details
4. Ensure all environment variables are properly configured

## 🎉 What's New

### Google Calendar Integration
- ✅ Automatic event creation on appointment booking
- ✅ Event synchronization on appointment updates
- ✅ Event deletion on appointment cancellation
- ✅ Rich event descriptions with appointment details
- ✅ Attendee management for clients and providers
- ✅ Configurable reminders (email + popup)
- ✅ Error handling and fallback behavior
- ✅ Easy OAuth setup with guided flow
