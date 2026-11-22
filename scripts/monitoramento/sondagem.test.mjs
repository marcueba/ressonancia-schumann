import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { probe } from './sondagem.mjs';

const origin = 'http://127.0.0.1:41991';
const official = 'https://ressonanciaschumann.com';
const jpeg = Uint8Array.of(255, 216, 0, 170, 255, 217);
const expectedJpeg = createHash('sha256').update(jpeg).digest('hex');
const home = '<!DOCTYPE html><html><head><title>Ressonância Schumann</title></head><body><h1>Visão geral</h1></body></html>';
const json = (value, status = 200) => Response.json(value, { status });
const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const photo = (body = jpeg, type = 'image/jpeg') => new Response(body, { headers: { 'Content-Type': type } });

test('solicita somente os caminhos fixos em GET sem credenciais ou redirects', async () => {
  const paths = {
    home: '/', config: '/api/config', health: '/healthz', solar: '/api/solar', geomagnetic: '/api/geomagnetic',
    current: '/api/current', history: '/api/history?range=90d', bgs: '/api/bgs/spectrograms', tomskImage: '/api/spectrogram/tomsk',
  };
  for (const [key, path] of Object.entries(paths)) {
    const result = await probe(official, key, {
      fetcher: (url, options) => {
        assert.equal(url, official + path);
        assert.equal(options.method, 'GET');
        assert.equal(options.redirect, 'manual');
        assert.equal(options.credentials, 'omit');
        assert.equal(options.cache, 'no-store');
        assert.deepEqual(Object.keys(options.headers), ['accept']);
        assert.ok(options.signal instanceof AbortSignal);
        return key === 'home' ? html(home) : key === 'tomskImage' ? photo() : json({ test: true });
      },
    });
    assert.equal(result.status, 200);
    assert.equal(result.error, null);
    assert.ok(Number.isInteger(result.elapsedMs) && result.elapsedMs >= 0);
  }
});

test('rejeita destinos arbitrários, caminhos e opções inválidas antes de chamar fetch', async () => {
  const fetcher = () => assert.fail('não deve chamar fetch');
  for (const target of [
    'https://example.com', 'http://ressonanciaschumann.com', 'https://www.ressonanciaschumann.com',
    'https://ressonanciaschumann.com:444', official + '/api/config', official + '?override=1',
    official + '#hash', 'https://user:pass@ressonanciaschumann.com', 'http://127.0.0.1.example.com',
    'file:///etc/passwd', 'http://192.168.1.1',
  ]) await assert.rejects(probe(target, 'home', { fetcher }), TypeError);
  await assert.rejects(probe(origin, 'constructor', { fetcher }), TypeError);
  await assert.rejects(probe(origin, 'home', { fetcher, timeoutMs: 0 }), RangeError);
  await assert.rejects(probe(origin, 'home', { fetcher, timeoutMs: Infinity }), RangeError);
  for (const loopback of [origin, 'http://localhost:4321', 'http://[::1]:4321']) {
    assert.equal((await probe(loopback, 'home', {
      fetcher(url) {
        assert.equal(url, loopback + '/');
        return html(home);
      }
    })).error, null);
  }
});

test('verifica título ou H1 com entidades e tags, descartando o HTML bruto', async () => {
  for (const page of [
    home,
    '\ufeff<!-- comentário -->\n<html lang="pt"><title>Vis&atilde;o geral | Observatório</title></html>',
    '<!doctype html><html><h1><span>Vis&#227;o</span>&nbsp;GERAL</h1></html>',
  ]) {
    const result = await probe(origin, 'home', { fetcher: () => html(page) });
    assert.equal(result.contentType, 'text/html');
    assert.deepEqual(result.data, { expectedPage: true, coldStart: false });
    assert.doesNotMatch(JSON.stringify(result), /<!doctype|comentário/i);
  }
  const spoof = '<!doctype html><html><script>const html = "<h1>Visão geral</h1>"</script><!-- <title>Visão geral</title> --><body>Outra página</body></html>';
  const otherPage = await probe(origin, 'home', { fetcher: () => html(spoof) });
  assert.deepEqual(otherPage.data, { expectedPage: false, coldStart: false });
  const noRoot = await probe(origin, 'home', { fetcher: () => html('texto <h1>Visão geral</h1>') });
  assert.equal(noRoot.error, 'invalid_html');
});

test('distingue tela de inicialização de conteúdo publicado com carregamento comum', async () => {
  const pending = home.replace('</body>', '<p>Carregando dados do observatório…</p></body>');
  assert.deepEqual((await probe(origin, 'home', { fetcher: () => html(pending) })).data,
    { expectedPage: true, coldStart: false });
  const cold = '<!doctype html><html><title>Application Loading</title><h1>Your service is waking up</h1></html>';
  assert.deepEqual((await probe(origin, 'home', { fetcher: () => html(cold) })).data,
    { expectedPage: false, coldStart: true });
});

