import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

interface EmailParams {
  to: string[]
  subject: string
  htmlBody: string
  textBody?: string
}

export class EmailService {
  private static instance: EmailService
  private senderEmail = process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com'

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendEmail({ to, subject, htmlBody, textBody }: EmailParams) {
    try {
      const params = {
        Source: this.senderEmail,
        Destination: {
          ToAddresses: to,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            ...(textBody && {
              Text: {
                Data: textBody,
                Charset: 'UTF-8',
              },
            }),
          },
        },
      }

      const command = new SendEmailCommand(params)
      const result = await sesClient.send(command)
      
      console.log('Email sent successfully:', result.MessageId)
      return { success: true, messageId: result.MessageId }
    } catch (error) {
      console.error('Error sending email:', error)
      return { success: false, error: error }
    }
  }

  // Appointment confirmation email
  async sendAppointmentConfirmation(
    clientEmail: string,
    clientName: string,
    appointmentDetails: {
      serviceName: string
      providerName: string
      startTime: Date
      endTime: Date
      tenantName: string
    }
  ) {
    const { serviceName, providerName, startTime, endTime, tenantName } = appointmentDetails
    
    const subject = `Appointment Confirmation - ${serviceName}`
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .appointment-details { background-color: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Confirmed!</h1>
            </div>
            
            <p>Dear ${clientName},</p>
            
            <p>Your appointment has been successfully booked with ${tenantName}.</p>
            
            <div class="appointment-details">
              <h3>Appointment Details:</h3>
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Provider:</strong> ${providerName}</p>
              <p><strong>Date & Time:</strong> ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}</p>
              <p><strong>Duration:</strong> ${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes</p>
            </div>
            
            <p>Please arrive 10 minutes early for your appointment. If you need to reschedule or cancel, please contact us as soon as possible.</p>
            
            <div class="footer">
              <p>Thank you for choosing ${tenantName}!</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: [clientEmail],
      subject,
      htmlBody,
      textBody: `Appointment Confirmed!\n\nDear ${clientName},\n\nYour appointment has been successfully booked.\n\nService: ${serviceName}\nProvider: ${providerName}\nDate & Time: ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}\n\nThank you!`
    })
  }

  // Appointment cancellation email
  async sendAppointmentCancellation(
    clientEmail: string,
    clientName: string,
    appointmentDetails: {
      serviceName: string
      providerName: string
      startTime: Date
      tenantName: string
    }
  ) {
    const { serviceName, providerName, startTime, tenantName } = appointmentDetails
    
    const subject = `Appointment Cancelled - ${serviceName}`
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .appointment-details { background-color: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Cancelled</h1>
            </div>
            
            <p>Dear ${clientName},</p>
            
            <p>Your appointment with ${tenantName} has been cancelled.</p>
            
            <div class="appointment-details">
              <h3>Cancelled Appointment Details:</h3>
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Provider:</strong> ${providerName}</p>
              <p><strong>Date & Time:</strong> ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}</p>
            </div>
            
            <p>If you would like to reschedule, please feel free to book a new appointment.</p>
            
            <div class="footer">
              <p>Thank you for your understanding.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: [clientEmail],
      subject,
      htmlBody,
      textBody: `Appointment Cancelled\n\nDear ${clientName},\n\nYour appointment has been cancelled.\n\nService: ${serviceName}\nProvider: ${providerName}\nDate & Time: ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}\n\nThank you for your understanding.`
    })
  }

  // Payment confirmation email
  async sendPaymentConfirmation(
    clientEmail: string,
    clientName: string,
    appointmentDetails: {
      serviceName: string
      providerName: string
      startTime: Date
      endTime: Date
      tenantName: string
      paymentAmount: number
    }
  ) {
    const { serviceName, providerName, startTime, endTime, tenantName, paymentAmount } = appointmentDetails
    
    const subject = `Payment Confirmed - ${serviceName}`
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #d1edff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .appointment-details { background-color: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .payment-info { background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Confirmed!</h1>
            </div>
            
            <p>Dear ${clientName},</p>
            
            <p>Your payment has been successfully processed and your appointment with ${tenantName} is now confirmed.</p>
            
            <div class="payment-info">
              <h3>Payment Details:</h3>
              <p><strong>Amount Paid:</strong> $${paymentAmount.toFixed(2)}</p>
              <p><strong>Status:</strong> Paid</p>
            </div>
            
            <div class="appointment-details">
              <h3>Appointment Details:</h3>
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Provider:</strong> ${providerName}</p>
              <p><strong>Date & Time:</strong> ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}</p>
              <p><strong>Duration:</strong> ${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes</p>
            </div>
            
            <p>Please arrive 10 minutes early for your appointment. If you need to reschedule or cancel, please contact us as soon as possible.</p>
            
            <div class="footer">
              <p>Thank you for choosing ${tenantName}!</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: [clientEmail],
      subject,
      htmlBody,
      textBody: `Payment Confirmed!\n\nDear ${clientName},\n\nYour payment of $${paymentAmount.toFixed(2)} has been processed and your appointment is confirmed.\n\nService: ${serviceName}\nProvider: ${providerName}\nDate & Time: ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}\n\nThank you!`
    })
  }

  // Payment failure email
  async sendPaymentFailure(
    clientEmail: string,
    clientName: string,
    appointmentDetails: {
      serviceName: string
      providerName: string
      startTime: Date
      tenantName: string
      paymentAmount: number
    }
  ) {
    const { serviceName, providerName, startTime, tenantName, paymentAmount } = appointmentDetails
    
    const subject = `Payment Failed - ${serviceName}`
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .appointment-details { background-color: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .action-required { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Failed</h1>
            </div>
            
            <p>Dear ${clientName},</p>
            
            <p>Unfortunately, your payment for the appointment with ${tenantName} could not be processed.</p>
            
            <div class="appointment-details">
              <h3>Appointment Details:</h3>
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Provider:</strong> ${providerName}</p>
              <p><strong>Date & Time:</strong> ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}</p>
              <p><strong>Amount:</strong> $${paymentAmount.toFixed(2)}</p>
            </div>
            
            <div class="action-required">
              <h3>Action Required:</h3>
              <p>Your appointment is currently pending payment. Please try again or contact us to complete your booking.</p>
            </div>
            
            <p>If you continue to experience payment issues, please contact us directly and we'll be happy to assist you.</p>
            
            <div class="footer">
              <p>Thank you for your understanding.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: [clientEmail],
      subject,
      htmlBody,
      textBody: `Payment Failed\n\nDear ${clientName},\n\nYour payment for the appointment could not be processed.\n\nService: ${serviceName}\nProvider: ${providerName}\nDate & Time: ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}\nAmount: $${paymentAmount.toFixed(2)}\n\nPlease try again or contact us for assistance.`
    })
  }

  // Appointment cancellation with refund email
  async sendAppointmentCancellationWithRefund(
    clientEmail: string,
    clientName: string,
    appointmentDetails: {
      serviceName: string
      providerName: string
      startTime: Date
      tenantName: string
      refundAmount?: number
      refundStatus: string
    }
  ) {
    const { serviceName, providerName, startTime, tenantName, refundAmount, refundStatus } = appointmentDetails
    
    const subject = `Appointment Cancelled - ${serviceName}`
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .appointment-details { background-color: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .refund-info { background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Cancelled</h1>
            </div>
            
            <p>Dear ${clientName},</p>
            
            <p>Your appointment with ${tenantName} has been cancelled as requested.</p>
            
            <div class="appointment-details">
              <h3>Cancelled Appointment Details:</h3>
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Provider:</strong> ${providerName}</p>
              <p><strong>Date & Time:</strong> ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}</p>
            </div>
            
            ${refundAmount && refundAmount > 0 ? `
            <div class="refund-info">
              <h3>Refund Information:</h3>
              <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
              <p><strong>Refund Status:</strong> ${refundStatus === 'full' ? 'Full refund processed' : refundStatus === 'partial' ? 'Partial refund processed' : 'Refund processing'}</p>
              <p><em>Please allow 3-5 business days for the refund to appear on your statement.</em></p>
            </div>
            ` : ''}
            
            <p>If you would like to reschedule, please feel free to book a new appointment.</p>
            
            <div class="footer">
              <p>Thank you for your understanding.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: [clientEmail],
      subject,
      htmlBody,
      textBody: `Appointment Cancelled\n\nDear ${clientName},\n\nYour appointment has been cancelled.\n\nService: ${serviceName}\nProvider: ${providerName}\nDate & Time: ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}\n\n${refundAmount && refundAmount > 0 ? `Refund Amount: $${refundAmount.toFixed(2)}\nRefund will appear in 3-5 business days.\n\n` : ''}Thank you for your understanding.`
    })
  }
}
