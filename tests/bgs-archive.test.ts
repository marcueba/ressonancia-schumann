import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBgsSpectrogramService } from '../server/services/bgs-spectrogram';
import { BGS_ORIGINAL_URLS, BGS_SOURCE_PAGE_URL } from '../shared/bgs';
import type { BgsChannel, BgsObservedPeriod } from '../shared/bgs';

const archiveDir = fileURLToPath(new URL('../server/assets/bgs', import.meta.url));
const fixed = { north: 'north-channel1.jpg', east: 'east-channel2.jpg' } as const;
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const now = Date.parse('2030-01-01T12:00:00Z');
const day = 86_400_000;
const period: BgsObservedPeriod = { label: '05/11/2026 (data inscrita na imagem)', date: '2026-11-05', year: 2026, basis: 'image_verified_by_sha256' };
const page = Object.entries(BGS_ORIGINAL_URLS).map(([channel, url]) => `<a href="${url}" title="Channel ${channel === 'north' ? '1 North' : '2 East'}">Daily spectrogram</a>`).join('');
const jpeg = (bytes: Buffer) => new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } });
const html = () => new Response(page, { headers: { 'Content-Type': 'text/html' } });

async function fixtureArchive() {
  const dir = await mkdtemp(path.join(tmpdir(), 'bgs-archive-test-'));
  const manifest = JSON.parse(await readFile(path.join(archiveDir, 'manifest.json'), 'utf8'));
  for (const channel of ['north', 'east'] as BgsChannel[]) {
    await writeFile(path.join(dir, fixed[channel]), await readFile(path.join(archiveDir, fixed[channel])));
  }
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  return { dir, manifest };
}

test('real archived images survive fresh service instances and origin failure without fabricated download time', async () => {
  const manifest = JSON.parse(await readFile(path.join(archiveDir, 'manifest.json'), 'utf8'));
  for (let instance = 0; instance < 2; instance++) {
    let calls = 0;
    const service = createBgsSpectrogramService({ archiveDir, now: () => now, fetchSource: (async () => { calls++; return new Response(null, { status: 503 }); }) as typeof fetch });
    // A direct immutable image request after restart initializes local bytes, without HTTP.
    for (const entry of manifest.images) {
      assert.deepEqual(await service.getImage(entry.channel, entry.sha256), await readFile(path.join(archiveDir, entry.file)));
    }
    assert.equal(calls, 0);
    const metadata = await service.getMetadata();
    for (const channel of ['north', 'east'] as BgsChannel[]) {
      const item = metadata.channels[channel];
      assert.equal(item.available, true);
      assert.equal(item.imageOrigin, 'archive');
      assert.equal(item.fetchedAt, null);
      assert.equal(item.cacheState, 'stale');
      assert.equal(item.error, 'upstream_http_error');
      assert.deepEqual(item.observedPeriod, period);
      assert.equal(item.credit, 'British Geological Survey © UKRI 2026');
      assert.equal(item.checkedAt, new Date(now).toISOString());
      assert.equal(item.nextCheckAt, new Date(now + day).toISOString());
    }
    await service.getMetadata();
    assert.equal(calls, 1, 'archive fallback must preserve the one-check daily failure cooldown');
  }
});

test('a valid but unapproved remote JPEG cannot replace either verified archived image', async () => {
  const unknown = await readFile(new URL('../public/og-image.jpg', import.meta.url));
  let calls = 0;
  const service = createBgsSpectrogramService({ archiveDir, now: () => now, fetchSource: (async (url) => { calls++; return String(url) === BGS_SOURCE_PAGE_URL ? html() : jpeg(unknown); }) as typeof fetch });
  const meta = await service.getMetadata();
  assert.equal(calls, 3);
  for (const channel of ['north', 'east'] as BgsChannel[]) {
    const image = await readFile(path.join(archiveDir, fixed[channel]));
    assert.equal(meta.channels[channel].sha256, hash(image));
    assert.equal(meta.channels[channel].imageOrigin, 'archive');
    assert.equal(meta.channels[channel].fetchedAt, null);
    assert.equal(meta.channels[channel].error, 'material_unverified');
    assert.equal(meta.channels[channel].cacheState, 'stale');
    assert.deepEqual(await service.getImage(channel, hash(image)), image);
    assert.equal(await service.getImage(channel, hash(unknown)), null);
    assert.deepEqual(meta.channels[channel].observedPeriod, period);
    assert.equal(meta.channels[channel].credit, 'British Geological Survey © UKRI 2026');
  }
});

