# @lp-labs/fixed-width-codec

Schema-based exact Unicode-code-point fixed-width record encoding with explicit padding, trimming and overflow.

Standalone original implementation; zero runtime, peer, or sibling-package dependencies. Node.js 18+, ESM and CommonJS with separate declaration trees. No browser globals are accessed at import time; compiled runtime uses only standard JavaScript APIs.

## Install

```sh
npm install @lp-labs/fixed-width-codec
```

## Quick start

```js
import { createFixedWidthCodec } from '@lp-labs/fixed-width-codec';
const codec = createFixedWidthCodec([
  { name: 'name', width: 5, trim: 'end' },
  { name: 'id', width: 3, align: 'right', pad: '0', trim: 'start' },
]);
const line = codec.encode({ name: 'Ada', id: '7' });
console.log(line, codec.decode(line)); // Ada  007; null-prototype record
```

CommonJS exposes the same named exports:

```cjs
const api = require('@lp-labs/fixed-width-codec');
```

## Customization

```js
import { createFixedWidthCodec } from '@lp-labs/fixed-width-codec';
const codec = createFixedWidthCodec([{ name: 'label', width: 2, overflow: 'truncate', pad: '_' }], {
  units: 'codePoint',
  maxWidth: 10,
});
console.log(codec.encode({ label: '😀abc' })); // 😀a
```

## Semantics, limits and errors

`createFixedWidthCodec(fields, options)` snapshots a nonempty dense schema. Each field has a unique nonempty control-free name (at most 128 UTF-16 units), positive integer `width`, `align: left|right` (left default), one Unicode scalar `pad` (space default), `trim: none|start|end|both` (none default), and `overflow: error|truncate` (error default). Limits: `maxWidth=100000` sum of field widths and `maxFields=1000`, positive safe integers.

The only supported `units` is `codePoint`, counting **Unicode scalar values**. Lone surrogates, C0 controls and DEL are rejected. Bytes/charsets, UTF-16-unit fields, terminal columns, graphemes, and combining-sequence preservation are not supported. An emoji counts one field unit even when four UTF-8 bytes/two UTF-16 units.

Readonly `width` is the record's exact scalar width. `encode` requires an object with own string-valued fields for every schema name and no extra enumerable string keys. Underfull values are padded according to alignment. Overflow throws unless explicitly configured `truncate`, which retains the leftmost width code points even for right-aligned fields; no silent default truncation occurs.

`decode` requires exactly width code points and returns a fresh **null-prototype** record, so names such as **proto** are data. Trimming removes only the field's exact pad scalar from specified edges, not arbitrary whitespace. Padding is inherently lossy when equal to legitimate edge data; choose trim deliberately. Fields/schema are copied and no record/result is retained.

TypeError covers bad schema/options, missing/extra/nonstrings, controls/surrogates, unsupported units, and oversized raw fields/records. RangeError covers bad numeric limits, schema/record width mismatch and default overflow. Raw field strings are limited to twice maxWidth UTF-16 units even with explicit truncation, bounding work. Encoding/decoding work and auxiliary storage are O(total bounded input/output + fields). This is a single-record codec; no line framing or file charset conversion is implied.

## Complete public declaration API

The following is the complete public ESM declaration surface; CommonJS has matching declarations and runtime exports. Optional properties are omitted rather than supplied as undefined under exactOptionalPropertyTypes.

```ts
export interface FixedField {
  name: string;
  width: number;
  align?: 'left' | 'right';
  pad?: string;
  trim?: 'none' | 'start' | 'end' | 'both';
  overflow?: 'error' | 'truncate';
}
export interface FixedWidthOptions {
  units?: 'codePoint';
  maxWidth?: number;
  maxFields?: number;
}
export interface FixedWidthCodec {
  readonly width: number;
  encode(record: Readonly<Record<string, string>>): string;
  decode(line: string): Record<string, string>;
}
/** Widths count Unicode scalar values, NOT UTF-8 bytes, graphemes, or display cells. */
export declare function createFixedWidthCodec(
  fields: readonly FixedField[],
  options?: FixedWidthOptions,
): FixedWidthCodec;
```

## Development and verification

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
npm run build
npm run typecheck
npm test
npm run format:check
```

The offline command requires the dev tools already present in npm's cache. TypeScript ^5.9.3 and Prettier ^3.6.2 are dev-only. Build targets ES2022 with strict NodeNext declarations, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noUnused checks, ES2022/DOM libs and no ambient type packages. Runtime tests import the ESM distribution directly and check CommonJS parity. Bare-package .mts/.cts consumer tests include negative type assertions. Published files are only dist, this README, LICENSE and package.json. No publication is performed by tests.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
