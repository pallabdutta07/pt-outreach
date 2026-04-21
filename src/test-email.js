/**
 * test-email.js — Generates a sample email without touching Gmail, Sheets, or GHL
 * Run: node src/test-email.js
 */

require('dotenv').config();
const { generatePersonalizedEmail } = require('./claude');

const sampleContact = {
  practiceName: 'Nurowav TMS',
  scrapedName: 'Samantha Wyckoff',
  credentials: 'PhD, Licensed Psychologist',
  specialties: 'Anxiety, Depression, PTSD, Insomnia, Trauma',
  scrapedAddress: '1420 Walnut Street Suite 1012 Philadelphia, PA 19102',
  phone: '(267) 209-7952',
  sessionTypes: 'In-person, Online',
  yearsInPractice: '8',
  bio: 'I specialize in helping adults navigate anxiety, depression, and trauma using evidence-based approaches including CBT and somatic therapies. I believe in treating the whole person and helping patients find approaches that work for their unique nervous system.',
};

async function test() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST — Generating sample email in Tauna\'s voice');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const email = await generatePersonalizedEmail(sampleContact);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  GENERATED EMAIL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(email);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Word count: ${email.split(/\s+/).length} words`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

test().catch(console.error);
