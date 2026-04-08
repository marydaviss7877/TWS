const axios = require('axios');
const jwt = require('jsonwebtoken');

class PlatformIntegration {
  constructor() {
    this.zoomApiKey = process.env.ZOOM_API_KEY;
    this.zoomApiSecret = process.env.ZOOM_API_SECRET;
    this.teamsClientId = process.env.TEAMS_CLIENT_ID;
    this.teamsClientSecret = process.env.TEAMS_CLIENT_SECRET;
  }

  // Google Meet Integration
  async createGoogleMeetMeeting(meeting) {
    try {
      const { google } = require('googleapis');
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: meeting.organizer.googleAccessToken,
        refresh_token: meeting.organizer.googleRefreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

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
        conferenceData: {
          createRequest: {
            requestId: `meeting-${meeting._id}-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1
      });

      return {
        meetingUrl: response.data.conferenceData.entryPoints[0].uri,
        meetingId: response.data.conferenceData.conferenceId,
        passcode: response.data.conferenceData.entryPoints[0].passcode || null
      };
    } catch (error) {
      console.error('Error creating Google Meet meeting:', error);
      throw error;
    }
  }

  // Zoom Integration
  async createZoomMeeting(meeting) {
    try {
      // Generate JWT token for Zoom API
      const payload = {
        iss: this.zoomApiKey,
        exp: Date.now() + 3600 * 1000 // 1 hour
      };
      const token = jwt.sign(payload, this.zoomApiSecret);

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
          auto_recording: 'cloud',
          enforce_login: false,
          enforce_login_domains: '',
          alternative_hosts: '',
          close_registration: false,
          show_share_button: true,
          allow_multiple_devices: true,
          registrants_confirmation_email: true,
          waiting_room_settings: {
            participants_to_place_in_waiting_room: 0,
            who_can_admit_participants_from_waiting_room: 0
          }
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

      return {
        meetingUrl: response.data.join_url,
        meetingId: response.data.id.toString(),
        passcode: response.data.password || null,
        dialInNumbers: response.data.settings.global_dial_in_numbers || []
      };
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      throw error;
    }
  }

  async updateZoomMeeting(meeting, zoomMeetingId) {
    try {
      const payload = {
        iss: this.zoomApiKey,
        exp: Date.now() + 3600 * 1000
      };
      const token = jwt.sign(payload, this.zoomApiSecret);

      const zoomMeeting = {
        topic: meeting.title,
        start_time: meeting.startTime.toISOString(),
        duration: meeting.duration,
        timezone: meeting.timezone,
        agenda: meeting.description
      };

      const response = await axios.patch(
        `https://api.zoom.us/v2/meetings/${zoomMeetingId}`,
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

  async deleteZoomMeeting(zoomMeetingId) {
    try {
      const payload = {
        iss: this.zoomApiKey,
        exp: Date.now() + 3600 * 1000
      };
      const token = jwt.sign(payload, this.zoomApiSecret);

      await axios.delete(
        `https://api.zoom.us/v2/meetings/${zoomMeetingId}`,
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

  // Generic meeting creation based on platform (Microsoft Teams/Graph integration removed)
  async createMeeting(meeting, platform) {
    switch (platform) {
      case 'google_meet':
        return await this.createGoogleMeetMeeting(meeting);
      case 'zoom':
        return await this.createZoomMeeting(meeting);
      case 'teams':
        throw new Error('Microsoft Graph integration has been removed. Use Google Meet or Zoom.');
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  // Update meeting based on platform
  async updateMeeting(meeting, platform, meetingId) {
    switch (platform) {
      case 'zoom':
        return await this.updateZoomMeeting(meeting, meetingId);
      case 'teams':
        throw new Error('Microsoft Graph integration has been removed. Use Google Meet or Zoom.');
      case 'google_meet':
        return { success: true };
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  // Delete meeting based on platform
  async deleteMeeting(platform, meetingId, accessToken = null) {
    switch (platform) {
      case 'zoom':
        return await this.deleteZoomMeeting(meetingId);
      case 'teams':
        throw new Error('Microsoft Graph integration has been removed. Use Google Meet or Zoom.');
      case 'google_meet':
        return { success: true };
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  // Get meeting details
  async getMeetingDetails(platform, meetingId, accessToken = null) {
    try {
      switch (platform) {
        case 'zoom':
          const payload = {
            iss: this.zoomApiKey,
            exp: Date.now() + 3600 * 1000
          };
          const token = jwt.sign(payload, this.zoomApiSecret);

          const response = await axios.get(
            `https://api.zoom.us/v2/meetings/${meetingId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          return response.data;
        case 'teams':
          throw new Error('Microsoft Graph integration has been removed. Use Google Meet or Zoom.');
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      console.error(`Error getting meeting details for ${platform}:`, error);
      throw error;
    }
  }

  // Get meeting participants
  async getMeetingParticipants(platform, meetingId, accessToken = null) {
    try {
      switch (platform) {
        case 'zoom':
          const payload = {
            iss: this.zoomApiKey,
            exp: Date.now() + 3600 * 1000
          };
          const token = jwt.sign(payload, this.zoomApiSecret);

          const response = await axios.get(
            `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          return response.data.registrants || [];
        case 'teams':
          // Teams doesn't have a direct API for participants
          // This would need to be implemented based on specific requirements
          return [];
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      console.error(`Error getting meeting participants for ${platform}:`, error);
      throw error;
    }
  }

  // Generate meeting link for external platforms
  generateExternalMeetingLink(platform, meetingData) {
    switch (platform) {
      case 'google_meet':
        return `https://meet.google.com/${meetingData.meetingId}`;
      case 'zoom':
        return meetingData.meetingUrl;
      case 'teams':
        return meetingData.meetingUrl;
      default:
        return null;
    }
  }

  // Validate platform credentials
  async validateCredentials(platform, credentials) {
    try {
      switch (platform) {
        case 'zoom':
          const payload = {
            iss: credentials.apiKey,
            exp: Date.now() + 3600 * 1000
          };
          const token = jwt.sign(payload, credentials.apiSecret);

          await axios.get(
            'https://api.zoom.us/v2/users/me',
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          return { valid: true };
        case 'teams':
          // Teams validation would be done through OAuth flow
          return { valid: true };
        case 'google_meet':
          // Google Meet validation would be done through OAuth flow
          return { valid: true };
        default:
          return { valid: false, error: 'Unsupported platform' };
      }
    } catch (error) {
      console.error(`Error validating ${platform} credentials:`, error);
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new PlatformIntegration();
