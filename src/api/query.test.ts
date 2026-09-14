import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildQuery, extractMessage } from './query.ts';

describe('buildQuery', () => {
  it('omits empty values so absent filters do not become literal "undefined"', () => {
    const qs = buildQuery({ q: undefined, site_id: null, page: 1, name: '' });
    assert.equal(qs, '?page=1');
  });

  it('returns an empty string when there is nothing to send', () => {
    assert.equal(buildQuery({}), '');
    assert.equal(buildQuery({ a: undefined }), '');
  });

  it('keeps false and zero, which are meaningful filters', () => {
    // max_balance=0 is "clients who have run out"; provisioned=false is "needs setup".
    // Dropping them as falsy would silently change what the operator asked for.
    const qs = buildQuery({ max_balance: 0, provisioned: false });
    assert.ok(qs.includes('max_balance=0'));
    assert.ok(qs.includes('provisioned=false'));
  });

  it('repeats a key for array values', () => {
    assert.equal(buildQuery({ site_ids: [1, 2] }), '?site_ids=1&site_ids=2');
  });

  it('escapes values that would otherwise break the URL', () => {
    const qs = buildQuery({ q: 'ana & beto?' });
    assert.ok(!qs.includes(' '));
    assert.ok(qs.includes('%26'));
  });
});


describe('extractMessage', () => {
  it('reads FastAPI HTTPException bodies', () => {
    assert.equal(extractMessage({ detail: 'Client not found.' }, 404), 'Client not found.');
  });

  it('reads BusinessException bodies', () => {
    // The backend uses two different shapes and the Flutter app depends on both, so the
    // client reads either rather than the server being changed.
    assert.equal(extractMessage({ message: 'Saldo insuficiente' }, 400), 'Saldo insuficiente');
  });

  it('unwraps a FastAPI validation error into something readable', () => {
    const body = { detail: [{ loc: ['body', 'tokens'], msg: 'Input should be greater than 0' }] };
    assert.equal(extractMessage(body, 422), 'tokens: Input should be greater than 0');
  });

  it('explains a network failure rather than showing "Request failed (0)"', () => {
    assert.match(extractMessage(undefined, 0), /reach the server/);
  });

  it('falls back to the status code when the body says nothing useful', () => {
    assert.equal(extractMessage({}, 500), 'Request failed (500).');
    assert.equal(extractMessage(null, 503), 'Request failed (503).');
  });
});
