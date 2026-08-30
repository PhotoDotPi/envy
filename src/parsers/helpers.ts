import type { Field } from "../core/field";

/**
 * Shared base used by every parser to build a {@link Field}. Only the pieces
 * that differ per parser (name, expected string, coerce, validation) are
 * passed in; empty-as-missing, default/optional handling and error shaping are
 * handled centrally by the parsing engine.
 */
export interface FieldBase<T> {
  readonly name: string;
  readonly expected: string;
  readonly parseCode: Field<T>["parseCode"];
  /** Coerce a raw trimmed string into the typed value (may throw). */
  readonly parse: Field<T>["parse"];
  readonly validate?: Field<T>["validate"];
  readonly trim?: boolean | undefined;
  readonly default?: T | undefined;
  readonly optional?: boolean | undefined;
  readonly secret?: boolean | undefined;
  readonly description?: string | undefined;
  readonly example?: string | undefined;
}

export function makeField<T>(base: FieldBase<T>): Field<T> {
  const field: Field<T> = {
    kind: "field",
    name: base.name,
    expected: base.expected,
    parse: base.parse,
    parseCode: base.parseCode,
  };
  if (base.trim !== undefined) (field as { trim: boolean }).trim = base.trim;
  if (base.validate !== undefined) {
    (field as { validate: Field<T>["validate"] }).validate = base.validate;
  }
  if (base.default !== undefined) (field as { default: T }).default = base.default;
  if (base.optional === true) (field as { optional: boolean }).optional = true;
  if (base.secret === true) (field as { secret: boolean }).secret = true;
  if (base.description !== undefined) {
    (field as { description: string }).description = base.description;
  }
  if (base.example !== undefined) (field as { example: string }).example = base.example;
  // P1-07: field descriptors are immutable contracts once created. Options
  // objects (and any `URL`/`RegExp` inside them) are referenced, not deep
  // copied — this freeze is intentionally shallow.
  return Object.freeze(field);
}
