require('dotenv').config();
const { fetchPsychologyTodayEmails } = require('./gmail');
const { scrapeProfile } = require('./scraper');
const { generatePersonalizedEmail } = require('./claude');
const { appendLeadToSheet } = require('./sheets');
const { createGHLContact, addToGHLPipeline } = require('./ghl');

const BATCH_LIMIT = 50;

async function processContact(contact, index, total) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[${index}/${total}] Processing: ${contact.practiceName}`);
  console.log(`${'─'.repeat(60)}`);

  let enrichedContact = { ...contact };
  if (contact.profileUrl) {
    const profileData = await scrapeProfile(contact.profileUrl);
    enrichedContact = { ...enrichedContact, ...profileData };
  }

  const personalizedEmail = await generatePersonalizedEmail(enrichedContact);
  const ghlContactId = await createGHLContact(enrichedContact);

  if (ghlContactId) {
    await addToGHLPipeline(ghlContactId, enrichedContact.scrapedName || enrichedContact.practiceName);
  }

  await appendLeadToSheet(enrichedContact, personalizedEmail, ghlContactId || '');

  console.log(`\n📝 Generated Email:\n`);
  console.log(personalizedEmail.split('\n').map(l => `   ${l}`).join('\n'));
  console.log(`\n   Word count: ${personalizedEmail.split(/\s+/).length} words`);
}

async function runBatch() {
  console.log('\n' + '═'.repeat(60));
  console.log('  Psychology Today — Batch Run (max 50 emails)');
  console.log('═'.repeat(60) + '\n');

  const contacts = await fetchPsychologyTodayEmails(BATCH_LIMIT);

  if (contacts.length === 0) {
    console.log('No unread Psychology Today emails found.');
    console.log('Mark emails as unread in Gmail first.\n');
    process.exit(0);
  }

  const total = Math.min(contacts.length, BATCH_LIMIT);
  console.log(`Found ${contacts.length} unread email(s). Processing ${total}...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < total; i++) {
    try {
      await processContact(contacts[i], i + 1, total);
      successCount++;
    } catch (err) {
      errorCount++;
      console.error(`\n❌ Error processing ${contacts[i].practiceName}:`, err.message);
    }
    if (i < total - 1) await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  Batch complete!`);
  console.log(`  ✅ Successful: ${successCount}`);
  if (errorCount > 0) console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Check your Google Sheet for all results`);
  console.log(`  📋 Check GHL Psychology Today Leads pipeline`);
  console.log('═'.repeat(60) + '\n');
  process.exit(0);
}

runBatch().catch(err => { console.error('Fatal error:', err); process.exit(1); });
