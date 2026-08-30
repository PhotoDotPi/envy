import { EnvParseError } from "../core/errors";
import type { Field } from "../core/field";
import type { JsonOptions } from "../core/types";
import { runCustom } from "../validation/validation";
import { makeField } from "./helpers";

export function json(name: string): Field<unknown>;
export function json(
  name: string,
  options: JsonOptions & { optional: true },
): Field<unknown, unknown | undefined>;
export function json(name: string, options: JsonOptions): Field<unknown>;
export function json(name: string, options?: JsonOptions): Field<unknown> {
  const optional = options?.optional === true;
  return makeField<unknown>({
    name,
    expected: "valid JSON",
    parseCode: "invalid_json",
    trim: true,
    optional,
    parse: (raw) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        throw new EnvParseError(name, "valid JSON", raw, "invalid_json", options?.secret);
      }
    },
    validate: (value) => runCustom(options?.custom, value, name),
    description: options?.description,
    example: options?.example,
  });
}
