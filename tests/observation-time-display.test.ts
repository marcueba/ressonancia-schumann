import assert from 'node:assert/strict';
import test from 'node:test';
import { formatObservationTime, parseObservationTime, formatNoaaObservationTime } from '../src/utils/observationTime';

test('old observation keeps its complete source date and UTC time', () => {
  assert.equal(formatObservationTime('2026-09-30T07:38:13+00:00', 'UTC'), '30/09/2026, 07:38:13 UTC');
  assert.equal(formatObservationTime('2026-09-30T04:38:13-03:00', 'UTC'), '30/09/2026, 07:38:13 UTC');
  assert.equal(parseObservationTime('2026-09-30T07:38:13+00:00')?.toISOString(), '2026-09-30T07:38:13.000Z');
});

test('São Paulo display includes full date and the offset that applies to the observation', () => {
  assert.equal(formatObservationTime('2026-09-30T07:38:13Z', 'America/Sao_Paulo'), '30/09/2026, 04:38:13 (São Paulo, UTC-03:00)');
  assert.equal(formatObservationTime('2018-11-05T04:00:00Z', 'America/Sao_Paulo'), '05/11/2018, 02:00:00 (São Paulo, UTC-02:00)');
  assert.equal(formatObservationTime('2026-01-01T01:00:00Z', 'America/Sao_Paulo'), '31/12/2025, 22:00:00 (São Paulo, UTC-03:00)');
});

test('missing, invalid or timezone-ambiguous timestamps have an honest unavailable state', () => {
  for (const value of [null, undefined, '', 'not-a-date', '2026-09-30', '2026-09-30T07:38:13',
    '2026-02-30T07:38:13Z', '2025-02-29T07:38:13Z', '2026-13-01T00:00:00Z',
    '2026-09-30T24:00:00Z', '2026-09-30T07:38:13-00:00', '2026-09-30T07:38:13+24:00']) {
    assert.equal(parseObservationTime(value), null, String(value));
    assert.equal(formatObservationTime(value, 'UTC'), 'Data da observação indisponível');
  }
  assert.equal(parseObservationTime('2024-02-29T12:00:00Z')?.toISOString(), '2024-02-29T12:00:00.000Z');
});

test('output does not depend on the viewer process timezone', () => {
  const originalTZ = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Pacific/Auckland', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      assert.equal(formatObservationTime('2026-09-30T07:38:13Z', 'UTC'), '30/09/2026, 07:38:13 UTC');
      assert.equal(formatObservationTime('2026-09-30T07:38:13Z', 'America/Sao_Paulo'), '30/09/2026, 04:38:13 (São Paulo, UTC-03:00)');
    }
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test('NOAA context fields without a suffix retain their UTC contract without relaxing other sources', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(formatNoaaObservationTime('2026-11-04T22:00:00', 'America/Sao_Paulo'), '04/11/2026, 19:00:00 (São Paulo, UTC-03:00)');
      assert.equal(formatNoaaObservationTime('2026-11-05T15:00:00', 'America/Sao_Paulo'), '05/11/2026, 12:00:00 (São Paulo, UTC-03:00)');
      assert.equal(formatNoaaObservationTime('2026-11-05 15:00:00.000', 'UTC'), '05/11/2026, 15:00:00 UTC');
      assert.equal(formatNoaaObservationTime('2026-11-05T15:00:00Z', 'UTC'), '05/11/2026, 15:00:00 UTC');
      assert.equal(formatNoaaObservationTime('2026-02-30T15:00:00', 'UTC'), 'Data da observação indisponível');
      assert.equal(formatObservationTime('2026-11-05T15:00:00', 'UTC'), 'Data da observação indisponível');
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
