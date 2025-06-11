import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { EmailService } from '@/lib/email'

// Validation schema for contact form
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  inquiryType: z.enum(['general', 'sales', 'support', 'partnership', 'demo', 'feedback', 'billing', 'other']),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters long'),
  preferredContact: z.enum(['email', 'phone', 'both']).default('email')
})

// Email routing based on inquiry type
const getRecipientEmail = (inquiryType: string): string => {
  const emailMap: Record<string, string> = {
    'sales': 'sales@appointmenthub.com',
    'support': 'support@appointmenthub.com',
    'partnership': 'partnerships@appointmenthub.com',
    'billing': 'billing@appointmenthub.com',
    'demo': 'sales@appointmenthub.com',
    'feedback': 'feedback@appointmenthub.com',
    'general': 'info@appointmenthub.com',
    'other': 'info@appointmenthub.com',
  }
  return emailMap[inquiryType] || 'info@appointmenthub.com'
}

// Helper function to get inquiry type label
const getInquiryTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    general: 'General Inquiry',
    sales: 'Sales & Pricing',
    support: 'Technical Support',
    partnership: 'Partnership Opportunities',
    demo: 'Request Demo',
    feedback: 'Feedback & Suggestions',
    billing: 'Billing & Account',
    other: 'Other'
  }
  return labels[type] || 'General Inquiry'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request data
    const validatedData = contactFormSchema.parse(body)
    
    const { name, email, phone, company, inquiryType, subject, message, preferredContact } = validatedData
    
    // Get the appropriate recipient email based on inquiry type
    const recipientEmail = getRecipientEmail(inquiryType)
    
    // Initialize email service
    const emailService = EmailService.getInstance()
    
    // Generate reference number
    const referenceNumber = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    // Get client IP for basic rate limiting (optional)
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    // Prepare email content for internal team
    const internalSubject = `New Contact Form Submission: ${subject} [${referenceNumber}]`
    const internalHtmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .contact-details { background-color: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .message-content { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contact Form Submission</h1>
              <p><strong>Reference:</strong> ${referenceNumber}</p>
              <p><strong>Inquiry Type:</strong> ${getInquiryTypeLabel(inquiryType)}</p>
            </div>
            
            <div class="contact-details">
              <h3>Contact Information:</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              <p><strong>Preferred Contact:</strong> ${preferredContact}</p>
            </div>
            
            <div class="message-content">
              <h3>Subject:</h3>
              <p>${subject}</p>
              
              <h3>Message:</h3>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <div class="footer">
              <p>This message was sent through the AppointmentHub contact form.</p>
              <p>Please respond within 24 hours during business days.</p>
              <p>Client IP: ${clientIP}</p>
              <p>Timestamp: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    // Prepare confirmation email for customer
    const customerSubject = `Thank you for contacting AppointmentHub [${referenceNumber}]`
    const customerHtmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #d1edff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .summary { background-color: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .next-steps { background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank you for contacting us!</h1>
              <p>We've received your message and will get back to you soon.</p>
            </div>
            
            <p>Dear ${name},</p>
            
            <p>Thank you for reaching out to AppointmentHub. We've successfully received your inquiry and have assigned it reference number <strong>${referenceNumber}</strong>.</p>
            
            <div class="summary">
              <h3>Your Message Summary:</h3>
              <p><strong>Inquiry Type:</strong> ${getInquiryTypeLabel(inquiryType)}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Reference Number:</strong> ${referenceNumber}</p>
              <p><strong>Preferred Contact Method:</strong> ${preferredContact}</p>
            </div>
            
            <div class="next-steps">
              <h3>What happens next?</h3>
              <ul>
                <li>We'll review your inquiry and route it to the appropriate team member</li>
                <li>You can expect a response within 24 hours during business days</li>
                <li>For urgent matters, please call us at +1 (555) 123-4567</li>
                <li>Keep your reference number handy for faster assistance</li>
              </ul>
            </div>
            
            <p>If you have any additional questions or need immediate assistance, please don't hesitate to contact us directly.</p>
            
            <div class="footer">
              <p>Best regards,<br>The AppointmentHub Team</p>
              <p>Email: support@appointmenthub.com | Phone: +1 (555) 123-4567</p>
              <p>Business Hours: Mon-Fri 9:00 AM - 6:00 PM PST</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    // Send internal notification email
    await emailService.sendEmail({
      to: [recipientEmail],
      subject: internalSubject,
      htmlBody: internalHtmlBody,
      textBody: `New Contact Form Submission [${referenceNumber}]\n\nName: ${name}\nEmail: ${email}\n${phone ? `Phone: ${phone}\n` : ''}${company ? `Company: ${company}\n` : ''}Inquiry Type: ${getInquiryTypeLabel(inquiryType)}\nPreferred Contact: ${preferredContact}\n\nSubject: ${subject}\n\nMessage:\n${message}`
    })
    
    // Send confirmation email to customer
    await emailService.sendEmail({
      to: [email],
      subject: customerSubject,
      htmlBody: customerHtmlBody,
      textBody: `Thank you for contacting AppointmentHub!\n\nDear ${name},\n\nWe've received your inquiry and assigned it reference number ${referenceNumber}.\n\nInquiry Type: ${getInquiryTypeLabel(inquiryType)}\nSubject: ${subject}\nPreferred Contact: ${preferredContact}\n\nWe'll respond within 24 hours during business days.\n\nBest regards,\nThe AppointmentHub Team`
    })
    
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      referenceNumber
    })
    
  } catch (error) {
    console.error('Contact form error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    )
  }
}
