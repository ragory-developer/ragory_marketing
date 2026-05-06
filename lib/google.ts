// Scopes per Google service — granular and professional
export const GOOGLE_SERVICES = {
  gmail: {
    label: 'Gmail',
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    dbKey: 'GOOGLE_GMAIL_REFRESH_TOKEN',
  },
  drive: {
    label: 'Google Drive',
    scopes: ['https://www.googleapis.com/auth/drive'],
    dbKey: 'GOOGLE_DRIVE_REFRESH_TOKEN',
  },
  sheets: {
    label: 'Google Sheets',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    dbKey: 'GOOGLE_SHEETS_REFRESH_TOKEN',
  },
  docs: {
    label: 'Google Docs',
    scopes: ['https://www.googleapis.com/auth/documents'],
    dbKey: 'GOOGLE_DOCS_REFRESH_TOKEN',
  },
  calendar: {
    label: 'Google Calendar',
    scopes: ['https://www.googleapis.com/auth/calendar'],
    dbKey: 'GOOGLE_CALENDAR_REFRESH_TOKEN',
  },
  forms: {
    label: 'Google Forms',
    scopes: ['https://www.googleapis.com/auth/forms.body'],
    dbKey: 'GOOGLE_FORMS_REFRESH_TOKEN',
  },
  meet: {
    label: 'Google Meet',
    // Meet is managed via Calendar API
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    dbKey: 'GOOGLE_MEET_REFRESH_TOKEN',
  },
} as const

export type GoogleServiceKey = keyof typeof GOOGLE_SERVICES
