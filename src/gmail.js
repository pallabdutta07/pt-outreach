/**
 * gmail.js â€” Fetches unread Psychology Today emails from Gmail
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

/**
 * Decode base64url encoded Gmail message body
 */
function decodeBody(data) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

/**
 * Recursively extract text/plain and text/html from message parts
 */
function extractBody(payload) {
  let text = '';
  let html = '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    text = decodeBody(payload.body.data);
  } else if (payload.mimeType === 'text/html' && payload.body?.data) {
    html = decodeBody(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part);
      text += result.text;
      html += result.html;
    }
  }

  return { text, html };
}

/**
 * Parse the email body to extract contact info from Psychology Today emails.
 *
 * Sample email format:
 *   "Your email to [Practice Name] has been sent."
 *   Practice Name, Address, Tel, Profile URL
 */
function parseContactFromEmail(text, html) {
  const source = text || html.replace(/<[^>]+>/g, ' ');

  // Practice name â€” "Your email to X has been sent"
  const nameMatch = source.match(/Your email to (.+?) has been sent/i);
  const practiceName = nameMatch ? nameMatch[1].trim() : '';

  // Address â€” look for street address pattern
  const addressMatch = source.match(/(\d+\s+[\w\s]+(?:Street|St|Ave|Avenue|Blvd|Boulevard|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Suite|Ste)[^\n,]*(?:,\s*[\w\s]+)?(?:\s+\d{5})?)/i);
  const address = addressMatch ? addressMatch[1].trim() : '';

  // Phone number
  const phoneMatch = source.match(/Tel[:\s]+([(\d).\-\s]+\d)/i);
  const phone = phoneMatch ? phoneMatch[1].trim() : '';

  // Profile URL â€” Psychology Today profile link
  const profileUrlMatch = source.match(/https?:\/\/(?:www\.)?psychologytoday\.com\/[^\s"<>]+/i);
  const profileUrl = profileUrlMatch ? profileUrlMatch[0].trim() : '';

  // Email address of the therapist (if included)
  const emailMatch = source.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
  // Filter out noreply/system emails
  const therapistEmail = emailMatch
    ? emailMatch.find(e => !e.includes('psychologytoday') && !e.includes('noreply')) || ''
    : '';

  return { practiceName, address, phone, profileUrl, therapistEmail };
}

/**
 * Main function â€” fetch all unread Psychology Today emails
 * Returns array of parsed contact objects
 */
async function fetchPsychologyTodayEmails(limit = 50) {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  console.log('ðŸ“§ Checking Gmail for Psychology Today emails...');

  // Search for unread emails from Psychology Today
  const searchQuery = 'from:psychologytoday.com is:unread';

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: searchQuery,
    maxResults: limit,
  });

  const messages = listRes.data.messages || [];
  console.log(`   Found ${messages.length} unread Psychology Today email(s)`);

  if (messages.length === 0) return [];

  const contacts = [];

  for (const msg of messages) {
    try {
      // Fetch full message
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const payload = msgRes.data.payload;
      const headers = payload.headers || [];

      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';

      const { text, html } = extractBody(payload);
      const contactInfo = parseContactFromEmail(text, html);

      if (!contactInfo.practiceName) {
        console.log(`   âš ï¸  Could not parse contact from email: "${subject}" â€” skipping`);
        continue;
      }

      contacts.push({
        gmailMessageId: msg.id,
        subject,
        date,
        from,
        emailBody: text || html.replace(/<[^>]+>/g, ' '),
        ...contactInfo,
      });

      // Mark email as read so we don't process it again
      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      console.log(`   âœ… Parsed: ${contactInfo.practiceName}`);
    } catch (err) {
      console.error(`   âŒ Error processing message ${msg.id}:`, err.message);
    }
  }

  return contacts;
}

module.exports = { fetchPsychologyTodayEmails };

