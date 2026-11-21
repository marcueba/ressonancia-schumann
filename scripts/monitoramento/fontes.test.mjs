import test from 'node:test';
import assert from 'node:assert/strict';
import { assessSources } from './fontes.mjs';
import { resolvePolicy } from './politica.mjs';

const NOW = '2026-11-21T18:00:00.000Z';
const HOUR = 3_600_000;
const SHA = 'a'.repeat(64);
const good = (data) => ({status:200, elapsedMs:50, error:null, data});
const error = (status, code) => ({status, elapsedMs:50, error:null, data:{error:code}});
const evaluate = (p, policy) => Object.fromEntries(assessSources(p,NOW,policy).map(c => [c.id,c]));

function solar(configure = () => {}) {
  const time = '2026-11-21T17:30:00Z';
  const metadata = () => ({state:'available', timePrecision:'timestamp', observedAt:time});
  const data = {success:true, available:true, timestamp:'2026-11-21T17:59:00Z',
    currentXRay:{flux:0.000023}, solarWindSpeed:300, protonDensity:0, bz:0, bt:4,
    solarFlux:125, sunspots:0, flares:null, productErrors:{}, productMetadata:{
      xray:metadata(),windSpeed:metadata(),density:metadata(),bz:metadata(),bt:metadata(),f107:metadata(),
      regions:{state:'available',timePrecision:'date',observedDate:'2026-11-20'}, flares:{state:'absent'}
    }};
  configure(data);
  return good(data);
}
function numeric(overrides = {}) {
  const withFrequencies = overrides.availability !== 'unavailable';
  const base = {available:withFrequencies, availability:'available', is_demo:false, source_type:'derived_spectrogram',
    derived_from_image:true, is_primary_measurement:false, timestamp:null, collected_at:'2026-11-21T17:59:00Z',
    source_updated_at:'2026-11-21T14:56:00-03:00', estimated_observation_at:withFrequencies ? '2026-11-21T17:36:00Z' : null};
  if (withFrequencies) {
    Object.assign(base, {fundamental:{frequency:7.8}, mode2:{frequency:14}, mode3:{frequency:20}, mode4:{frequency:26},
      mode5:{frequency:overrides.availability === 'partial' ? null : 32}});
  }
  return good({...base,...overrides});
}
function archive() {
  const channel = (name) => ({channel:name,imageOrigin:'archive',available:true,sha256:SHA,
    imageUrl:'/api/bgs/spectrograms/'+name+'/'+SHA+'.jpg',observedPeriod:{date:'2026-11-14',basis:'image_verified_by_sha256'},
    credit:'British Geological Survey © UKRI 2026', checkedAt:null,nextCheckAt:null,fetchedAt:null,error:null});
  return good({channels:{north:channel('north'),east:channel('east')}});
}

test('a 200 with an invalid API payload differs from an incomplete probe', () => {
  for (const error of ['unexpected_content_type','invalid_json']) {
    const result = evaluate({history:{status:200,error}})['elf-history'];
    assert.equal(result.condition, 'backend_error');
    assert.equal(result.alertable, true);
  }
  const result = evaluate({history:{status:200,error:'body_read_error'}})['elf-history'];
  assert.equal(result.condition, 'probe_error');
  assert.equal(result.alertable, false);
});

test('NOAA handles partial failure, zero readings and a legitimately empty flare catalogue', () => {
  const result=evaluate({solar:solar((d) => {d.productMetadata.windSpeed={state:'unavailable',error:'timeout'}; d.solarWindSpeed=null;})});
  assert.equal(result['noaa-solar'].condition,'ok');
  assert.equal(result['noaa-wind-speed'].condition,'source_unavailable');
  assert.equal(result['noaa-wind-speed'].alertable,true);
  assert.equal(result['noaa-bz'].condition,'ok');
  assert.equal(result['noaa-density'].condition,'ok');
  assert.equal(result['noaa-flares'].condition,'ok');
  assert.equal(result['noaa-flares'].reason,'valid_empty_event_catalogue');
  assert.equal(result['noaa-regions'].observationAgeDays,1);
  assert.equal(result['noaa-regions'].observedAt,null);
});

