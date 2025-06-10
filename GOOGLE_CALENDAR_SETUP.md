# Google Calendar Integration Setup Guide

This guide explains how to set up Google Calendar integration for the appointment booking system. When enabled, the system will automatically create, update, and delete Google Calendar events when appointments are booked, modified, or cancelled.

## Prerequisites

- A Google Cloud Platform account
- Access to Google Calendar API
- Basic understanding of OAuth 2.0

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted:
   - User Type: External (for testing) or Internal (for organization use)
   - Fill in the required fields (App name, User support email, etc.)
   - Add your domain to authorized domains if needed
4. For Application type, select "Web application"
5. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/google/callback`
   - For production: `https://yourdomain.com/api/auth/google/callback`
6. Click "Create"
7. Note down the Client ID and Client Secret

## Step 4: Get Refresh Token

You need to obtain a refresh token to allow the system to access Google Calendar on behalf of the calendar owner (typically the business owner).

### Option A: Using Google OAuth 2.0 Playground

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In the left panel, find "Calendar API v3" and select:
   - `https://www.googleapis.com/auth/calendar`
6. Click "Authorize APIs"
7. Sign in with the Google account that owns the calendar you want to integrate
8. Click "Exchange authorization code for tokens"
9. Copy the refresh token and access token

### Option B: Using the Application (Recommended)

We'll create a simple setup endpoint in your application:

1. Add the following route to your application (temporary, for setup only):

```typescript
// src/app/api/calendar/setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { calendarService } from '@/lib/calendar'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    // Step 1: Redirect to Google OAuth
    const authUrl = calendarService.getAuthUrl()
    return NextResponse.redirect(authUrl)
  }

  try {
    // Step 2: Exchange code for tokens
    const tokens = await calendarService.getTokens(code)
    
    return NextResponse.json({
      message: 'Success! Add these to your environment variables:',
      tokens: {
        GOOGLE_REFRESH_TOKEN: tokens.refresh_token,
        GOOGLE_ACCESS_TOKEN: tokens.access_token,
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get tokens' }, { status: 500 })
  }
}
```

2. Visit `http://localhost:3000/api/calendar/setup` to start the OAuth flow
3. After authorization, you'll get the tokens to add to your environment variables

## Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID="your-google-client-id-from-step-3"
GOOGLE_CLIENT_SECRET="your-google-client-secret-from-step-3"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_REFRESH_TOKEN="your-refresh-token-from-step-4"
GOOGLE_ACCESS_TOKEN="your-access-token-from-step-4"
```

## Step 6: Test the Integration

1. Restart your application
2. Create a test appointment through the booking system
3. Check your Google Calendar to see if the event was created
4. Try updating or cancelling the appointment to test synchronization

## How It Works

The integration works as follows:

1. **Appointment Creation**: When an appointment is booked (via dashboard or public booking), a Google Calendar event is automatically created
2. **Appointment Updates**: When appointment details change (time, service, notes), the calendar event is updated
3. **Appointment Cancellation**: When an appointment is cancelled or deleted, the calendar event is removed
4. **Error Handling**: If calendar operations fail, the appointment booking still succeeds (calendar integration is non-blocking)

## Features

- **Automatic Event Creation**: Events are created with appointment details, attendees, and reminders
- **Event Synchronization**: Updates to appointments sync with Google Calendar
- **Smart Descriptions**: Calendar events include service details, client information, and notes
- **Attendee Management**: Both client and provider emails are added as attendees
- **Reminder Setup**: Events include email (24h before) and popup (10min before) reminders
- **Error Resilience**: Calendar failures don't prevent appointment operations

## Calendar Event Details

Each calendar event includes:

- **Title**: Service name + Client name
- **Description**: Detailed appointment information including service, client details, provider, and notes
- **Time**: Appointment start and end times
- **Attendees**: Client and provider email addresses
- **Location**: Business/tenant name
- **Reminders**: Email (24 hours) and popup (10 minutes) notifications

## Troubleshooting

### Common Issues

1. **"Calendar event creation failed"**
   - Check that all environment variables are set correctly
   - Ensure the refresh token is valid and hasn't expired
   - Verify that the Google Calendar API is enabled

2. **"Unauthorized" errors**
   - The refresh token may have expired
   - Re-run the OAuth flow to get new tokens
   - Check that the OAuth consent screen is properly configured

3. **"Calendar not found" errors**
   - The integration uses the 'primary' calendar by default
   - Ensure the authenticated user has access to their primary calendar

4. **Rate limiting**
   - Google Calendar API has rate limits
   - The integration includes proper error handling for rate limits

### Debug Mode

To enable detailed logging for calendar operations, check the console logs. All calendar operations log their success/failure status.

## Security Considerations

1. **Token Storage**: Refresh tokens should be stored securely in environment variables
2. **Scope Limitation**: The integration only requests calendar access, not full Google account access
3. **Error Handling**: Calendar failures are logged but don't expose sensitive information
4. **Optional Integration**: Calendar integration is completely optional and doesn't affect core booking functionality

## Production Deployment

For production deployment:

1. Update the OAuth redirect URI to use your production domain
2. Set up proper OAuth consent screen with your domain
3. Use production environment variables
4. Consider using Google Cloud Secret Manager for token storage
5. Monitor API usage and set up proper logging

## Disabling Calendar Integration

To disable calendar integration:

1. Remove or comment out the Google Calendar environment variables
2. The system will automatically skip calendar operations when credentials are not available
3. All appointment booking functionality will continue to work normally

## Support

If you encounter issues with the Google Calendar integration:

1. Check the application logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test the OAuth flow to ensure fresh tokens
4. Consult the Google Calendar API documentation for API-specific issues
