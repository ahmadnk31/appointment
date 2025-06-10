# Payment and Cancellation System Documentation

## Overview
This system supports both cash and online payments via Stripe, along with intelligent appointment cancellation with configurable refund policies.

## Payment Features

### Payment Methods
- **Cash Payments**: Handled in-shop, payment status tracked in system
- **Online Payments**: Stripe integration with secure payment processing

### Payment Flow
1. **Appointment Creation**: User selects payment method during booking
2. **Cash Flow**: Appointment confirmed, payment marked as pending
3. **Online Flow**: Payment intent created, user redirected to Stripe, webhook confirms payment

### Payment Configuration
```javascript
// In tenant settings
paymentSettings: {
  enablePayments: true,
  acceptCash: true,
  acceptOnline: true,
  currency: 'USD',
  requirePaymentUpfront: false,
  stripeSettings: {
    publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  }
}
```

## Cancellation Features

### Cancellation Policies
- **Time-based restrictions**: Configure cancellation deadline (e.g., 24 hours before)
- **Refund policies**: Full refund, partial refund, or no refund
- **Reason collection**: Optional or required cancellation reasons

### Cancellation Flow
1. **Validation**: Check if cancellation is allowed based on time and policy
2. **Refund Calculation**: Calculate refund amount based on policy
3. **Payment Processing**: Process Stripe refund for online payments
4. **Notifications**: Send emails to client and provider

### Cancellation Configuration
```javascript
// In tenant settings
cancellationSettings: {
  allowCancellation: true,
  cancellationDeadlineHours: 24,
  refundPolicy: 'full', // 'full', 'partial', 'none'
  partialRefundPercentage: 50,
  requireReason: true,
  notifyProvider: true,
  notifyClient: true
}
```

## API Endpoints

### Payment APIs
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/webhook` - Handle Stripe webhooks
- `GET /api/appointments/[id]/payment-status` - Check payment status

### Cancellation APIs
- `POST /api/appointments/[id]/cancel` - Cancel appointment with refund processing

### Public Booking API
- `POST /api/appointments/public` - Create appointment with payment method selection

## Environment Variables Required

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Email (AWS SES)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
SES_FROM_EMAIL=...
```

## Database Schema Updates

### Appointment Model Additions
```prisma
model Appointment {
  // Payment fields
  paymentMethod PaymentMethod @default(CASH)
  paymentStatus PaymentStatus @default(PENDING)
  paymentAmount Float?
  stripePaymentIntentId String?
  stripeChargeId String?
  
  // Cancellation fields
  refundAmount Float?
  refundReason String?
  cancellationReason String?
  cancelledAt DateTime?
  
  // ...existing fields
}

enum PaymentMethod {
  CASH
  ONLINE
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}
```

## UI Components

### PaymentForm Component
- Handles Stripe Elements integration
- Secure card input and processing
- Redirect to success page after payment

### CancelAppointmentButton Component
- Time validation for cancellation eligibility
- Refund calculation display
- Reason collection dialog
- Confirmation with refund details

## Testing

### Test Payment Flow
1. Create appointment with online payment
2. Complete Stripe payment flow
3. Verify webhook processing
4. Check appointment status update

### Test Cancellation Flow
1. Create confirmed appointment
2. Attempt cancellation within allowed time
3. Verify refund processing
4. Check email notifications

### Run Test Suite
```bash
# Install dependencies
npm install node-fetch

# Run payment and cancellation tests
node test-payment-cancellation.js
```

## Security Considerations

1. **Stripe Keys**: Use test keys for development, live keys for production
2. **Webhook Verification**: All Stripe webhooks are verified using webhook secret
3. **Authorization**: Cancellation requires proper user authorization
4. **Amount Validation**: Payment amounts are validated against service prices

## Deployment Checklist

- [ ] Configure Stripe webhook endpoint in Stripe dashboard
- [ ] Set all required environment variables
- [ ] Test payment flow in production
- [ ] Test webhook delivery
- [ ] Verify email notifications
- [ ] Test cancellation and refund flow

## Troubleshooting

### Common Issues
1. **Webhook not receiving**: Check Stripe webhook URL configuration
2. **Payment not confirming**: Verify webhook secret and endpoint
3. **Cancellation failing**: Check time restrictions and refund policies
4. **Email not sending**: Verify AWS SES configuration and permissions

### Debug Tools
- Stripe Dashboard for payment monitoring
- Application logs for webhook processing
- Database queries for appointment status verification
