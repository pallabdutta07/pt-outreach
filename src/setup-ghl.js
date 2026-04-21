/**
 * setup-ghl.js — Run once to find your GHL pipeline and stage IDs
 *
 * PowerShell: node src/setup-ghl.js
 *
 * Copy the output IDs into your .env file as:
 *   GHL_PIPELINE_ID=...
 *   GHL_STAGE_ID=...
 */

require('dotenv').config();
const { lookupPipelineIds } = require('./ghl');

lookupPipelineIds();
