import { EnvParseError, EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { PortOptions } from "../core/types";
import { runCustom } from "../validation/validation";
import { makeField } from "./helpers";

export function port(name: string): Field<number>;
export function port(name: string, defaultValue: number): Field<number>;
export function port(name: string, defaultValue: undefined): Field<number, number | undefined>;
export function port(name: string, options: PortOptions & { default: number }): Field<number>;
export function port(
  name: string,
  options: PortOptions & { optional: true },
): Field<number, number | undefined>;
export function port(name: string, options: PortOptions): Field<number>;
export function port(
  name: string,
  ...args: [optionsOrDefault?: PortOptions | number | undefined]
): Field<number> {
  const [optionsOrDefault] = args;
  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: PortOptions | undefined;
  let defaultValue: number | undefined;

  if (optionsOrDefault === undefined) {
    // required unless explicitly passed `undefined`
  } else if (typeof optionsOrDefault === "number") {
    defaultValue = optionsOrDefault;
  } else if (optionsOrDefault !== null) {
    options = optionsOrDefault;
    if (typeof options.default === "number") {
      defaultValue = options.default;
    }
  } else {
    throw new EnvSchemaError(
      "Invalid argument: expected a default value or options object, got null.",
    );
  }

  return makeField<number>({
    name,
    expected: "a valid port (0-65535)",
    parseCode: "invalid_port",
    trim: true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => {
      if (!PORT_RE.test(raw)) {
        throw new EnvParseError(
          name,
          "a valid port (0-65535)",
          raw,
          "invalid_port",
          options?.secret,
        );
      }
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > 65535) {
        throw new EnvParseError(
          name,
          "a valid port (0-65535)",
          raw,
          "invalid_port",
          options?.secret,
        );
      }
      return value;
    },
    validate: (value) => {
      if (!Number.isInteger(value) || value < 0 || value > 65535) {
        return "must be a valid port (0-65535)";
      }
      return runCustom(options?.custom, value, name);
    },
    description: options?.description,
    example: options?.example,
  });
}

/** A positive integer literal (ports are 0-65535). */
const PORT_RE = /^\d+$/;
