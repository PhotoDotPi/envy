/**
 * A custom validation function.
 *
 * Return `true` to accept the value, `false` to reject it (with a generic
 * message), or a `string` to reject it with your own message.
 */
export type CustomValidator<T> = (value: T, name: string) => boolean | string | undefined;

/**
 * Common metadata shared by every validator's options: explicit secret marking
 * and optional schema-introspection/format metadata.
 */
export interface CommonOptions {
  /**
   * When `true`, the value is treated as secret and is never echoed in errors
   * even if the variable name is not auto-detected as sensitive.
   */
  readonly secret?: boolean;
  /** Optional human-readable description (used by schema-introspection tooling). */
  readonly description?: string;
  /** Optional example value (used by schema-introspection/.env.example generation). */
  readonly example?: string;
}

/** Options shared by the string parser and its validation rules. */
export interface StringOptions extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: string;
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Trim surrounding whitespace before returning the value. Off by default. */
  readonly trim?: boolean;
  /** Reject values shorter than this many characters. */
  readonly minLength?: number;
  /** Reject values longer than this many characters. */
  readonly maxLength?: number;
  /** Reject values that do not match this pattern. */
  readonly pattern?: RegExp;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<string>;
}

/** Options shared by the numeric parser and its validation rules. */
export interface NumberOptions extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: number;
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Reject values below this bound (inclusive). */
  readonly min?: number;
  /** Reject values above this bound (inclusive). */
  readonly max?: number;
  /** Reject non-integer values. */
  readonly integer?: boolean;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<number>;
}

/** Options shared by the boolean parser and its validation rules. */
export interface BooleanOptions extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: boolean;
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<boolean>;
}

/** Options shared by the bigint parser and its validation rules. */
export interface BigIntOptions extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: bigint;
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Reject values below this bound (inclusive). */
  readonly min?: bigint;
  /** Reject values above this bound (inclusive). */
  readonly max?: bigint;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<bigint>;
}

/** Options shared by the URL parser and its validation rules. */
export interface UrlOptions extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: URL | string;
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<URL>;
}

/** Options shared by the enum parser and its validation rules. */
export interface EnumOptions<T extends readonly string[] = readonly string[]>
  extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: T[number];
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<T[number]>;
}

/** Options shared by the email parser and its validation rules. */
export interface EmailOptions extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: string;
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Reject the value if it is not exactly this many characters. */
  readonly maxLength?: number;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<string>;
}

/** Options shared by the host parser and its validation rules. */
export interface HostOptions extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: string;
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** When `true`, require a TLD (rejects bare `localhost` / IP literals). */
  readonly tld?: boolean;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<string>;
}

/** Options shared by the port parser and its validation rules. */
export interface PortOptions extends CommonOptions {
  /** Default value used when the variable is missing or empty. */
  readonly default?: number;
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Additional custom validation. */
  readonly custom?: CustomValidator<number>;
}

/** Options shared by the JSON parser and its validation rules. */
export interface JsonOptions extends CommonOptions {
  /** When `true`, a missing variable yields `undefined` instead of throwing. */
  readonly optional?: boolean;
  /** Additional custom validation on the parsed value. */
  readonly custom?: CustomValidator<unknown>;
}