test('preserva HTTP 503 e o código de erro da aplicação sem copiar texto ou dados anexos', async () => {
  const failure = await probe(origin, 'history', {
    fetcher: () => json({ error: 'history_unavailable', message: 'não copiar', token: 'não copiar' }, 503),
  });
  assert.equal(failure.status, 503);
  assert.equal(failure.error, 'http_error');
  assert.deepEqual(failure.data, { error: 'history_unavailable' });
  const arbitrary = await probe(origin, 'config', { fetcher: () => json({ error: 'texto interno arbitrário' }, 500) });
  assert.equal(arbitrary.status, 500);
  assert.equal(arbitrary.error, 'http_error');
  assert.equal(arbitrary.data, undefined);
  const absent = await probe(origin, 'health', { fetcher: () => html('<html><h1>Absent</h1></html>', 404) });
  assert.equal(absent.status, 404);
  assert.equal(absent.error, 'http_error');
  assert.equal(absent.data, undefined);
});

test('não segue redirecionamento nem registra o destino recebido', async () => {
  let calls = 0;
  const result = await probe(origin, 'home', {
    fetcher(_url, { redirect }) {
      assert.equal(redirect, 'manual');
      calls += 1;
      return new Response(null, { status: 302, headers: { location: 'https://example.com/caminho' } });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 302);
  assert.equal(result.error, 'redirect');
  assert.doesNotMatch(JSON.stringify(result), /example\.com|caminho/);
});

test('mantém falha de rede sem status HTTP e não divulga exceções de transporte', async () => {
  const result = await probe(origin, 'config', {
    fetcher: () => { throw new Error('conexão falhou com detalhes internos'); },
  });
  assert.equal(result.status, null);
  assert.equal(result.error, 'network_error');
  assert.doesNotMatch(JSON.stringify(result), /detalhes internos/);
});

test('limita o tempo sem headers e também durante o consumo do corpo', async () => {
  const beforeHeaders = await probe(origin, 'config', {
    fetcher: () => new Promise(() => {}),
    timeoutMs: 10,
  });
  assert.equal(beforeHeaders.status, null);
  assert.equal(beforeHeaders.error, 'timeout');
  let canceled = false;
  const duringBody = await probe(origin, 'config', {
    fetcher: () => new Response(new ReadableStream({
      pull: () => new Promise(() => {}),
      cancel() { canceled = true; },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    timeoutMs: 10,
  });
  assert.equal(duringBody.status, 200);
  assert.equal(duringBody.error, 'timeout');
  assert.equal(canceled, true);
});

test('rejeita comprimento declarado excessivo e corta stream excessivo sem depender do header', async () => {
  let canceled = false;
  const declared = await probe(origin, 'bgs', {
    fetcher: () => new Response(new ReadableStream({ cancel() { canceled = true; } }), {
      headers: { 'Content-Type': 'application/json', 'Content-Length': '1048576' },
    }),
  });
  assert.equal(declared.status, 200);
  assert.equal(declared.error, 'body_too_large');
  assert.equal(canceled, true);
  canceled = false;
  const oversized = await probe(origin, 'tomskImage', {
    fetcher: () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 1)); },
      cancel() { canceled = true; },
    }), { headers: { 'Content-Type': 'image/jpeg' } }),
  });
  assert.equal(oversized.status, 200);
  assert.equal(oversized.error, 'body_too_large');
  assert.equal(oversized.digest, undefined);
  assert.equal(canceled, true);
});

test('separa tipo inesperado, JSON inválido e erro de leitura após headers', async () => {
  const wrongType = await probe(origin, 'solar', { fetcher: () => html(home) });
  assert.equal(wrongType.error, 'unexpected_content_type');
  const badJson = await probe(origin, 'solar', {
    fetcher: () => new Response('not json', { headers: { 'Content-Type': 'application/json' } }),
  });
  assert.equal(badJson.error, 'invalid_json');
  const bodyError = await probe(origin, 'solar', {
    fetcher: () => new Response(new ReadableStream({
      pull(controller) { controller.error(new Error('erro de leitura interno')); },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  });
  assert.equal(bodyError.status, 200);
  assert.equal(bodyError.error, 'body_read_error');
  assert.doesNotMatch(JSON.stringify(bodyError), /erro de leitura interno/);
});

test('Tomsk identifica tipo e marcadores JPEG e emite só o SHA-256 dos bytes', async () => {
  const good = await probe(origin, 'tomskImage', { fetcher: () => photo() });
  assert.equal(good.status, 200);
  assert.equal(good.contentType, 'image/jpeg');
  assert.equal(good.error, null);
  assert.equal(good.digest, expectedJpeg);
  assert.equal(good.data, undefined);
  const incomplete = await probe(origin, 'tomskImage', {
    fetcher: () => photo(Uint8Array.of(255, 216, 1, 2, 3)),
  });
  assert.equal(incomplete.error, 'invalid_jpeg');
  assert.equal(incomplete.digest, undefined);
  assert.equal((await probe(origin, 'tomskImage', { fetcher: () => photo(jpeg, 'text/plain') })).error,
    'unexpected_content_type');
});
