# [variant-web-storage]

Web Storage with support for complex data types.

The [Web Storage API] requires values to be stored as `string`s. You can use
[variant-web-storage] to expand the set of supported data types. This thin
wrapper handles conversions between developer-friendly types and web storage
requirements.

## Install

```sh
npm install variant-web-storage
```

## Usage

### Minimal example

Store and retrieve a `Set` from `localStorage`

```ts
import { fromStorage } from 'variant-web-storage';

const variantStorage = fromStorage(localStorage);
variantStorage.set('foo', new Set(['bar', 'baz']));
variantStorage.get('foo'); // returns Set(2) { 'bar', 'baz' }
```

### Extended example

Retrieve session state- if available. Otherwise, use and persist the default.

```ts
import { fromStorage, KEY_NOT_FOUND } from 'variant-web-storage';

type Store = { mode: 'default' | 'light' | 'dark'; items: Set<string> };
const DEFAULT: Store = {
  mode: 'default',
  items: new Set(),
};

const variantStorage = fromStorage(sessionStorage);

// get object shaped like `Store` from sessionStorage at key 'session-store'
let store = variantStorage.get<Store>('session-store');

if (store === KEY_NOT_FOUND) {
  // sessionStorage had no 'session-store' key. use and save the `DEFAULT`
  variantStorage.set('session-store', (store = DEFAULT));
}

store; // returns { mode: 'default', items: Set(0) {} }
```

Find additional examples in the [test/] directory.

## Data types

Supported types are formally defined as follows (and include circular,
referential, and deeply-nested values).

```ts
type SupportedValue =
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
```

Known limitations include:

- functions
- instances of custom classes
- weak sets/maps

## Internals

Value /(en|de)coding/ is largely handled by the awesome _(read:
schema-inferring + well-dense + TypeScript-centric)_ [Bunker] library _(note:
GNU GPL 3)_. After a value is _bunkered_ into a compact byte sequence, it's
then converted to a base64-encoded string- achieving web storage compatibility.
Lastly, a sentinel value _(... OK OK, it's a magic string)_ is prefixed for
quick package/versioning lookup.

[bunker]: https://github.com/digital-loukoum/bunker
[test/]: test/
[variant-web-storage]: https://github.com/julesferreira/variant-web-storage
[web storage api]: https://developer.mozilla.org/docs/Web/API/Web_Storage_API
