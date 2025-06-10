import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  location?: string;
}

export class GoogleCalendarService {
  private calendar;
  private oauth2Client: OAuth2Client;

  constructor() {
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials if refresh token is available
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        access_token: process.env.GOOGLE_ACCESS_TOKEN,
      });
    }

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Create a calendar event for an appointment
   */
  async createAppointmentEvent(eventData: CalendarEvent): Promise<string | null> {
    try {
      // Check if we have the necessary credentials
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
        console.warn('Google Calendar credentials not configured. Skipping calendar event creation.');
        return null;
      }

      // Refresh access token if needed
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      // Create the event
      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: eventData.attendees?.map(email => ({ email })),
        location: eventData.location,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 10 }, // 10 minutes before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      console.log('Calendar event created:', response.data.id);
      return response.data.id || null;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return null;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateAppointmentEvent(eventId: string, eventData: CalendarEvent): Promise<boolean> {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
        console.warn('Google Calendar credentials not configured. Skipping calendar event update.');
        return false;
      }

      // Refresh access token if needed
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: eventData.attendees?.map(email => ({ email })),
        location: eventData.location,
      };

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
      });

      console.log('Calendar event updated:', eventId);
      return true;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      return false;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteAppointmentEvent(eventId: string): Promise<boolean> {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
        console.warn('Google Calendar credentials not configured. Skipping calendar event deletion.');
        return false;
      }

      // Refresh access token if needed
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });

      console.log('Calendar event deleted:', eventId);
      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      return false;
    }
  }

  /**
   * Generate OAuth2 authorization URL for setting up Google Calendar integration
   */
  getAuthUrl(): string {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }
}

export const calendarService = new GoogleCalendarService();
