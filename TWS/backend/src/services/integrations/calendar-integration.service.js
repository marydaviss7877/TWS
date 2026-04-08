const { google } = require('googleapis');
const axios = require('axios');

class CalendarIntegration {
  constructor() {
    this.googleOAuth2Client = null;
  }

  // Google Calendar Integration
  async initializeGoogleCalendar(accessToken, refreshToken) {
    this.googleOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.googleOAuth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    return google.calendar({ version: 'v3', auth: this.googleOAuth2Client });
  }

  async createGoogleCalendarEvent(meeting) {
    try {
      const calendar = await this.initializeGoogleCalendar(
        meeting.organizer.googleAccessToken,
        meeting.organizer.googleRefreshToken
      );

      const event = {
        summary: meeting.title,
        description: meeting.description,
        start: {
          dateTime: meeting.startTime.toISOString(),
          timeZone: meeting.timezone
        },
        end: {
          dateTime: meeting.endTime.toISOString(),
          timeZone: meeting.timezone
        },
        attendees: [
          ...meeting.attendees.map(attendee => ({
            email: attendee.email,
            displayName: attendee.name
          })),
          ...meeting.externalAttendees.map(attendee => ({
            email: attendee.email,
            displayName: attendee.name
          }))
        ],
        conferenceData: meeting.location.platform === 'google_meet' ? {
          createRequest: {
            requestId: `meeting-${meeting._id}-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        } : undefined,
        reminders: {
          useDefault: false,
          overrides: meeting.reminders.map(reminder => ({
            method: reminder.type === 'email' ? 'email' : 'popup',
            minutes: reminder.timeBefore
          }))
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: meeting.location.platform === 'google_meet' ? 1 : 0
      });

      return response.data;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  async updateGoogleCalendarEvent(meeting, eventId) {
    try {
      const calendar = await this.initializeGoogleCalendar(
        meeting.organizer.googleAccessToken,
        meeting.organizer.googleRefreshToken
      );

      const event = {
        summary: meeting.title,
        description: meeting.description,
        start: {
          dateTime: meeting.startTime.toISOString(),
          timeZone: meeting.timezone
        },
        end: {
          dateTime: meeting.endTime.toISOString(),
          timeZone: meeting.timezone
        },
        attendees: [
          ...meeting.attendees.map(attendee => ({
            email: attendee.email,
            displayName: attendee.name
          })),
          ...meeting.externalAttendees.map(attendee => ({
            email: attendee.email,
            displayName: attendee.name
          }))
        ]
      };

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event
      });

      return response.data;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }

  async deleteGoogleCalendarEvent(eventId, accessToken, refreshToken) {
    try {
      const calendar = await this.initializeGoogleCalendar(accessToken, refreshToken);

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw error;
    }
  }

  // Zoom Integration
  async createZoomMeeting(meeting) {
    try {
      const zoomApiKey = process.env.ZOOM_API_KEY;
      const zoomApiSecret = process.env.ZOOM_API_SECRET;

      // Generate JWT token for Zoom API
      const jwt = require('jsonwebtoken');
      const payload = {
        iss: zoomApiKey,
        exp: Date.now() + 3600 * 1000 // 1 hour
      };
      const token = jwt.sign(payload, zoomApiSecret);

      const zoomMeeting = {
        topic: meeting.title,
        type: 2, // Scheduled meeting
        start_time: meeting.startTime.toISOString(),
        duration: meeting.duration,
        timezone: meeting.timezone,
        agenda: meeting.description,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          auto_recording: 'cloud'
        }
      };

      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        zoomMeeting,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      throw error;
    }
  }

  async updateZoomMeeting(meeting, meetingId) {
    try {
      const zoomApiKey = process.env.ZOOM_API_KEY;
      const zoomApiSecret = process.env.ZOOM_API_SECRET;

      const jwt = require('jsonwebtoken');
      const payload = {
        iss: zoomApiKey,
        exp: Date.now() + 3600 * 1000
      };
      const token = jwt.sign(payload, zoomApiSecret);

      const zoomMeeting = {
        topic: meeting.title,
        start_time: meeting.startTime.toISOString(),
        duration: meeting.duration,
        timezone: meeting.timezone,
        agenda: meeting.description
      };

      const response = await axios.patch(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        zoomMeeting,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error updating Zoom meeting:', error);
      throw error;
    }
  }

  async deleteZoomMeeting(meetingId) {
    try {
      const zoomApiKey = process.env.ZOOM_API_KEY;
      const zoomApiSecret = process.env.ZOOM_API_SECRET;

      const jwt = require('jsonwebtoken');
      const payload = {
        iss: zoomApiKey,
        exp: Date.now() + 3600 * 1000
      };
      const token = jwt.sign(payload, zoomApiSecret);

      await axios.delete(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error);
      throw error;
    }
  }

  // Check availability
  async checkGoogleCalendarAvailability(attendees, startTime, endTime) {
    try {
      const calendar = google.calendar({ version: 'v3' });
      
      const freeBusyRequest = {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: attendees.map(attendee => ({ id: attendee.email }))
      };

      const response = await calendar.freebusy.query({
        auth: this.googleOAuth2Client,
        resource: freeBusyRequest
      });

      return response.data;
    } catch (error) {
      console.error('Error checking Google Calendar availability:', error);
      throw error;
    }
  }

}

module.exports = new CalendarIntegration();
