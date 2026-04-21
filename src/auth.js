/**
 * RUN THIS ONCE to authenticate Gmail and get your refresh token.
 * After running, copy the GMAIL_REFRESH_TOKEN value into your .env file.
 *
 * PowerShell: node src/auth.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/spreadsheets',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  STEP 1: Open this URL in your browser:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(authUrl);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  STEP 2: Waiting for Google to redirect back...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Temporary local server to catch the OAuth redirect
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/oauth2callback') {
    const code = parsedUrl.query.code;

    if (!code) {
      res.writeHead(400);
      res.end('No code received. Please try again.');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body style="font-family:sans-serif;padding:40px;background:#f0fdf4">
          <h2 style="color:#16a34a">✅ Authentication Successful!</h2>
          <p>You can close this tab and return to your terminal.</p>
        </body></html>
      `);

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  ✅ SUCCESS! Copy this into your .env file:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('Error getting tokens:', err.message);
      res.writeHead(500);
      res.end('Authentication failed. Check terminal for error.');
      server.close();
      process.exit(1);
    }
  }
});

server.listen(3000, () => {
  console.log('  Local server running on http://localhost:3000');
  console.log('  Waiting for Google redirect...\n');
});
