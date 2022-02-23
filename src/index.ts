import { bunker, debunker } from '@digitak/bunker';
import { fromByteArray, toByteArray } from 'base64-js';

/**
 * Web Storage with support for complex data types
 */
export interface VariantStorage {
  /**
   * Set key/value pair in {@link https://developer.mozilla.org/docs/Web/API/Storage | Storage}
   *
   * @param key - key to create/update
   * @param value - value to associate with key
   *
   * @throws {@link https://developer.mozilla.org/docs/Web/API/DOMException | DOMException}
   * The {@link https://developer.mozilla.org/docs/Web/API/Web_Storage_API |
   * Web Storage API} throws a "QuotaExceededError" DOMException exception if
   * the new value couldn't be set. (Setting could fail if, e.g., the user has
   * disabled storage for the site, certain browsers are in a private mode, or
   * the quota has been exceeded.)
   *
   * @throws {@link VariantError}
   * Thrown if the given value couldn't be correctly encoded and serialized.
   * This should never occur with a {@link SupportedValue}.
   */
  set: (key: string, value: SupportedValue) => void;

  /**
   * Get key's value from {@link https://developer.mozilla.org/docs/Web/API/Storage | Storage}
   *
   * @typeParam T - expected resultant structure
   * @param key - name of key with desired value
   * @returns {@link SupportedValue} associated with key
   * @returns {@link KEY_NOT_FOUND} if key doesn't exists (unable to use
   * underlying `null` as this is now a {@link SupportedValue})
   * @returns `string` when retrieving a non-encoded value (for
   * native-compatibility)
   *
   * @throws {@link VariantError}
   * Thrown if the key's value couldn't be correctly deserialized and decoded.
   * This should never occur with a {@link SupportedValue}.
   */
  get: <T extends SupportedValue>(key: string) => T | KEY_NOT_FOUND;

  /**
   * The wrapped {@link https://developer.mozilla.org/docs/Web/API/Storage | Storage} implementation
   */
  readonly storage: Storage;
}

/**
 * Supported data types
 */
export type SupportedValue =
  | Array<SupportedValue>
  | BigInt
  | Date
  | Map<SupportedValue, SupportedValue>
  | RegExp
  | Set<SupportedValue>
  | boolean
  | null
  | number
  | string
  | undefined
  | { [k in string | number]: SupportedValue };

/**
 * Create a {@link VariantStorage} object
 *
 * @param storage - defaults to {@link https://developer.mozilla.org/docs/Web/API/Window/localStorage | localStorage}
 */
export const fromStorage = (
  storage: Storage = localStorage
): VariantStorage => {
  return {
    get<T extends SupportedValue>(key: string): T | KEY_NOT_FOUND {
      const storedValue = storage.getItem(key);
      if (storedValue === null) {
        return KEY_NOT_FOUND;
      }
      if (!storedValue.startsWith(VARIANT_PREFIX)) {
        return storedValue as T;
      }
      return decode(storedValue) as T;
    },
    set(key: string, value: SupportedValue): void {
      return storage.setItem(key, encode(value));
    },
    storage,
  };
};

/**
 * Returned from {@link VariantStorage.get} if key does not exist
 */
export const KEY_NOT_FOUND = Symbol.for('variant.key.not.found');
type KEY_NOT_FOUND = typeof KEY_NOT_FOUND;

export class VariantError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * prefix to indicate encoded value
 * @internal
 */
const VARIANT_PREFIX = '\u{2592}v1\u{2592}';

/**
 * SupportedValue -> prefix + base64 string
 * @internal
 */
function encode(value: unknown): string {
  try {
    const encodedValue = bunker(value);
    return VARIANT_PREFIX + fromByteArray(encodedValue);
  } catch (e) {
    throw new VariantError(`Unable to encode value: '${value}'\n${e}`);
  }
}

/**
 * prefix + base64 string -> SupportedValue
 * @internal
 */
function decode(value: string): unknown {
  try {
    return debunker(toByteArray(value.substr(VARIANT_PREFIX.length)));
  } catch (e) {
    throw new VariantError(`Unable to decode value: '${value}'\n${e}`);
  }
}
