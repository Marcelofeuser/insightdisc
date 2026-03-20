import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate } from '../public/relatorio_teste/disc_engine.js';

function getErrorCode(error) {
  return error?.code || '';
}

const FULL_TEMPLATE =
  '<div>{{name}}|{{profile}}|{{disc_d}}|{{disc_i}}|{{disc_s}}|{{disc_c}}</div>';

const FULL_VALUES = {
  name: 'Ana <script>alert(1)</script> & Co',
  profile: 'DI & Liderança',
  disc_d: 40,
  disc_i: 30,
  disc_s: 20,
  disc_c: 10,
};

test('renderTemplate substitui placeholders corretamente', () => {
  const html = renderTemplate(FULL_TEMPLATE, FULL_VALUES);

  assert.match(html, /Ana &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; Co/);
  assert.match(html, /DI &amp; Liderança/);
  assert.match(html, /40\|30\|20\|10/);
  assert.doesNotMatch(
    html,
    /\{\{name\}\}|\{\{profile\}\}|\{\{disc_d\}\}|\{\{disc_i\}\}|\{\{disc_s\}\}|\{\{disc_c\}\}/,
  );
});

test('renderTemplate falha com UNKNOWN_PLACEHOLDER', () => {
  assert.throws(
    () => renderTemplate(`${FULL_TEMPLATE} {{foo_bar}}`, FULL_VALUES),
    (error) => getErrorCode(error) === 'UNKNOWN_PLACEHOLDER',
  );
});

test('renderTemplate falha com MISSING_REQUIRED_PLACEHOLDER', () => {
  assert.throws(
    () => renderTemplate('<div>{{name}} {{profile}} {{disc_d}} {{disc_i}} {{disc_s}}</div>', FULL_VALUES),
    (error) => getErrorCode(error) === 'MISSING_REQUIRED_PLACEHOLDER',
  );
});

test('renderTemplate falha com MISSING_REQUIRED_VALUE', () => {
  assert.throws(
    () =>
      renderTemplate(FULL_TEMPLATE, {
        ...FULL_VALUES,
        profile: '',
      }),
    (error) => getErrorCode(error) === 'MISSING_REQUIRED_VALUE',
  );
});

test('renderTemplate escapa HTML perigoso e ampersands', () => {
  const html = renderTemplate(FULL_TEMPLATE, {
    ...FULL_VALUES,
    name: '<script>boom()</script>',
    profile: 'A & B',
  });

  assert.match(html, /&lt;script&gt;boom\(\)&lt;\/script&gt;/);
  assert.match(html, /A &amp; B/);
  assert.doesNotMatch(html, /<script>boom\(\)<\/script>/);
});
