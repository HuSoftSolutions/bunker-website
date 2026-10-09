const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Exercise the real public page rendering with database and modal dependencies isolated.
function loadPage(file, locations, params = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const loaded = { exports: {} };
  const stubComponent = ({ children }) => React.createElement('div', null, children);
  const mockRequire = (id) => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    if (id === 'next/navigation') return { useSearchParams: () => new URLSearchParams(params) };
    if (id === '@/hooks/useLocations') return { __esModule: true, default: () => ({ locations, loading: false }) };
    if (id === '@/hooks/useBusinessSettings') return { __esModule: true, default: () => ({ settings: { teesheetUrl: 'https://booking.example/open' }, loading: false }) };
    if (id === '@/providers/FirebaseProvider') return { useFirebase: () => ({}) };
    if (id.endsWith('/BookNowButton')) return { BookNowButton: () => React.createElement('button', null, 'Book Now') };
    return new Proxy({}, { get: () => stubComponent });
  };
  new Function('module', 'exports', 'require', output)(loaded, loaded.exports, mockRequire);
  return renderToStaticMarkup(React.createElement(loaded.exports.default));
}
const location = {
  id: 'test-town', name: 'Test Town', city: 'Albany, NY', openingMessage: 'Opening next spring',
  address: '123 Private Detail Street', phone: '555-1234', hoursFull: '9am to 10pm',
  url: 'https://booking.example/test-town', images: ['https://images.example/cover.jpg'],
  menus: [{ name: 'Dinner', pdf: 'https://menus.example/dinner.pdf' }],
};

test('coming soon listing keeps launch information and hides operational details even when populated', () => {
  const html = loadPage('app/(site)/location/page.tsx', [{ ...location, comingSoon: true }]);
  for (const text of ['Test Town', 'Coming Soon', 'Albany, NY', 'Opening next spring', 'cover.jpg']) assert.ok(html.includes(text), text);
  for (const text of ['123 Private Detail Street', '555-1234', '9am to 10pm', 'Book Now', '>Menu<']) assert.ok(!html.includes(text), text);
});

test('turning coming soon off restores regular details; legacy locations remain open', () => {
  for (const comingSoon of [false, undefined]) {
    const html = loadPage('app/(site)/location/page.tsx', [{ ...location, comingSoon }]);
    for (const text of ['123 Private Detail Street', '555-1234', 'Book Now', '>Menu<']) assert.ok(html.includes(text), text);
    assert.ok(!html.includes('Coming Soon'));
  }
});

test('minimal new location renders a useful launch card without an image placeholder', () => {
  const html = loadPage('app/(site)/location/page.tsx', [{ id: 'new-town', name: 'New Town', comingSoon: true }]);
  assert.ok(html.includes('New Town'));
  assert.ok(html.includes('Stay tuned for opening updates.'));
  assert.ok(!html.includes('No image available'));
});

test('direct booking links for unopened locations do not render a booking iframe', () => {
  const html = loadPage('app/(site)/teesheet/page.tsx', [{ ...location, comingSoon: true }], { locationId: location.id, url: location.url });
  assert.ok(html.includes('Coming Soon'));
  assert.ok(!html.includes('<iframe'));
});

test('open locations keep their booking iframe', () => {
  const html = loadPage('app/(site)/teesheet/page.tsx', [location], { locationId: location.id, url: location.url });
  assert.ok(html.includes('<iframe'));
  assert.ok(html.includes(location.url));
});

function loadCreator(existing = false) {
  const source = fs.readFileSync(path.join(__dirname, '../lib/locations/createLocation.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const writes = [];
  const loaded = { exports: {} };
  new Function('module', 'exports', 'require', output)(loaded, loaded.exports, (id) => {
    if (id === '@/data/locationConfig') return { FALLBACK_LOCATION_MAP: { latham: { name: 'Latham' } } };
    if (id === 'firebase/firestore') return {
      runTransaction: async (_db, callback) => callback({
        get: async () => ({ exists: () => existing }),
        set: (ref, payload) => writes.push({ ref, payload }),
      }),
    };
    throw new Error(`Unexpected import ${id}`);
  });
  return { create: (id, form) => loaded.exports.createLocation({ db: {}, locationRef: (id) => id }, id, form), writes };
}

test('new locations default to coming soon with trimmed public fields', async () => {
  const { create, writes } = loadCreator();
  assert.equal(await create(' new-town ', { name: ' New Town ', city: ' Albany ', openingMessage: ' Soon ' }), 'new-town');
  assert.deepEqual(writes, [{ ref: 'new-town', payload: { name: 'New Town', city: 'Albany', openingMessage: 'Soon', comingSoon: true, images: [] } }]);
});

test('creation cannot overwrite an existing database location', async () => {
  const { create, writes } = loadCreator(true);
  await assert.rejects(create('new-town', { name: 'New Town' }), /already exists/);
  assert.equal(writes.length, 0);
});

test('invalid, reserved, and fallback IDs are rejected before any write', async () => {
  const { create, writes } = loadCreator();
  for (const id of ['latham', 'constructor', 'bad/id', '', 'a'.repeat(81)]) {
    await assert.rejects(create(id, { name: 'Town' }));
  }
  await assert.rejects(create('valid-town', { name: ' ' }));
  assert.equal(writes.length, 0);
});

test('creation rejects unsafe images and allows an explicit open location', async () => {
  const { create, writes } = loadCreator();
  for (const image of ['javascript:alert(1)', 'http://example.com/image.jpg', 'invalid']) {
    await assert.rejects(create('new-town', { name: 'Town', images: [image] }), /HTTPS/);
  }
  assert.equal(writes.length, 0);
  await create('new-town', { name: 'Town', comingSoon: false, images: ['https://example.com/image.jpg'] });
  assert.equal(writes[0].payload.comingSoon, false);
});
