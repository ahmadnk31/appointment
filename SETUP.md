# Appointment SaaS - Multi-Tenant Booking System

A complete appointment booking SaaS built with Next.js, Prisma, PostgreSQL, and AWS SES for email notifications.

## Features

- **Multi-tenant architecture** - Support multiple businesses
- **Role-based access control** - Admin, Provider, and Client roles
- **Appointment management** - Create, update, cancel appointments
- **Service management** - Manage appointment types and pricing
- **Email notifications** - Automated confirmations via AWS SES
- **Real-time updates** - Instant appointment status changes
- **Responsive design** - Works on desktop and mobile
- **Demo data** - Pre-configured demo accounts for testing

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with credentials provider
- **Email**: AWS SES for notifications
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- AWS account (for SES email service)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd a1
   npm install
   ```

2. **Set up PostgreSQL database**
   Create a PostgreSQL database and note the connection string.

3. **Configure environment variables**
   Update the `.env` file with your settings:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/appointment_saas?schema=public"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # AWS SES Configuration
   AWS_REGION="us-east-1"
   AWS_ACCESS_KEY_ID="your-aws-access-key"
   AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
   SES_SENDER_EMAIL="noreply@yourdomain.com"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push the schema to your database
   npm run db:push
   
   # Seed with demo data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Accounts

The system comes with pre-configured demo accounts:

### Admin Account
- **Email**: admin@demo-clinic.com
- **Password**: demo123
- **Access**: Full system management, view all appointments, manage users

### Provider Account
- **Email**: dr.smith@demo-clinic.com
- **Password**: demo123
- **Access**: Manage own services and appointments, view assigned clients

### Client Account
- **Email**: john.doe@example.com
- **Password**: demo123
- **Access**: Book appointments, view own bookings

## AWS SES Setup

To enable email notifications:

1. **Create AWS account** and navigate to SES service
2. **Verify your domain** or email address in SES
3. **Create IAM user** with SES sending permissions
4. **Get access keys** and add to environment variables
5. **Request production access** (if needed) to send to any email

## Database Schema

The system uses a multi-tenant architecture with the following main entities:

- **Tenants** - Business organizations
- **Users** - Admin, Provider, and Client users
- **Services** - Appointment types offered by providers
- **Appointments** - Bookings between clients and providers
- **Settings** - Tenant-specific configuration

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signout` - User sign out

### Appointments
- `GET /api/appointments` - List appointments (supports ?clientId= for filtering)
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/[id]` - Update appointment
- `DELETE /api/appointments/[id]` - Delete appointment

### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service

### Users
- `GET /api/users` - List users (filtered by role)

## User Roles

### Admin
- Full access to tenant data
- User management
- System configuration
- All appointment operations

### Provider
- Manage own services
- View assigned appointments
- Update appointment status
- Access client information

### Client
- Book appointments
- View own bookings
- Cancel/reschedule appointments
- Receive email notifications

## Email Notifications

The system automatically sends emails for:
- **Appointment confirmations** - When booking is created
- **Appointment cancellations** - When booking is cancelled
- **Appointment reminders** - Configurable timing

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with demo data
- `npm run db:reset` - Reset database and reseed

### Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── page.tsx           # Landing page
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── email.ts          # AWS SES email service
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # General utilities
└── types/                 # TypeScript type definitions
```

## Production Deployment

1. **Database**: Use a managed PostgreSQL service (AWS RDS, Supabase, etc.)
2. **Hosting**: Deploy to Vercel, Netlify, or your preferred platform
3. **Environment**: Set production environment variables
4. **AWS SES**: Ensure production access for email sending
5. **Domain**: Configure custom domain and SSL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is for demonstration purposes. Modify as needed for your use case.

## Support

For questions or issues:
1. Check the demo accounts work correctly
2. Verify database connection
3. Confirm AWS SES configuration
4. Review console logs for errors

The system is designed to be a complete MVP for appointment booking with multi-tenant support. Extend as needed for your specific business requirements.
