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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request data
    const validatedData = contactFormSchema.parse(body)
    
    const { name, email, phone, company, inquiryType, subject, message } = validatedData
    
    // Get the appropriate recipient email based on inquiry type
    const recipientEmail = getRecipientEmail(inquiryType)
    
    // Initialize email service
    const emailService = EmailService.getInstance()
    
    // Generate reference number
    const referenceNumber = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
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
              <p><strong>Inquiry Type:</strong> ${inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1)}</p>
            </div>
            
            <div class="contact-details">
              <h3>Contact Information:</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
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
              <p><strong>Inquiry Type:</strong> ${inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1)}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Reference Number:</strong> ${referenceNumber}</p>
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
      textBody: `New Contact Form Submission [${referenceNumber}]\n\nName: ${name}\nEmail: ${email}\n${phone ? `Phone: ${phone}\n` : ''}${company ? `Company: ${company}\n` : ''}Inquiry Type: ${inquiryType}\n\nSubject: ${subject}\n\nMessage:\n${message}`
    })
    
    // Send confirmation email to customer
    await emailService.sendEmail({
      to: [email],
      subject: customerSubject,
      htmlBody: customerHtmlBody,
      textBody: `Thank you for contacting AppointmentHub!\n\nDear ${name},\n\nWe've received your inquiry and assigned it reference number ${referenceNumber}.\n\nInquiry Type: ${inquiryType}\nSubject: ${subject}\n\nWe'll respond within 24 hours during business days.\n\nBest regards,\nThe AppointmentHub Team`
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
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  inquiryType: z.enum([
    'general',
    'sales', 
    'support',
    'partnership',
    'demo',
    'feedback',
    'billing',
    'other'
  ]),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message is too long'),
  company: z.string().optional(),
  preferredContact: z.enum(['email', 'phone', 'both']).default('email')
})

// Helper function to get inquiry type label
function getInquiryTypeLabel(type: string): string {
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

// Helper function to get appropriate recipient email
function getRecipientEmail(inquiryType: string): string {
  const recipients: Record<string, string> = {
    sales: 'sales@appointmentpro.com',
    support: 'support@appointmentpro.com',
    partnership: 'partnerships@appointmentpro.com',
    demo: 'sales@appointmentpro.com',
    billing: 'billing@appointmentpro.com',
    feedback: 'feedback@appointmentpro.com'
  }
  return recipients[inquiryType] || 'support@appointmentpro.com'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = contactFormSchema.parse(body)

    // Get client IP for basic rate limiting (optional)
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // Create email content for internal team
    const internalEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Contact Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Name:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Email:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.email}</td>
            </tr>
            ${data.phone ? `
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Phone:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.phone}</td>
            </tr>
            ` : ''}
            ${data.company ? `
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Company:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.company}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Inquiry Type:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getInquiryTypeLabel(data.inquiryType)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Preferred Contact:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.preferredContact}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #4b5563;">Subject:</td>
              <td style="padding: 8px;">${data.subject}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="color: #374151; margin-top: 0;">Message</h3>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; white-space: pre-wrap; font-family: 'Courier New', monospace; line-height: 1.5;">
${data.message}
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Next Steps:</strong> Please respond to this inquiry within 24 hours. 
            The customer's preferred contact method is: <strong>${data.preferredContact}</strong>
          </p>
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p>Submission Details:</p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li>Timestamp: ${new Date().toLocaleString()}</li>
            <li>IP Address: ${clientIP}</li>
            <li>User Agent: ${request.headers.get('user-agent') || 'Unknown'}</li>
          </ul>
        </div>
      </div>
    `

    // Create email content for customer confirmation
    const customerEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Thank You for Contacting Us!</h1>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Dear ${data.name},
          </p>
          
          <p style="color: #4b5563; line-height: 1.6;">
            We've received your message and wanted to confirm that it's in our queue. Our team will review your inquiry and respond within 24 hours during business days.
          </p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #374151; margin-top: 0; margin-bottom: 15px;">Your Message Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Subject:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.subject}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Inquiry Type:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${getInquiryTypeLabel(data.inquiryType)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #4b5563;">Preferred Contact:</td>
                <td style="padding: 8px;">${data.preferredContact}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 25px 0;">
            <h4 style="color: #1e40af; margin-top: 0;">What happens next?</h4>
            <ul style="color: #374151; margin: 10px 0; padding-left: 20px; line-height: 1.6;">
              <li>Our team will review your message and assign it to the appropriate specialist</li>
              <li>You'll receive a response within 24 hours (during business days)</li>
              <li>For urgent matters, you can also call us at +1 (555) 123-4567</li>
            </ul>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">
            In the meantime, feel free to explore our platform or check out our help documentation at 
            <a href="https://appointmentpro.com/help" style="color: #3b82f6; text-decoration: none;">appointmentpro.com/help</a>.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            Best regards,<br>
            <strong>The AppointmentPro Team</strong><br>
            <a href="mailto:support@appointmentpro.com" style="color: #3b82f6; text-decoration: none;">support@appointmentpro.com</a> | 
            <a href="tel:+15551234567" style="color: #3b82f6; text-decoration: none;">+1 (555) 123-4567</a>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
          <p>© 2025 AppointmentPro. All rights reserved.</p>
          <p>
            <a href="https://appointmentpro.com/privacy" style="color: #6b7280; text-decoration: none;">Privacy Policy</a> | 
            <a href="https://appointmentpro.com/terms" style="color: #6b7280; text-decoration: none;">Terms of Service</a>
          </p>
        </div>
      </div>
    `

    // Send email to internal team
    const recipientEmail = getRecipientEmail(data.inquiryType)
    await sendEmail({
      to: recipientEmail,
      cc: 'admin@appointmentpro.com', // Always CC admin
      subject: `[${getInquiryTypeLabel(data.inquiryType)}] ${data.subject}`,
      html: internalEmailContent,
      replyTo: data.email // Allow direct reply to customer
    })

    // Send confirmation email to customer
    await sendEmail({
      to: data.email,
      subject: 'Thank you for contacting AppointmentPro - We\'ll be in touch soon!',
      html: customerEmailContent,
      from: 'AppointmentPro Support <support@appointmentpro.com>'
    })

    // Log the contact form submission (you might want to store this in database)
    console.log('Contact form submission:', {
      timestamp: new Date().toISOString(),
      name: data.name,
      email: data.email,
      inquiryType: data.inquiryType,
      subject: data.subject,
      ip: clientIP
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message. We\'ll get back to you soon!'
    }, { status: 200 })

  } catch (error) {
    console.error('Contact form error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Please check your form data and try again.',
        errors: error.errors
      }, { status: 400 })
    }

    // Don't expose internal errors to client
    return NextResponse.json({
      success: false,
      message: 'Sorry, we\'re having trouble processing your request. Please try again later or contact us directly.'
    }, { status: 500 })
  }
}
