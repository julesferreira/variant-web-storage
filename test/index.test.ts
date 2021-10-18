import { mock } from 'jest-mock-extended';
import { KEY_NOT_FOUND, VariantError, fromStorage } from '../src';

const numbers = [
  ['NaN', Number.NaN],
  ['zero', 0],
  ['-zero', -0],
  ['one', 1],
  ['-one', -1],
  ['int', 42],
  ['-int', -42],
  ['float', 1.23],
  ['-float', -1.23],
  ['max int', Number.MAX_SAFE_INTEGER],
  ['min int', -Number.MAX_SAFE_INTEGER],
  ['infinity', Number.POSITIVE_INFINITY],
  ['-infinity', Number.NEGATIVE_INFINITY],
  ['bigint', BigInt('9007199254740992')],
  ['-bigint', BigInt('-9007199254740992')],
];

const strings = [
  ['empty', ''],
  ['space', ' '],
  ['foo', 'bar'],
  ['multi-line', 'foo\nbar'],
  ['astral', '\u{1f371}'],
];

const indexedCollections = [
  ['array', [1, 2]],
  [
    'ndarray',
    [
      [1, 2],
      ['foo', 3],
      [null, undefined],
    ],
  ],
  [
    'array w/ ref',
    (() => {
      const foo = ['bar'];
      return [foo, 'baz'];
    })(),
  ],
  [
    'array w/ properties',
    (() => {
      return Object.assign([1, 2], { foo: 'bar' });
    })(),
  ],
  [
    'circular array',
    (() => {
      type CircularArray = CircularArray[];
      const foo: CircularArray = [];
      return (foo[0] = foo);
    })(),
  ],
];

const keyedCollections = [
  ['object', { 1: 2 }],
  ['nested object', { foo: 'bar', baz: { k: 'v' } }],
  [
    'object w/ ref',
    (() => {
      const foo = { bar: 'baz' };
      return { foo };
    })(),
  ],
  [
    'circular object',
    (() => {
      type CircularObject = { foo: CircularObject };
      const foo = {} as CircularObject;
      return (foo.foo = foo);
    })(),
  ],
  ['set', new Set([1, 2])],
  [
    'ndset',
    new Set([
      new Set<number>([1, 2]),
      new Set<string | number>(['foo', 3]),
      new Set<null | undefined>([null, undefined]),
    ]),
  ],
  [
    'set w/ ref',
    (() => {
      const foo = new Set(['bar']);
      return new Set([foo, 'baz']);
    })(),
  ],
  [
    'circular set',
    (() => {
      type CircularSet = Set<CircularSet>;
      const foo: CircularSet = new Set();
      return foo.add(foo);
    })(),
  ],
  ['map', new Map(Object.entries({ 1: 2 }))],
  [
    'nested map',
    new Map(
      Object.entries({ foo: 'bar', baz: new Map(Object.entries({ k: 'v' })) })
    ),
  ],
  [
    'map w/ ref',
    (() => {
      const foo = new Map(Object.entries({ bar: 'baz' }));
      return new Map([[foo, foo]]);
    })(),
  ],
  [
    'circular map',
    (() => {
      type CircularMap = Map<CircularMap, CircularMap>;
      const foo: CircularMap = new Map();
      return foo.set(foo, foo);
    })(),
  ],
];

const misc = [
  ['undefined', undefined],
  ['null', null],
  ['true', true],
  ['false', false],
  ['regex', /foo(?!bar)/gi],
  ['date', new Date(8640000000000000)],
];

const aggregate = [
  [
    'aggregate',
    {
      numbers,
      strings,
      indexedCollections,
      keyedCollections,
      misc,
    },
  ],
];

describe('wrappable storage types', () => {
  clearAllStorage();
  test.each([
    ['default', undefined, localStorage],
    ['localStorage', localStorage, localStorage],
    ['sessionStorage', sessionStorage, sessionStorage],
  ])('%s', (_, param, expected) => {
    expect(fromStorage(param).storage).toBe(expected);
  });
});

describe('supported data types', () => {
  clearAllStorage();
  const storage = fromStorage();
  describe.each([
    ['numbers', numbers],
    ['strings', strings],
    ['indexed collections', indexedCollections],
    ['keyed collections', keyedCollections],
    ['misc', misc],
    ['aggregate', aggregate],
  ])('%s', (_, typeGroup) => {
    test.each(typeGroup)('%s: %p', (key, value) => {
      expect(storage.set(key, value)).toBeUndefined();
      expect(storage.get(key)).toStrictEqual(value);
    });
  });
});

describe('native string retrieval', () => {
  beforeEach(clearAllStorage);
  const storage = fromStorage();
  test('unencoded string', () => {
    localStorage.setItem('foo', 'bar');
    expect(storage.get('foo')).toBe('bar');
  });
  test('base64-encoded string (not ours)', () => {
    localStorage.setItem('foo', 'Zm9v');
    expect(storage.get('foo')).toBe('Zm9v');
  });
});

describe('nonexistent key', () => {
  beforeEach(clearAllStorage);
  const storage = fromStorage();
  test('empty storage', () => {
    expect(storage.get('foo')).toBe(KEY_NOT_FOUND);
  });
  test('coerced null', () => {
    storage.storage.setItem('foo', null as any);
    expect(storage.get('foo')).not.toBe(KEY_NOT_FOUND);
  });
  test('supported null', () => {
    storage.set('foo', null);
    expect(storage.get('foo')).toBeNull();
    expect(storage.get('foo')).not.toBe(KEY_NOT_FOUND);
  });
});

describe('error handling', () => {
  beforeEach(clearAllStorage);
  const storage = fromStorage();
  test('illegal set', () => {
    expect(() => storage.set('foo', Number as any)).toThrow(VariantError);
  });
  test('corrupt get', () => {
    storage.storage.setItem('foo', '▒v1▒C/');
    expect(() => storage.get('foo')).toThrow(VariantError);
  });
  test('bubble native storage full', () => {
    const fullStorage = mock<Storage>({
      getItem: (_: string) => {
        return null;
      },
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
    });
    expect(() => fromStorage(fullStorage).set('foo', 'bar')).toThrow(
      DOMException
    );
  });
});

function clearAllStorage() {
  localStorage.clear();
  sessionStorage.clear();
}
