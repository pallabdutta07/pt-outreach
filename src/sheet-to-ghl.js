require('dotenv').config();
const { google } = require('googleapis');
const { createGHLContact, addToGHLPipeline } = require('./ghl');

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return oauth2Client;
}

const COLS = { practiceName:1, scrapedName:2, credentials:3, email:4, phone:5, address:6, city:7, state:8, zip:9, website:10, specialties:11, sessionTypes:12, insurance:13, yearsInPractice:14, profileUrl:15, ghlContactId:18 };

async function readSheet() {
  const auth = getOAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Sheet1!A:T' });
  const rows = res.data.values || [];
  if (rows.length <= 1) { console.log('No data rows found.'); return []; }
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2,
    practiceName: row[COLS.practiceName] || '',
    scrapedName: row[COLS.scrapedName] || '',
    credentials: row[COLS.credentials] || '',
    therapistEmail: row[COLS.email] || '',
    phone: row[COLS.phone] || '',
    scrapedAddress: row[COLS.address] || '',
    website: row[COLS.website] || '',
    specialties: row[COLS.specialties] || '',
    sessionTypes: row[COLS.sessionTypes] || '',
    insurance: row[COLS.insurance] || '',
    yearsInPractice: row[COLS.yearsInPractice] || '',
    profileUrl: row[COLS.profileUrl] || '',
    ghlContactId: row[COLS.ghlContactId] || '',
  }));
}

async function updateSheetGHLId(rowIndex, ghlContactId) {
  const auth = getOAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `Sheet1!S${rowIndex}`, valueInputOption: 'RAW', requestBody: { values: [[ghlContactId]] } });
}

async function run() {
  console.log('\n' + '='.repeat(60));
  console.log('  Google Sheet -> GoHighLevel Sync');
  console.log('='.repeat(60) + '\n');
  const contacts = await readSheet();
  console.log(`Found ${contacts.length} contact(s) in sheet.\n`);
  let added = 0, skipped = 0, errors = 0;
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const name = contact.scrapedName || contact.practiceName;
    console.log(`\n[${i + 1}/${contacts.length}] ${name}`);
    if (contact.ghlContactId) { console.log(`   Skipping - already in GHL (${contact.ghlContactId})`); skipped++; continue; }
    try {
      const ghlContactId = await createGHLContact(contact);
      if (ghlContactId) {
        await addToGHLPipeline(ghlContactId, name);
        await updateSheetGHLId(contact.rowIndex, ghlContactId);
        added++;
      } else { errors++; }
    } catch (err) { console.error(`   Error: ${err.message}`); errors++; }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('\n' + '='.repeat(60));
  console.log(`  Sync complete! Added: ${added} | Skipped: ${skipped} | Errors: ${errors}`);
  console.log('='.repeat(60) + '\n');
  process.exit(0);
}

run().catch(err => { console.error('Fatal error:', err); process.exit(1); });