test('archive manifest metadata is validated against channel, canonical source, date, year and exact credit', async (t) => {
  const mutations: Array<(entry: any) => void> = [
    entry => { entry.channel = 'east'; },
    entry => { entry.file = '../north-channel1.jpg'; },
    entry => { entry.originalUrl = 'https://example.invalid/image.jpg'; },
    entry => { entry.sha256 = '0'.repeat(64); },
    entry => { entry.observedPeriod.date = '2026-02-30'; },
    entry => { entry.observedPeriod.year = 2030; },
    entry => { entry.observedPeriod.label = 'Recent image'; },
    entry => { entry.year = 2030; },
    entry => { entry.credit = 'British Geological Survey © UKRI 2030'; },
  ];
  for (const mutate of mutations) {
    const fixture = await fixtureArchive();
    t.after(() => rm(fixture.dir, { recursive: true, force: true }));
    const north = fixture.manifest.images[0];
    const originalHash = north.sha256;
    mutate(north);
    await writeFile(path.join(fixture.dir, 'manifest.json'), JSON.stringify(fixture.manifest));
    const service = createBgsSpectrogramService({ archiveDir: fixture.dir, now: () => now, fetchSource: (async () => new Response(null, { status: 503 })) as typeof fetch });
    assert.equal(await service.getImage('north', originalHash), null);
    const meta = await service.getMetadata();
    assert.equal(meta.channels.north.available, false);
    assert.equal(meta.channels.north.imageOrigin, null);
    assert.equal(meta.channels.north.observedPeriod, null);
    assert.equal(meta.channels.north.credit, null);
    assert.equal(meta.channels.north.error, 'upstream_http_error', 'source failure remains distinct and visible');
  }
});

test('local corrupt bytes and a hash-matching non-JPEG are rejected without hiding the other archived channel', async (t) => {
  for (const makeApproved of [false, true]) {
    const fixture = await fixtureArchive();
    t.after(() => rm(fixture.dir, { recursive: true, force: true }));
    const invalid = Buffer.from('<html>not a spectrogram</html>');
    await writeFile(path.join(fixture.dir, fixed.north), invalid);
    const manifestEntry = fixture.manifest.images[0];
    const expectedHash = makeApproved ? hash(invalid) : manifestEntry.sha256;
    if (makeApproved) {
      manifestEntry.sha256 = expectedHash;
      await writeFile(path.join(fixture.dir, 'manifest.json'), JSON.stringify(fixture.manifest));
    }
    const registry = makeApproved ? { north: { [expectedHash]: period }, east: { [fixture.manifest.images[1].sha256]: period } } : undefined;
    const service = createBgsSpectrogramService({ archiveDir: fixture.dir, now: () => now, verifiedImages: registry, fetchSource: (async () => new Response(null, { status: 503 })) as typeof fetch });
    assert.equal(await service.getImage('north', expectedHash), null);
    const meta = await service.getMetadata();
    assert.equal(meta.channels.north.available, false);
    assert.equal(meta.channels.east.available, true);
    assert.equal(meta.channels.east.imageOrigin, 'archive');
  }
});

test('approved archive stays content-addressable after newer approved remote versions and cache eviction', async (t) => {
  const fixture = await fixtureArchive();
  t.after(() => rm(fixture.dir, { recursive: true, force: true }));
  const archivedNorth = await readFile(path.join(fixture.dir, fixed.north));
  const archivedEast = await readFile(path.join(fixture.dir, fixed.east));
  const versions = await Promise.all(['og-image.jpg', 'og-article-1.jpg', 'og-article-2.jpg'].map(name => readFile(new URL('../public/' + name, import.meta.url))));
  const verifiedImages = { north: Object.fromEntries([archivedNorth, ...versions].map(bytes => [hash(bytes), period])), east: { [hash(archivedEast)]: period } };
  let clock = now, version = 0;
  const service = createBgsSpectrogramService({ archiveDir: fixture.dir, verifiedImages, now: () => clock, fetchSource: (async (input) => String(input) === BGS_SOURCE_PAGE_URL ? html() : jpeg(String(input) === BGS_ORIGINAL_URLS.north ? versions[version] : archivedEast)) as typeof fetch });
  for (version = 0; version < versions.length; version++) {
    const meta = await service.getMetadata();
    assert.equal(meta.channels.north.imageOrigin, 'remote');
    assert.equal(meta.channels.north.fetchedAt, new Date(clock).toISOString());
    assert.deepEqual(meta.channels.north.observedPeriod, period);
    assert.equal(meta.channels.north.credit, 'British Geological Survey © UKRI 2026');
    clock += day;
  }
  assert.deepEqual(await service.getImage('north', hash(archivedNorth)), archivedNorth);
  assert.equal(await service.getImage('north', hash(versions[0])), null, 'older remote versions remain evicted, rather than growing the cache');
  assert.deepEqual(await service.getImage('north', hash(versions[1])), versions[1]);
  assert.deepEqual(await service.getImage('north', hash(versions[2])), versions[2]);
});
