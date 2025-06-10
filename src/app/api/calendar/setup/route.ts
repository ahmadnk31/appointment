import { NextRequest, NextResponse } from 'next/server'
import { calendarService } from '@/lib/calendar'

// This is a utility endpoint for setting up Google Calendar integration
// It should be used only during initial setup and can be removed in production
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    // Step 1: Redirect to Google OAuth
    try {
      const authUrl = calendarService.getAuthUrl()
      return NextResponse.redirect(authUrl)
    } catch (error) {
      return NextResponse.json({ 
        error: 'Failed to generate auth URL. Check your Google Calendar credentials.' 
      }, { status: 500 })
    }
  }

  try {
    // Step 2: Exchange code for tokens
    const tokens = await calendarService.getTokens(code)
    
    return NextResponse.json({
      message: 'Success! Add these to your .env.local file:',
      instructions: [
        'Copy the tokens below to your .env.local file',
        'Restart your application',
        'Test the integration by creating an appointment',
        'Remove or disable this setup endpoint in production'
      ],
      environmentVariables: {
        GOOGLE_REFRESH_TOKEN: tokens.refresh_token,
        GOOGLE_ACCESS_TOKEN: tokens.access_token,
      },
      note: 'Keep these tokens secure and never commit them to version control.'
    })
  } catch (error) {
    console.error('Failed to exchange code for tokens:', error)
    return NextResponse.json({ 
      error: 'Failed to get tokens. Please try the setup process again.' 
    }, { status: 500 })
  }
}
