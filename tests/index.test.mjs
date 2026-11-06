import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createFixedWidthCodec } from '../dist/esm/index.js';
test('exact codepoint widths align and pad-aware trims', () => {
  const codec = createFixedWidthCodec([
    { name: 'word', width: 4, trim: 'end' },
    { name: 'id', width: 3, align: 'right', pad: '0', trim: 'start' },
  ]);
  assert.equal(codec.width, 7);
  assert.equal(codec.encode({ word: 'ab', id: '1' }), 'ab  001');
  assert.deepEqual({ ...codec.decode('ab  001') }, { word: 'ab', id: '1' });
});
test('Unicode scalar widths not byte UTF16 or display widths', () => {
  const codec = createFixedWidthCodec([{ name: 'x', width: 2, pad: '😀' }]);
  assert.equal(codec.encode({ x: '界' }), '界😀');
  assert.equal(codec.decode('😀界').x, '😀界');
  assert.throws(() => codec.decode('\ud800x'), TypeError);
  assert.throws(() => codec.encode({ x: '\ude00' }), TypeError);
});
test('overflow requires explicit truncation policy', () => {
  assert.throws(
    () => createFixedWidthCodec([{ name: 'x', width: 1 }]).encode({ x: 'ab' }),
    RangeError,
  );
  assert.equal(
    createFixedWidthCodec([{ name: 'x', width: 1, overflow: 'truncate' }]).encode({ x: '😀a' }),
    '😀',
  );
  assert.throws(() => createFixedWidthCodec([{ name: 'x', width: 1 }]).decode('ab'), RangeError);
});
test('malformed schemas sparse arrays controls and unsupported byte charset', () => {
  for (const fields of [
    [],
    [,],
    [{ name: 'x', width: 0 }],
    [
      { name: 'x', width: 1 },
      { name: 'x', width: 1 },
    ],
    [{ name: 'x', width: 1, pad: 'ab' }],
    [{ name: 'x', width: 1, align: 'middle' }],
  ])
    assert.throws(() => createFixedWidthCodec(fields));
  assert.throws(
    () => createFixedWidthCodec([{ name: 'x', width: 1 }], { units: 'byte' }),
    TypeError,
  );
  assert.throws(
    () => createFixedWidthCodec([{ name: 'x', width: 1 }]).encode({ x: '\n' }),
    TypeError,
  );
});
test('schema and output ownership safe arbitrary keys', () => {
  const schema = [{ name: '__proto__', width: 2 }];
  const codec = createFixedWidthCodec(schema);
  schema[0].width = 50;
  const record = Object.create(null);
  record.__proto__ = 'ok';
  const parsed = codec.decode(codec.encode(record));
  assert.equal(Object.getPrototypeOf(parsed), null);
  assert.equal(parsed.__proto__, 'ok');
  parsed.__proto__ = 'no';
  assert.equal(codec.decode('ok').__proto__, 'ok');
  assert.throws(() => codec.encode({}), TypeError);
  assert.throws(() => codec.encode({ extra: 'x' }), TypeError);
});
test('budgets and trims preserve nonpad whitespace', () => {
  assert.throws(
    () => createFixedWidthCodec([{ name: 'x', width: 3 }], { maxWidth: 2 }),
    RangeError,
  );
  const codec = createFixedWidthCodec([{ name: 'x', width: 3, pad: '_', trim: 'both' }], {
    maxWidth: 3,
    maxFields: 1,
  });
  assert.equal(codec.decode('_ _').x, ' ');
  assert.throws(() => codec.decode('aa'), RangeError);
});
test('CJS surface', () => {
  assert.equal(
    createRequire(import.meta.url)('../dist/cjs/index.js')
      .createFixedWidthCodec([{ name: 'x', width: 1 }])
      .encode({ x: 'a' }),
    'a',
  );
});
