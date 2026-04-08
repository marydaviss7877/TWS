const { google } = require('googleapis');
const User = require('../../models/User');
const Meeting = require('../../models/Meeting');

class CalendarService {
  constructor() {
    this.googleOAuth2Client = null;
  }

  // Google Calendar integration
  async initializeGoogleClient(userId) {
    const user = await User.findById(userId);
    if (!user || !user.googleAccessToken) {
      throw new Error('Google Calendar not connected for this user');
    }

    this.googleOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.googleOAuth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry
    });

    return google.calendar({ version: 'v3', auth: this.googleOAuth2Client });
  }

  // Create meeting in Google Calendar
  async createGoogleMeeting(userId, meetingData) {
    try {
      const calendar = await this.initializeGoogleClient(userId);

      const event = {
        summary: meetingData.title,
        description: meetingData.description,
        start: {
          dateTime: meetingData.startTime,
          timeZone: meetingData.timezone || 'UTC'
        },
        end: {
          dateTime: meetingData.endTime,
          timeZone: meetingData.timezone || 'UTC'
        },
        attendees: meetingData.attendees?.map(email => ({ email })) || [],
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1
      });

      return {
        success: true,
        eventId: response.data.id,
        meetingLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
        calendarLink: response.data.htmlLink,
        data: response.data
      };
    } catch (error) {
      console.error('Google Calendar error:', error);
      throw new Error(`Failed to create Google Calendar meeting: ${error.message}`);
    }
  }

  // Get user's calendar events
  async getGoogleEvents(userId, timeMin, timeMax) {
    try {
      const calendar = await this.initializeGoogleClient(userId);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Google Calendar fetch error:', error);
      throw new Error(`Failed to fetch Google Calendar events: ${error.message}`);
    }
  }

  // Check user's availability (Google Calendar only)
  async checkAvailability(userId, startTime, endTime) {
    try {
      const events = await this.getGoogleEvents(userId, startTime, endTime);

      const conflicts = events.filter(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        const eventEnd = new Date(event.end?.dateTime || event.end?.date);
        const requestedStart = new Date(startTime);
        const requestedEnd = new Date(endTime);

        return (eventStart < requestedEnd && eventEnd > requestedStart);
      });

      return {
        available: conflicts.length === 0,
        conflicts: conflicts.map(event => ({
          title: event.summary,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date
        }))
      };
    } catch (error) {
      console.error('Availability check error:', error);
      throw new Error(`Failed to check availability: ${error.message}`);
    }
  }

  // Schedule meeting (Google Calendar only)
  async scheduleMeeting(organizerId, meetingData) {
    try {
      const organizer = await User.findById(organizerId);
      if (!organizer) {
        throw new Error('Organizer not found');
      }

      if (!organizer.googleAccessToken) {
        throw new Error('Organizer has no calendar integration. Google Calendar is required.');
      }

      const organizerAvailability = await this.checkAvailability(
        organizerId,
        meetingData.startTime,
        meetingData.endTime
      );

      if (!organizerAvailability.available) {
        return {
          success: false,
          message: 'Organizer is not available at the requested time',
          conflicts: organizerAvailability.conflicts
        };
      }

      const calendarResult = await this.createGoogleMeeting(organizerId, meetingData);

      const meeting = new Meeting({
        title: meetingData.title,
        description: meetingData.description,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        timezone: meetingData.timezone || 'UTC',
        organizerId,
        attendees: meetingData.attendees || [],
        meetingLink: calendarResult.meetingLink,
        calendarEventId: calendarResult.eventId,
        calendarType: 'google',
        status: 'scheduled',
        workspaceId: meetingData.workspaceId,
        channelId: meetingData.channelId,
        organization: organizer.orgId
      });

      await meeting.save();

      return {
        success: true,
        meeting,
        calendarResult
      };
    } catch (error) {
      console.error('Meeting scheduling error:', error);
      throw new Error(`Failed to schedule meeting: ${error.message}`);
    }
  }

  // Get meeting suggestions based on attendees' availability (Google Calendar only)
  async getMeetingSuggestions(organizerId, attendees, duration, dateRange) {
    try {
      const suggestions = [];
      const { startDate, endDate } = dateRange;

      const availabilityPromises = attendees.map(async (attendeeId) => {
        const user = await User.findById(attendeeId);
        if (!user || !user.googleAccessToken) return null;
        return this.checkAvailability(attendeeId, startDate, endDate);
      });

      const availabilityResults = await Promise.all(availabilityPromises);

      const start = new Date(startDate);
      const end = new Date(endDate);
      const interval = 30 * 60 * 1000;

      for (let time = start.getTime(); time < end.getTime(); time += interval) {
        const slotStart = new Date(time);
        const slotEnd = new Date(time + duration * 60 * 1000);

        const allAvailable = availabilityResults.every(result => {
          if (!result) return false;
          return result.conflicts.every(conflict => {
            const conflictStart = new Date(conflict.start);
            const conflictEnd = new Date(conflict.end);
            return !(conflictStart < slotEnd && conflictEnd > slotStart);
          });
        });

        if (allAvailable) {
          suggestions.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            score: 1.0
          });
        }
      }

      return suggestions.slice(0, 10);
    } catch (error) {
      console.error('Meeting suggestions error:', error);
      throw new Error(`Failed to get meeting suggestions: ${error.message}`);
    }
  }
}

module.exports = new CalendarService();
