/**
 * index.js — Main automation orchestrator
 *
 * Flow:
 *   1. Poll Gmail for unread Psychology Today emails
 *   2. Parse contact info from each email
 *   3. Scrape Psychology Today profile for enriched data
 *   4. Generate personalized follow-up email with Claude AI
 *   5. Log everything to Google Sheets
 *   6. Create contact + add to pipeline in GoHighLevel
 *   7. Repeat every POLL_INTERVAL_MINUTES minutes
 */

require('dotenv').config();

const { fetchPsychologyTodayEmails } = require('./gmail');
const { scrapeProfile } = require('./scraper');
const { generatePersonalizedEmail } = require('./claude');
const { appendLeadToSheet } = require('./sheets');
const { createGHLContact, addToGHLPipeline, lookupPipelineIds } = require('./ghl');

const POLL_INTERVAL_MS = (parseInt(process.env.POLL_INTERVAL_MINUTES) || 15) * 60 * 1000;

// ── Startup check ─────────────────────────────────────────────────────────────
function checkEnvVars() {
  const required = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
    'ANTHROPIC_API_KEY',
    'GOOGLE_SHEET_ID',
    'GHL_API_KEY',
    'GHL_LOCATION_ID',
  ];

  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(k => console.error(`   • ${k}`));
    console.error('\nCopy .env.example to .env and fill in all values.\n');
    process.exit(1);
  }

  const pipelineConfigured = process.env.GHL_PIPELINE_ID && process.env.GHL_STAGE_ID;
  if (!pipelineConfigured) {
    console.warn('\n⚠️  GHL_PIPELINE_ID or GHL_STAGE_ID not set.');
    console.warn('   Run: node src/setup-ghl.js  to find your pipeline IDs.\n');
  }
}

// ── Process a single contact end-to-end ──────────────────────────────────────
async function processContact(contact) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Processing: ${contact.practiceName}`);
  console.log(`${'─'.repeat(60)}`);

  // Step 1: Enrich with profile scrape
  let enrichedContact = { ...contact };
  if (contact.profileUrl) {
    const profileData = await scrapeProfile(contact.profileUrl);
    enrichedContact = { ...enrichedContact, ...profileData };
  } else {
    console.log('   ⚠️  No profile URL found in email — using email data only');
  }

  // Step 2: Generate personalized email
  const personalizedEmail = await generatePersonalizedEmail(enrichedContact);

  // Step 3: Create GHL contact
  const ghlContactId = await createGHLContact(enrichedContact);

  // Step 4: Add to GHL pipeline
  if (ghlContactId) {
    await addToGHLPipeline(
      ghlContactId,
      enrichedContact.scrapedName || enrichedContact.practiceName
    );
  }

  // Step 5: Log to Google Sheets
  await appendLeadToSheet(enrichedContact, personalizedEmail, ghlContactId || '');

  console.log(`\n✅ Done: ${enrichedContact.practiceName || 'Unknown'}`);
  console.log(`\n📝 Generated Email Preview:\n`);
  console.log(personalizedEmail.split('\n').map(l => `   ${l}`).join('\n'));
}

// ── Main run loop ─────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🔍 Starting Psychology Today outreach automation...\n');

  try {
    const contacts = await fetchPsychologyTodayEmails();

    if (contacts.length === 0) {
      console.log('   No new emails to process.\n');
      return;
    }

    console.log(`\n📨 Processing ${contacts.length} new contact(s)...\n`);

    for (const contact of contacts) {
      await processContact(contact);
      // Brief pause between contacts to be respectful to APIs
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`\n🎉 Run complete. Processed ${contacts.length} contact(s).\n`);
  } catch (err) {
    console.error('\n❌ Automation error:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(60));
  console.log('  Psychology Today Outreach Automation');
  console.log(`  Polling every ${process.env.POLL_INTERVAL_MINUTES || 15} minutes`);
  console.log('═'.repeat(60));

  checkEnvVars();

  // Run immediately on startup
  await run();

  // Then run on interval
  console.log(`⏰ Next check in ${process.env.POLL_INTERVAL_MINUTES || 15} minutes...\n`);
  setInterval(async () => {
    await run();
    console.log(`⏰ Next check in ${process.env.POLL_INTERVAL_MINUTES || 15} minutes...\n`);
  }, POLL_INTERVAL_MS);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
