import type { CustomValidator } from "../core/types";

/**
 * Run a user supplied custom validator.
 *
 * `true`/`undefined` accepts the value, `false` rejects with a generic
 * message, and a `string` is used as the rejection reason verbatim.
 */
export function runCustom<T>(
  custom: CustomValidator<T> | undefined,
  value: T,
  name: string,
): string | null {
  if (custom === undefined) return null;
  const result = custom(value, name);
  if (result === false) return "failed custom validation";
  if (typeof result === "string") return result;
  return null;
}

/** Compose several validators; the first failure wins. */
export function compose<T>(
  validators: ReadonlyArray<(value: T, name: string) => string | null>,
): (value: T, name: string) => string | null {
  return (value, name) => {
    for (const validator of validators) {
      const reason = validator(value, name);
      if (reason !== null) return reason;
    }
    return null;
  };
}
