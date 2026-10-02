const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./sdd34-harness.cjs');
const { readPendingOperation } = load('src/shared/journey/operation.ts');

const operation = {
  operationId: '00000000-0000-4000-8000-000000000001',
  expectedRevision: 2,
  action: { type: 'daily', date: '2026-10-01', count: 0 },
  timezone: 'Asia/Makassar',
};

test('device retry queue rejects corrupt and incompatible drafts before replay', () => {
  assert.equal(readPendingOperation(null), null);
  assert.deepEqual(readPendingOperation(JSON.stringify(operation)), operation);
  for (const draft of [
    '{',
    'null',
    '{}',
    JSON.stringify({ ...operation, expectedRevision: -1 }),
    JSON.stringify({ ...operation, userId: 'another' }),
    JSON.stringify({ ...operation, action: { ...operation.action, count: 201 } }),
  ]) {
    assert.throws(() => readPendingOperation(draft));
  }
});

function api(session = { access_token: 'fixture' }) {
  return load('src/shared/api/client.ts', {
    '@/lib/supabase': { supabase: { auth: { getSession: async () => ({ data: { session } }) } } },
  });
}

test('API client preserves request headers and forwards caller cancellation', async () => {
  const original = global.fetch;
  const controller = new AbortController();
  try {
    global.fetch = async (_path, init) => {
      assert.equal(init.headers.get('X-Request-ID'), 'example');
      assert.equal(init.headers.get('Authorization'), 'Bearer fixture');
      assert.equal(init.cache, 'no-store');
      controller.abort();
      assert.equal(init.signal.aborted, true);
      return new Response('{"saved":true}');
    };
    assert.deepEqual(
      await api().authenticatedRequest('/api/fixture', {
        headers: { 'X-Request-ID': 'example' },
        signal: controller.signal,
      }),
      { saved: true },
    );
  } finally {
    global.fetch = original;
  }
});

test('API client handles empty success, upstream HTML and structured failures', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api().authenticatedRequest('/api/fixture'), undefined);
    global.fetch = async () =>
      new Response('<html>private upstream detail</html>', { status: 502 });
    await assert.rejects(api().authenticatedRequest('/api/fixture'), (error) => {
      assert.equal(error.status, 502);
      assert.doesNotMatch(error.message, /private|html/);
      return true;
    });
    global.fetch = async () => new Response('{"error":"Catatan berubah"}', { status: 409 });
    await assert.rejects(api().authenticatedRequest('/api/fixture'), {
      status: 409,
      message: 'Catatan berubah',
    });
    await assert.rejects(api(null).authenticatedRequest('/api/fixture'), { status: 401 });
  } finally {
    global.fetch = original;
  }
});

function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}

test('shared modules do not depend on app or feature presentation modules', () => {
  for (const file of sources('src/shared')) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /(?:from\s*|import\s*\()\s*['"]@\/(?:features|app)\//, file);
  }
});

test('cross-feature requests use the shared API client rather than the journey hook', () => {
  for (const file of sources('src')) {
    assert.doesNotMatch(
      fs.readFileSync(file, 'utf8'),
      /import\s*{[^}]*authenticatedRequest[^}]*}\s*from\s*['"]@\/shared\/journey\/client/,
      file,
    );
  }
});

// Drive the real hook with a minimal state scheduler; network/storage are fixtures.
async function journeyFixture(run) {
  const original = global.localStorage;
  const values = [],
    store = new Map();
  let cursor = 0,
    rejectWrite = false,
    rejectRemove = false,
    posts = 0,
    deferredRead;
  const domain = load('src/shared/journey/domain.ts');
  let snapshot = { revision: 0, state: domain.emptyJourney(), flags: {} };
  global.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      if (rejectWrite) throw new Error('Quota exceeded');
      store.set(key, value);
    },
    removeItem: (key) => {
      if (rejectRemove) throw new Error('Storage unavailable');
      store.delete(key);
    },
  };
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [
        values[index],
        (value) => {
          values[index] = typeof value === 'function' ? value(values[index]) : value;
        },
      ];
    },
    useRef: (initial) => {
      const index = cursor++;
      return values[index] ?? (values[index] = { current: initial });
    },
    useEffect: () => {},
    useCallback: (callback) => callback,
  };
  const { useJourneyState } = load('src/shared/journey/client.ts', {
    react,
    '@/lib/supabase': {
      supabase: {
        auth: { getSession: async () => ({ data: { session: { user: { id: 'owner' } } } }) },
      },
    },
    '@/shared/api/client': {
      authenticatedRequest: async (_path, init) => {
        if (!init) return deferredRead ? deferredRead : structuredClone(snapshot);
        posts++;
        const operation = JSON.parse(init.body);
        snapshot = {
          ...snapshot,
          revision: snapshot.revision + 1,
          state: domain.reduceJourney(snapshot.state, operation.action, operation.operationId),
        };
        return structuredClone(snapshot);
      },
    },
  });
  const render = () => {
    cursor = 0;
    return useJourneyState();
  };
  try {
    await render().refresh();
    await run({
      render,
      posts: () => posts,
      rejectWrite: () => {
        rejectWrite = true;
      },
      rejectRemove: () => {
        rejectRemove = true;
      },
      deferRead: () => {
        let resolve;
        deferredRead = new Promise((done) => {
          resolve = done;
        });
        return resolve;
      },
      initial: structuredClone(snapshot),
      action: {
        type: 'daily',
        date: domain.localDate(new Date(), snapshot.state.timezone),
        count: 0,
      },
    });
  } finally {
    if (original === undefined) delete global.localStorage;
    else global.localStorage = original;
  }
}