test('fresh solar route does not hide stale product or invent a Kp observation at check time', () => {
  const result=evaluate({
    solar:solar((d) => {d.productMetadata.xray.observedAt='2026-11-21T17:00:00Z';}),
    geomagnetic:good({success:true,available:true,currentKp:0,timestamp:'2026-11-21T12:00:00Z'})
  });
  assert.equal(result['noaa-xray'].observationAgeMs,HOUR);
  assert.equal(result['noaa-xray'].condition,'stale');
  assert.equal(result['noaa-xray'].alertable,true);
  assert.equal(result['noaa-kp'].observedAt,'2026-11-21T12:00:00.000Z');
  assert.equal(result['noaa-kp'].observationAgeMs,6*HOUR);
  assert.equal(result['noaa-kp'].condition,'stale');
  assert.equal(result['noaa-solar'].lastValidReceivedAt,NOW);
  const adjusted = evaluate({
    solar:solar((d) => {d.productMetadata.xray.observedAt='2026-11-21T17:00:00Z';}),
    geomagnetic:good({success:true,available:true,currentKp:0,timestamp:'2026-11-21T12:00:00Z'})
  }, resolvePolicy({ noaaFastMaxAgeMs:2*HOUR, noaaKpMaxAgeMs:7*HOUR }));
  assert.equal(adjusted['noaa-xray'].condition,'ok');
  assert.equal(adjusted['noaa-kp'].condition,'ok');
});

test('date-only F10.7 uses civil age, while invalid and future clocks do not prove staleness', () => {
  const result = evaluate({solar:solar((d) => {
    d.productMetadata.f107={state:'available',timePrecision:'date',observedDate:'2026-11-18'};
    d.productMetadata.xray.observedAt='2026-11-21T18:30:00Z';
    d.productMetadata.windSpeed.observedAt='2026-02-31T00:00:00Z';
    d.productMetadata.bt.observedAt='2026-11-21T08:00:00-00:00';
  })});
  const f107 = result['noaa-f107'];
  assert.equal(f107.condition,'stale');
  assert.equal(f107.observedAt,null);
  assert.equal(f107.observationAgeMs,null);
  assert.equal(f107.observationAgeDays,3);
  assert.equal(result['noaa-xray'].reason,'future_observation_time');
  for (const key of ['noaa-xray','noaa-wind-speed','noaa-bt']) {
    assert.equal(result[key].condition,'observation_unknown');
    assert.equal(result[key].observedAt,null);
    assert.equal(result[key].alertable,false);
  }
});

test('an old catalogued flare is valid and no freshness SLA is inferred from the event time', () => {
  const result = evaluate({solar:solar((d) => {
    d.flares='M1.2';
    d.productMetadata.flares={state:'available',timePrecision:'timestamp',observedAt:'2026-09-01T14:00:00Z'};
  })});
  assert.equal(result['noaa-flares'].condition,'ok');
  assert.equal(result['noaa-flares'].alertable,false);
});

test('Tomsk JSON keeps provider retrieval, publication and estimate distinct from an observation', () => {
  const result = evaluate({current:numeric({availability:'partial'})})['tomsk-numeric'];
  assert.equal(result.condition,'partial');
  assert.equal(result.sourceQueriedAt,'2026-11-21T17:59:00.000Z');
  assert.equal(result.sourceUpdatedAt,'2026-11-21T17:56:00.000Z');
  assert.equal(result.estimatedObservationAt,'2026-11-21T17:36:00.000Z');
  assert.equal(result.observedAt,null);
  assert.equal(result.alertable,false);
  const historical = evaluate({current:numeric({is_historical:true})})['tomsk-numeric'];
  assert.equal(historical.condition,'stale');
  assert.equal(historical.observedAt,null);
  assert.equal(historical.alertable,false);
});

test('a Tomsk 200 does not mask source unavailability or establish a new observation', () => {
  const result = evaluate({current:numeric({available:false,availability:'unavailable',availability_reason:'source_unavailable'})})['tomsk-numeric'];
  assert.equal(result.condition,'source_unavailable');
  assert.equal(result.lastValidReceivedAt,undefined);
  assert.equal(result.alertable,true);
  const withoutModes = evaluate({current:numeric({availability:'unavailable',availability_reason:'no_valid_frequencies'})})['tomsk-numeric'];
  assert.equal(withoutModes.condition,'observation_unknown');
  assert.equal(withoutModes.routeHealthy,true);
  assert.equal(withoutModes.lastValidReceivedAt,undefined);
  assert.equal(withoutModes.alertable,false);
  assert.equal(evaluate({current:numeric({timestamp:'2026-11-21T12:00:00Z'})})['tomsk-numeric'].reason,'invalid_tomsk_numeric_provenance');
});

