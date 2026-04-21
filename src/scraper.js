/**
 * scraper.js — Fetches public data from a Psychology Today profile URL
 *
 * Note: PT uses some bot-detection. We use realistic headers and
 * a short delay to be respectful. If a profile blocks scraping,
 * we fall back gracefully to email-extracted data only.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
};

/**
 * Sleep helper — be polite to PT servers
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape a Psychology Today profile page
 * Returns enriched profile data or empty object on failure
 */
async function scrapeProfile(profileUrl) {
  if (!profileUrl) return {};

  // Small delay to avoid rate limiting
  await sleep(2000 + Math.random() * 1000);

  try {
    console.log(`   🔍 Fetching profile: ${profileUrl}`);

    const res = await axios.get(profileUrl, {
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(res.data);

    // ── Name ──────────────────────────────────────────────────────────────
    const name =
      $('h1.profile-title').text().trim() ||
      $('[class*="profile-name"]').first().text().trim() ||
      $('h1').first().text().trim() ||
      '';

    // ── Credentials / Title ───────────────────────────────────────────────
    const credentials =
      $('[class*="credentials"]').first().text().trim() ||
      $('[class*="degree"]').first().text().trim() ||
      '';

    // ── Specialties ───────────────────────────────────────────────────────
    const specialties = [];
    $('[class*="specialty"], [class*="issue"], [class*="topic"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 60 && !specialties.includes(text)) {
        specialties.push(text);
      }
    });

    // ── Address ───────────────────────────────────────────────────────────
    const address =
      $('[class*="address"]').first().text().replace(/\s+/g, ' ').trim() ||
      $('[itemprop="address"]').text().replace(/\s+/g, ' ').trim() ||
      '';

    // ── Phone ─────────────────────────────────────────────────────────────
    const phone =
      $('[class*="phone"]').first().text().trim() ||
      $('[itemprop="telephone"]').text().trim() ||
      '';

    // ── Website ───────────────────────────────────────────────────────────
    const website =
      $('a[class*="website"]').attr('href') ||
      $('a[href*="http"]:contains("Website")').attr('href') ||
      '';

    // ── Insurance ─────────────────────────────────────────────────────────
    const insurance = [];
    $('[class*="insurance"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 80 && !insurance.includes(text)) {
        insurance.push(text);
      }
    });

    // ── Session types ─────────────────────────────────────────────────────
    const sessionTypes = [];
    $('[class*="session-type"], [class*="format"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 40 && !sessionTypes.includes(text)) {
        sessionTypes.push(text);
      }
    });

    // ── Bio / About ───────────────────────────────────────────────────────
    const bio =
      $('[class*="about-section"], [class*="bio"]').first().text().replace(/\s+/g, ' ').trim().slice(0, 800) ||
      '';

    // ── Years in practice ─────────────────────────────────────────────────
    const yearsMatch = res.data.match(/(\d+)\s+years? in practice/i);
    const yearsInPractice = yearsMatch ? yearsMatch[1] : '';

    const profile = {
      scrapedName: name,
      credentials,
      specialties: specialties.slice(0, 10).join(', '),
      scrapedAddress: address,
      scrapedPhone: phone,
      website,
      insurance: insurance.slice(0, 5).join(', '),
      sessionTypes: sessionTypes.join(', '),
      bio,
      yearsInPractice,
    };

    console.log(`   ✅ Profile scraped: ${name || 'name not found on page'}`);
    return profile;
  } catch (err) {
    console.log(`   ⚠️  Could not scrape profile (${err.message}) — using email data only`);
    return {};
  }
}

module.exports = { scrapeProfile };
