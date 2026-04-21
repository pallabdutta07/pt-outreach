require('dotenv').config();
const axios = require('axios');
const GHL_BASE = 'https://services.leadconnectorhq.com';
const ghlHeaders = () => ({ Authorization: `Bearer ${process.env.GHL_API_KEY}`, 'Content-Type': 'application/json', Version: '2021-07-28' });

async function lookupPipelineIds() {
  try {
    const res = await axios.get(`${GHL_BASE}/opportunities/pipelines`, { headers: ghlHeaders(), params: { locationId: process.env.GHL_LOCATION_ID } });
    const pipelines = res.data?.pipelines || [];
    pipelines.forEach(p => { console.log(`Pipeline: "${p.name}" -> ${p.id}`); p.stages?.forEach(s => console.log(`  Stage: "${s.name}" -> ${s.id}`)); });
    return pipelines;
  } catch (err) { console.error('GHL lookup failed:', err.response?.data || err.message); return []; }
}

function parseAddress(address) {
  if (!address) return {};
  const zipMatch = address.match(/(\d{5})/);
  const zip = zipMatch ? zipMatch[1] : '';
  const cityMatch = address.match(/([A-Za-z\s]+),?\s+(?:[A-Z]{2}\s+)?\d{5}/);
  const city = cityMatch ? cityMatch[1].trim() : '';
  const stateMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  const state = stateMatch ? stateMatch[1] : '';
  return { address1: address, city, state, postalCode: zip, country: 'US' };
}

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return '';
}

async function createGHLContact(contact) {
  const addressParts = parseAddress(contact.scrapedAddress || contact.address || '');
  const phone = formatPhone(contact.scrapedPhone || contact.phone || '');
  const name = contact.scrapedName || contact.practiceName || '';
  const [firstName, ...lastParts] = name.split(' ');
  const lastName = lastParts.join(' ') || '(Practice)';
  const payload = { locationId: process.env.GHL_LOCATION_ID, firstName, lastName, companyName: contact.practiceName || '', source: 'Psychology Today', tags: ['psychology-today', 'pt-outreach'], ...addressParts };
  if (phone) payload.phone = phone;
  if (contact.website) payload.website = contact.website;
  console.log(`   Creating GHL contact: ${name}`);
  try {
    const res = await axios.post(`${GHL_BASE}/contacts/`, payload, { headers: ghlHeaders() });
    const contactId = res.data?.contact?.id;
    console.log(`   GHL contact created: ${name} (${contactId})`);
    return contactId;
  } catch (err) { console.error(`   GHL contact creation failed:`, JSON.stringify(err.response?.data || err.message)); return null; }
}

async function addToGHLPipeline(contactId, contactName) {
  if (!contactId || !process.env.GHL_PIPELINE_ID || !process.env.GHL_STAGE_ID) { console.log('   Skipping GHL pipeline - IDs not set'); return null; }
  const payload = { locationId: process.env.GHL_LOCATION_ID, contactId, pipelineId: process.env.GHL_PIPELINE_ID, pipelineStageId: process.env.GHL_STAGE_ID, title: `${contactName} - Psychology Today`, status: 'open', source: 'Psychology Today' };
  try {
    const res = await axios.post(`${GHL_BASE}/opportunities/`, payload, { headers: ghlHeaders() });
    const oppId = res.data?.opportunity?.id;
    console.log(`   Added to GHL pipeline: ${contactName} (${oppId})`);
    return oppId;
  } catch (err) { console.error(`   GHL pipeline add failed:`, JSON.stringify(err.response?.data || err.message)); return null; }
}

module.exports = { createGHLContact, addToGHLPipeline, lookupPipelineIds };
