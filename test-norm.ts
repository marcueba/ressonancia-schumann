import * as dotenv from 'dotenv';
dotenv.config();
import { normalizeAndPersistSunGeo } from './server/services/normalizer.js';

const rawData = {
  "status": "calm",
  "score": 38,
  "updated_at": "2026-09-11 21:30:09"
};

async function test() {
  const result = await normalizeAndPersistSunGeo(rawData);
  console.log(result ? 'OK' : 'FAIL');
}
test();