test('successful server commit survives failure to clear the device draft', async () =>
  journeyFixture(async (f) => {
    f.rejectRemove();
    assert.equal(await f.render().save(f.action), true);
    const result = f.render();
    assert.equal(result.snapshot.revision, 1);
    assert.equal(result.pending, null);
    assert.equal(result.error, '');
    assert.match(result.notice, /Tersimpan di server/);
  }));

test('full device storage prevents send and never claims the draft was queued', async () =>
  journeyFixture(async (f) => {
    f.rejectWrite();
    assert.equal(await f.render().save(f.action), false);
    assert.equal(f.posts(), 0);
    assert.equal(f.render().pending, null);
    assert.equal(f.render().busy, false);
    assert.match(f.render().notice, /Isian belum dikirim/);
  }));

test('slow refresh cannot overwrite a more recent save', async () =>
  journeyFixture(async (f) => {
    const resolve = f.deferRead();
    const refresh = f.render().refresh();
    await Promise.resolve();
    assert.equal(await f.render().save(f.action), true);
    resolve(f.initial);
    await refresh;
    assert.equal(f.render().snapshot.revision, 1);
  }));

test('authentication returns a safe error for non-Error upstream exceptions and shares OAuth options', async () => {
  const calls = [];
  const auth = load('src/shared/lib/auth.ts', {
    './supabase': {
      supabase: {
        auth: {
          signInWithOAuth: async (options) => {
            calls.push(options);
            return { data: {}, error: null };
          },
          signInWithPassword: async () => {
            throw null;
          },
        },
      },
    },
    '@/lib/db/userProfile': {},
    './auth-storage': {},
  });
  const original = global.window;
  global.window = { location: { origin: 'https://fixture.invalid' } };
  try {
    assert.equal((await auth.signInWithGoogle()).success, true);
    assert.equal((await auth.signInWithFacebook()).success, true);
    assert.deepEqual(
      calls.map((value) => value.provider),
      ['google', 'facebook'],
    );
    assert.equal(calls[0].options.redirectTo, calls[1].options.redirectTo);
    assert.deepEqual(await auth.signInWithEmail('fixture', 'fixture'), {
      success: false,
      error: 'Permintaan belum berhasil.',
    });
  } finally {
    if (original === undefined) delete global.window;
    else global.window = original;
  }
});

test('legacy craving mapper never turns missing or invalid timestamps into today', () => {
  const { toCravingHistoryItem } = load('src/features/tracker/TrackerPage/craving-history.ts');
  const row = {
    id: 'fixture',
    mood: '',
    occurred_at: null,
    intensity: 0,
    location: '',
    situation: '',
  };
  assert.equal(toCravingHistoryItem(row).date, 'Tanggal belum tersedia');
  assert.equal(
    toCravingHistoryItem({ ...row, occurred_at: 'invalid' }).date,
    'Tanggal belum tersedia',
  );
  assert.equal(toCravingHistoryItem(row).intensity, 0);
});

test('application TypeScript import graph has no circular dependencies', () => {
  const ts = require('typescript');
  const files = sources('src').map((file) => path.resolve(file)),
    known = new Set(files);
  const aliases = Object.entries(
    JSON.parse(fs.readFileSync('tsconfig.json', 'utf8')).compilerOptions.paths,
  ).sort(([a], [b]) => b.length - a.length);
  const graph = new Map();
  for (const file of files) {
    const ast = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const edges = [];
    function visit(node) {
      const literal =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? node.arguments[0]
            : null;
      if (literal && ts.isStringLiteral(literal)) {
        const spec = literal.text;
        const alias = aliases.find(([name]) => spec.startsWith(name.replace(/\*$/, '')));
        const base = alias
          ? path.resolve(alias[1][0].replace('*', spec.slice(alias[0].length - 1)))
          : spec.startsWith('.')
            ? path.resolve(path.dirname(file), spec)
            : null;
        if (base) {
          const target = [
            base,
            base + '.ts',
            base + '.tsx',
            path.join(base, 'index.ts'),
            path.join(base, 'index.tsx'),
          ].find((value) => known.has(value));
          if (target) edges.push(target);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    graph.set(file, edges);
  }
  const visited = new Set(),
    stack = [];
  function visit(file) {
    assert.equal(
      stack.includes(file),
      false,
      'Import cycle: ' + [...stack, file].map((value) => path.relative('.', value)).join(' -> '),
    );
    if (visited.has(file)) return;
    stack.push(file);
    for (const edge of graph.get(file)) visit(edge);
    stack.pop();
    visited.add(file);
  }
  files.forEach(visit);
});