test('known harmonics without a fundamental are a legitimate partial Tomsk response', () => {
  const current = numeric({availability:'partial', fundamental:{frequency:null}});
  const result = evaluate({current})['tomsk-numeric'];
  assert.equal(result.condition,'partial');
  assert.equal(result.alertable,false);
  current.data.availability = 'available';
  assert.equal(evaluate({current})['tomsk-numeric'].condition,'backend_error');
});

test('Tomsk JPEG digest validates received bytes without inferring observation time', () => {
  const result = evaluate({tomskImage:{status:200,error:null,elapsedMs:40,contentType:'image/jpeg',digest:SHA}})['tomsk-jpeg'];
  assert.equal(result.condition,'observation_unknown');
  assert.equal(result.lastValidReceivedAt,NOW);
  assert.equal(result.digest,SHA);
  assert.equal(result.observedAt,null);
  assert.equal(result.alertable,false);
});

test('bounded upstream errors remain distinct from backend/decoder and monitor errors', () => {
  let result = evaluate({solar:error(503,'noaa_products_unavailable'), geomagnetic:error(503,'timeout'),tomskImage:error(504,'upstream_timeout')});
  for (const id of ['noaa-solar','noaa-kp','tomsk-jpeg']) {
    assert.equal(result[id].condition,'source_unavailable');
    assert.equal(result[id].alertable,true);
  }
  result = evaluate({tomskImage:error(503,'decoder_busy'), history:error(503,'history_unavailable'),bgs:{status:null,error:'timeout'}});
  assert.equal(result['tomsk-jpeg'].condition,'backend_error');
  assert.equal(result['elf-history'].condition,'backend_error');
  assert.equal(result['elf-history'].dependency,'history_storage');
  assert.equal(result['bgs-north'].condition,'probe_error');
  assert.equal(result['bgs-north'].alertable,false);
});

test('BGS archive never ages into a provider outage but invalid archive flags a local failure', () => {
  const bgs=archive();
  const initial=evaluate({bgs});
  for (const id of ['bgs-north','bgs-east']) {
    assert.equal(initial[id].condition,'archived');
    assert.equal(initial[id].observationAgeDays,7);
    assert.equal(initial[id].observedAt,null);
    assert.equal(initial[id].alertable,false);
    assert.equal(initial[id].sourceQueriedAt,null);
  }
  bgs.data.channels.north.error='material_unverified';
  const retained=evaluate({bgs})['bgs-north'];
  assert.equal(retained.condition,'archived');
  assert.equal(retained.reason,'material_unverified_retained_archive');
  assert.equal(retained.alertable,false);
  bgs.data.channels.east.available=false;
  bgs.data.channels.east.error='archive_invalid';
  const corrupted=evaluate({bgs});
  assert.equal(corrupted['bgs-north'].condition,'archived');
  assert.equal(corrupted['bgs-east'].condition,'backend_error');
  assert.equal(corrupted['bgs-east'].reason,'archive_invalid');
  assert.equal(corrupted['bgs-east'].alertable,true);
});

test('history reports latest recorded time and blocked observational freshness separately', () => {
  const result=evaluate({history:good([{timestamp:'2026-09-30T07:38:13+00:00',derivedFromImage:true},{timestamp:'2026-12-01T00:00:00Z'}])})['elf-history'];
  assert.equal(result.condition,'blocked');
  assert.equal(result.latestRecordAt,'2026-09-30T07:38:13.000Z');
  assert.equal(result.observedAt,null);
  assert.equal(result.alertable,false);
  assert.equal(result.invalidRecordedTimeCount,1);
  const empty=evaluate({history:good([])})['elf-history'];
  assert.equal(empty.condition,'blocked');
  assert.equal(empty.latestRecordAt,null);
  assert.equal(empty.recordCount,0);
});

test('omitted probes create no outcome and an ambiguous monitor clock fails closed', () => {
  assert.deepEqual(assessSources({},NOW),[]);
  assert.throws(() => assessSources({},'2026-11-21T18:00:00'),TypeError);
});
