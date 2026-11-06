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
function scalarText(value: string): void {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/u.test(value))
    throw new TypeError('Expected control-free Unicode text.');
  for (const point of value)
    if (point.length === 1 && /[\ud800-\udfff]/u.test(point))
      throw new TypeError('Lone surrogate is not a Unicode scalar.');
}
/** Widths count Unicode scalar values, NOT UTF-8 bytes, graphemes, or display cells. */
export function createFixedWidthCodec(
  fields: readonly FixedField[],
  options: FixedWidthOptions = {},
): FixedWidthCodec {
  const { units = 'codePoint', maxWidth = 100_000, maxFields = 1_000 } = options;
  if (units !== 'codePoint') throw new TypeError('Only codePoint units are supported.');
  for (const n of [maxWidth, maxFields])
    if (!Number.isSafeInteger(n) || n < 1) throw new RangeError('Invalid schema budget.');
  if (!Array.isArray(fields) || !fields.length || fields.length > maxFields)
    throw new TypeError('Invalid field array.');
  const names = new Set<string>();
  let width = 0;
  const schema = Array.from(fields, (field) => {
    if (
      !field ||
      typeof field.name !== 'string' ||
      !field.name ||
      field.name.length > 128 ||
      /[\u0000-\u001f\u007f]/u.test(field.name) ||
      names.has(field.name)
    )
      throw new TypeError('Invalid or duplicate field name.');
    names.add(field.name);
    if (!Number.isSafeInteger(field.width) || field.width < 1)
      throw new RangeError('Invalid field width.');
    width += field.width;
    if (width > maxWidth) throw new RangeError('Schema width budget exceeded.');
    const { align = 'left', pad = ' ', trim = 'none', overflow = 'error' } = field;
    scalarText(pad);
    if (
      [...pad].length !== 1 ||
      !['left', 'right'].includes(align) ||
      !['none', 'start', 'end', 'both'].includes(trim) ||
      !['error', 'truncate'].includes(overflow)
    )
      throw new TypeError('Invalid field options.');
    return { name: field.name, width: field.width, align, pad, trim, overflow };
  });
  return {
    width,
    encode(record) {
      if (
        !record ||
        typeof record !== 'object' ||
        Object.keys(record).some((key) => !names.has(key))
      )
        throw new TypeError('Expected record with only schema keys.');
      return schema
        .map((field) => {
          if (!Object.hasOwn(record, field.name))
            throw new TypeError(`Missing field: ${field.name}`);
          const value = record[field.name]!;
          if (typeof value !== 'string' || value.length > maxWidth * 2)
            throw new TypeError('Invalid or oversized field.');
          scalarText(value);
          let points = [...value];
          if (points.length > field.width) {
            if (field.overflow === 'error') throw new RangeError(`Field overflow: ${field.name}`);
            points = points.slice(0, field.width);
          }
          const padding = field.pad.repeat(field.width - points.length);
          return field.align === 'left' ? points.join('') + padding : padding + points.join('');
        })
        .join('');
    },
    decode(line) {
      if (typeof line !== 'string' || line.length > width * 2)
        throw new TypeError('Invalid or oversized record.');
      scalarText(line);
      const points = [...line];
      if (points.length !== width) throw new RangeError('Record width does not match schema.');
      const result: Record<string, string> = Object.create(null) as Record<string, string>;
      let offset = 0;
      for (const field of schema) {
        const slice = points.slice(offset, offset + field.width);
        offset += field.width;
        let start = 0,
          end = slice.length;
        if (field.trim === 'start' || field.trim === 'both')
          while (start < end && slice[start] === field.pad) start++;
        if (field.trim === 'end' || field.trim === 'both')
          while (end > start && slice[end - 1] === field.pad) end--;
        result[field.name] = slice.slice(start, end).join('');
      }
      return result;
    },
  };
}
