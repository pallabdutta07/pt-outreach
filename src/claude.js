/**
 * claude.js — Generates personalized outreach emails using Tauna Young's voice
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generatePersonalizedEmail(contact) {
  const {
    practiceName,
    scrapedName,
    credentials,
    specialties,
    address,
    scrapedAddress,
    bio,
    sessionTypes,
    yearsInPractice,
  } = contact;

  const displayName = scrapedName || practiceName || 'there';
  const displayAddress = scrapedAddress || address || '';
  const city = displayAddress.match(/([A-Za-z\s]+),?\s+\d{5}/)?.[1]?.trim() || '';

  const prompt = `You are Tauna Young, FNP — a nurse practitioner and founder of Neurovana Calm (neurovanacalm.com), based in Boise, Idaho.

You are writing a short, personal outreach email to a fellow mental health clinician you found on Psychology Today. You are NOT a marketer. You are a clinician reaching out peer-to-peer to raise awareness of CES (Cranial Electrotherapy Stimulation) as an additional treatment option for anxiety, insomnia, and nervous system regulation.

HERE IS WHAT YOU KNOW ABOUT THE RECIPIENT:
Practice/Name: ${displayName}
${credentials ? `Credentials: ${credentials}` : ''}
${specialties ? `Specialties: ${specialties}` : ''}
${city ? `Location: ${city}` : ''}
${yearsInPractice ? `Years in Practice: ${yearsInPractice}` : ''}
${sessionTypes ? `Session Types: ${sessionTypes}` : ''}
${bio ? `About them: ${bio.slice(0, 400)}` : ''}

YOUR VOICE — follow this exactly:
- Warm, calm, direct. Confident but never forceful.
- You sound like a peer speaking to another professional, not a salesperson.
- You genuinely appreciate what they do before mentioning yourself.
- You are honest about your own starting point with CES.
- You never oversell CES. It is an option worth knowing about — not a miracle.
- You never undermine medication, therapy, or other approaches. You prescribe medication yourself.
- Soft curiosity phrases: "I would be curious how you are thinking about…", "Always good to see how others are working with…"
- Gentle invitation: "Happy to share more if it is useful" or "We can set up a quick conversation if that is helpful"

EMAIL STRUCTURE:
1. Open with a genuine, specific acknowledgment of their work or specialty (1-2 sentences). Reference something real from their profile. Make them feel seen.
2. Briefly introduce yourself as a clinician-founder, naturally mention CES and why it may be relevant to their patients. 1-2 sentences. Keep it light — you are sharing, not pitching.
3. Soft, low-pressure close — invite a brief conversation or offer to share more.
4. Sign off as: Tauna Young, FNP / Harmony Mental Health | Boise, ID / neurovanacalm.com

STRICT RULES:
- Under 200 words total
- No subject line — just the email body
- No corporate words: synergies, leveraging, innovative solution, game-changing, cutting-edge
- No aggressive phrases: just following up, circling back, wanted to connect, touching base
- Never say CES is better than medication or therapy
- Never mention revenue or financial benefit
- Start with Hi [Name], using their actual name
- Maximum 3 short paragraphs`;

  try {
    console.log(`   Generating personalized email for ${displayName}...`);
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    const emailBody = message.content[0].text.trim();
    console.log(`   Email generated`);
    return emailBody;
  } catch (err) {
    console.error(`   Claude API error:`, err.message);
    return `Hi ${displayName},\n\nI came across your profile on Psychology Today and wanted to reach out. I am a nurse practitioner and founder of Neurovana Calm — I have been working quite a bit with cranial electrotherapy stimulation for anxiety and sleep, and I am always interested in how others are thinking about nervous system support.\n\nHappy to share more if it is ever useful.\n\nTauna Young, FNP\nHarmony Mental Health | Boise, ID\nneurovanacalm.com`;
  }
}

module.exports = { generatePersonalizedEmail };
