const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/signTv/rotation.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const api = { exports: {} };
new Function('module', 'exports', output)(api, api.exports);
const { resolveRotation, rotationSettings, rotationStyle } = api.exports;

test('legacy landscape does not unexpectedly turn sideways', () => {
  assert.equal(resolveRotation({}), 0);
  for (const degrees of [-90, 90]) {
    assert.equal(resolveRotation({ tvMounted: 'landscape', tvRotationDirection: `translate(-50%, -50%) rotate(${degrees}deg)` }), 0);
  }
});
test('existing portrait left and right settings retain their orientation', () => {
  assert.equal(resolveRotation({ tvMounted: 'portrait' }), 270);
  assert.equal(resolveRotation({ tvMounted: 'portrait', tvRotationDirection: 'rotate(-90deg)' }), 270);
  assert.equal(resolveRotation({ tvMounted: 'portrait', tvRotationDirection: 'rotate(90deg)' }), 90);
});
test('all four admin choices round-trip and fit the entire viewport', () => {
  for (const angle of [0, 90, 180, 270]) {
    const saved = JSON.parse(JSON.stringify(rotationSettings(angle)));
    assert.equal(resolveRotation(saved), angle);
    const style = rotationStyle(saved);
    const quarter = angle === 90 || angle === 270;
    assert.equal(style.width, quarter ? '100vh' : '100vw');
    assert.equal(style.height, quarter ? '100vw' : '100vh');
    assert.equal(style.transform, `translate(-50%, -50%) rotate(${angle}deg)`);
    assert.equal(saved.tvMounted, quarter ? 'portrait' : 'landscape');
  }
});
test('180-degree landscape works with explicit and historical values', () => {
  assert.equal(resolveRotation({ tvMounted: 'landscape', tvRotationDegrees: 180 }), 180);
  assert.equal(resolveRotation({ tvMounted: 'landscape', tvRotationDirection: 'rotate(180deg)' }), 180);
});
