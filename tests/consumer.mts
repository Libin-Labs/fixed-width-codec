import {
  createFixedWidthCodec,
  type FixedField,
  type FixedWidthOptions,
  type FixedWidthCodec,
} from '@lp-labs/fixed-width-codec';
const field: FixedField = { name: 'x', width: 3, trim: 'end' };
const options: FixedWidthOptions = { units: 'codePoint' };
const codec: FixedWidthCodec = createFixedWidthCodec([field], options);
const line: string = codec.encode({ x: 'a' });
const parsed: Record<string, string> = codec.decode(line);
// @ts-expect-error byte charset widths unsupported
createFixedWidthCodec([field], { units: 'byte' });
// @ts-expect-error fields encode strings, not numbers
codec.encode({ x: 1 });
void parsed;
