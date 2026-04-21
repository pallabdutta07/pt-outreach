/**
 * sheets.js — Logs leads and generated emails to Google Sheets
 */

require('dotenv').config();
const { google } = require('googleapis');

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return oauth2Client;
}

const HEADERS = [
  'Date Processed',
  'Practice Name',
  'Contact Name',
  'Credentials',
  'Email',
  'Phone',
  'Address',
  'City',
  'State',
  'Zip',
  'Website',
  'Specialties',
  'Session Types',
  'Insurance Accepted',
  'Years in Practice',
  'Psychology Today Profile URL',
  'Bio Snippet',
  'Personalized Email Draft',
  'GHL Contact ID',
  'Status',
];

/**
 * Ensure the sheet has headers. If sheet is empty, write header row.
 */
async function ensureHeaders(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!A1:T1',
  });

  const firstRow = res.data.values?.[0] || [];
  if (firstRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
    console.log('   📋 Headers written to spreadsheet');
  }
}

/**
 * Extract city/state/zip from address string
 */
function parseAddressParts(address) {
  // Match: "1420 Walnut Street Suite 1012 Philadelphia, 19102"
  // or "Philadelphia, PA 19102"
  const match = address.match(/([A-Za-z\s]+),?\s+([A-Z]{2})?\s*(\d{5})?$/);
  if (match) {
    return {
      city: match[1]?.trim() || '',
      state: match[2]?.trim() || '',
      zip: match[3]?.trim() || '',
    };
  }
  return { city: '', state: '', zip: '' };
}

/**
 * Append a lead row to the Google Sheet
 */
async function appendLeadToSheet(contact, personalizedEmail, ghlContactId = '') {
  const auth = getOAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  await ensureHeaders(sheets, spreadsheetId);

  const address = contact.scrapedAddress || contact.address || '';
  const { city, state, zip } = parseAddressParts(address);

  const row = [
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
    contact.practiceName || '',
    contact.scrapedName || contact.practiceName || '',
    contact.credentials || '',
    contact.therapistEmail || '',
    contact.scrapedPhone || contact.phone || '',
    address,
    city,
    state,
    zip,
    contact.website || '',
    contact.specialties || '',
    contact.sessionTypes || '',
    contact.insurance || '',
    contact.yearsInPractice || '',
    contact.profileUrl || '',
    (contact.bio || '').slice(0, 300),
    personalizedEmail || '',
    ghlContactId || '',
    'New Lead',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  console.log(`   ✅ Added to Google Sheet: ${contact.practiceName}`);
}

module.exports = { appendLeadToSheet };
