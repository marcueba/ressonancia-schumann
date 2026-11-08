const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.join(__dirname, '..');
const source = path.join(root, 'server', 'assets', 'bgs');
const target = path.join(root, 'dist', 'bgs-archive');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
const expected = {
  north: ['north-channel1.jpg', 'https://geomag.bgs.ac.uk/images/currentSpectrogramCH1.jpg'],
  east: ['east-channel2.jpg', 'https://geomag.bgs.ac.uk/images/currentSpectrogramCH2.jpg'],
};
if (manifest.version !== 1 || manifest.sourcePageUrl !== 'https://geomag.bgs.ac.uk/research/inductioncoils.html' ||
    !Array.isArray(manifest.images) || manifest.images.length !== 2) throw new Error('Invalid BGS archive manifest');
const seen = new Set();
const verified = manifest.images.map(entry => {
  const allowed = Object.hasOwn(expected, entry.channel) && expected[entry.channel];
  const period = entry.observedPeriod;
  const time = period && Date.parse(period.date + 'T00:00:00Z');
  if (!allowed || seen.has(entry.channel) || entry.file !== allowed[0] || entry.originalUrl !== allowed[1] ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) || !period || period.basis !== 'image_verified_by_sha256' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(period.date) || !Number.isFinite(time) ||
      new Date(time).toISOString().slice(0, 10) !== period.date || period.year !== Number(period.date.slice(0, 4)) ||
      entry.year !== period.year || entry.credit !== `British Geological Survey © UKRI ${entry.year}` ||
      typeof period.label !== 'string' || !period.label.trim()) throw new Error('Invalid BGS archive entry');
  seen.add(entry.channel);
  const bytes = fs.readFileSync(path.join(source, entry.file));
  if (bytes.length > 5 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
    throw new Error(`BGS archive hash mismatch: ${entry.channel}`);
  }
  return { file: entry.file, bytes };
});
// Copy only the verified manifest and its two declared originals, never fixtures.
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const entry of verified) fs.writeFileSync(path.join(target, entry.file), entry.bytes);
fs.copyFileSync(path.join(source, 'manifest.json'), path.join(target, 'manifest.json'));
console.log('BGS archive: two original JPEGs and verified manifest copied to dist/bgs-archive');
