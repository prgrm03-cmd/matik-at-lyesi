const UYGULAMA = [
  'main.js', 'duzenekler/**/*.js', 'motor/**/*.js', 'geo/**/*.js',
  'widget/**/*.js', 'defter/**/*.js'
];
const DOM = [
  'document', 'window', 'navigator', 'canvas', 'getContext', 'CanvasRenderingContext2D',
  'Path2D', 'querySelector', 'getElementById', 'addEventListener',
  'requestAnimationFrame', 'performance'
];
const YASAK = [
  ...DOM, 'localStorage', 'sessionStorage', 'indexedDB', 'require', 'fetch',
  'XMLHttpRequest', 'WebSocket', 'setTimeout', 'setInterval', 'Date', 'console',
  'eval', 'Function', 'innerHTML'
];
const TARAYICI = [
  ...YASAK, 'URL', 'URLSearchParams', 'location', 'ResizeObserver', 'Image',
  'cancelAnimationFrame', 'matchMedia', 'queueMicrotask'
];
const NODE = ['process', 'Buffer', 'console', 'URL', 'URLSearchParams', 'structuredClone'];

function globaller(adlar) {
  return Object.fromEntries(adlar.map(ad => [ad, 'readonly']));
}

function ozellik(ad) {
  return { property: ad, message: 'Sözleşme §5.2: bu erişim bu dosyada yasaktır.' };
}

function sinirlar({ canvas = false, kayit = false, pi = false } = {}) {
  const liste = [{ object: 'Math', property: 'random', message: 'Seed için ctx.rng kullan.' }];
  if (!pi) liste.push({ object: 'Math', property: 'PI', message: 'Yalnız geo/aci.js.' });
  if (!kayit) liste.push(ozellik('localStorage'));
  if (!canvas) liste.push(ozellik('canvas'), ozellik('getContext'));
  return ['error', ...liste];
}

function veriKoku(dugum) {
  if (dugum?.type !== 'MemberExpression') return false;
  const ad = dugum.computed ? dugum.property.value : dugum.property.name;
  if (dugum.object.name === 'ctx' && ad === 'veri') return true;
  return veriKoku(dugum.object);
}

function saltOkunur(context) {
  const bildir = node => context.report({ node, message: 'ctx.veri salt okunurdur (§5.2).' });
  return {
    AssignmentExpression(node) { if (veriKoku(node.left)) bildir(node); },
    UpdateExpression(node) { if (veriKoku(node.argument)) bildir(node); },
    UnaryExpression(node) {
      if (node.operator === 'delete' && veriKoku(node.argument)) bildir(node);
    },
    CallExpression(node) {
      const c = node.callee;
      const ad = c.computed ? c.property?.value : c.property?.name;
      if (c.object?.name === 'Object' && ad === 'assign' && veriKoku(node.arguments[0])) {
        bildir(node);
      }
    }
  };
}

function modulDurumu(context) {
  return {
    VariableDeclaration(node) {
      if (node.kind === 'const') return;
      let ust = node.parent;
      while (ust && !/Function/.test(ust.type)) ust = ust.parent;
      if (!ust) {
        context.report({ node, message: 'Modül düzeyinde let/var yasaktır (§5.2).' });
      }
    }
  };
}

function testFonksiyonlari(context) {
  function denetle(node) {
    const cagri = node.parent;
    if (cagri.type === 'CallExpression' && cagri.callee.name === 'describe') return;
    if (node.loc.end.line - node.loc.start.line + 1 > 40) {
      context.report({ node, message: 'Test işlevi 40 satırı aşamaz (§6.1).' });
    }
  }
  return {
    FunctionDeclaration: denetle, FunctionExpression: denetle,
    ArrowFunctionExpression: denetle
  };
}

const yerel = {
  rules: {
    'salt-okunur': { meta: { schema: [] }, create: saltOkunur },
    'modul-durumu': { meta: { schema: [] }, create: modulDurumu },
    'test-fonksiyonu': { meta: { schema: [] }, create: testFonksiyonlari }
  }
};
const DIZIN_YASAK = [
  { selector: 'ImportExpression', message: 'Düzenek import() kullanamaz.' },
  { selector: 'ExportNamedDeclaration[source]', message: 'Düzenek yeniden export yapamaz.' },
  { selector: 'ExportAllDeclaration', message: 'Düzenek yeniden export yapamaz.' },
  { selector: 'Program > VariableDeclaration[kind!="const"]',
    message: 'Modül düzeyinde let/var yasaktır.' },
  { selector: 'Program > ExportNamedDeclaration > VariableDeclaration[kind!="const"]',
    message: 'Modül düzeyinde let/var yasaktır.' }
];

export default [
  { ignores: ['node_modules/**', 'docs/check/**', 'coverage/**'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2020, sourceType: 'module' },
    linterOptions: { noInlineConfig: true },
    plugins: { sozlesme: yerel },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-implicit-globals': 'error',
      'max-lines': ['error', { max: 400, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': ['error', {
        max: 40, skipBlankLines: false, skipComments: false
      }],
      'max-len': ['error', { code: 100, tabWidth: 2 }]
    }
  },
  {
    files: ['araclar/**/*.js', 'test/**/*.js', 'iskelet.js'],
    languageOptions: { ecmaVersion: 2022, globals: globaller(NODE) }
  },
  {
    files: ['test/**/*.js'],
    // describe kapsayıcısı test gruplamasıdır; it/test ve yardımcılar yine <=40.
    rules: { 'max-lines-per-function': 'off', 'sozlesme/test-fonksiyonu': 'error' }
  },
  {
    files: UYGULAMA,
    languageOptions: { globals: globaller(TARAYICI) },
    rules: {
      'no-restricted-properties': sinirlar(),
      'no-restricted-globals': ['error', 'localStorage', 'canvas', 'getContext'],
      'no-restricted-syntax': ['error', {
        selector: 'Identifier[name="canvas"]', message: 'Canvas yalnız sahne/giris içindir.'
      }]
    }
  },
  {
    files: ['motor/sahne.js', 'motor/giris.js'],
    rules: {
      'no-restricted-properties': sinirlar({ canvas: true }),
      'no-restricted-globals': ['error', 'localStorage'],
      'no-restricted-syntax': 'off'
    }
  },
  {
    files: ['motor/kayit.js'],
    rules: {
      'no-restricted-properties': sinirlar({ kayit: true }),
      'no-restricted-globals': ['error', 'canvas', 'getContext']
    }
  },
  {
    files: ['geo/aci.js'],
    rules: { 'no-restricted-properties': sinirlar({ pi: true }) }
  },
  {
    files: ['geo/**/*.js'],
    rules: {
      'no-restricted-globals': ['error', ...DOM, 'localStorage', 'sessionStorage', 'indexedDB'],
      'no-restricted-syntax': ['error',
        ...DOM.map(ad => ({
          selector: 'Identifier[name="' + ad + '"]',
          message: 'geo DOM/zaman erişimi kullanamaz (§2.2, §5.2).'
        }))
      ],
      'no-restricted-imports': ['error', { patterns: ['*', '!./*'] }]
    }
  },
  {
    files: ['duzenekler/**/*.js'],
    rules: {
      'no-restricted-globals': ['error', ...YASAK],
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random' }, { object: 'Math', property: 'PI' },
        ...YASAK.map(ozellik)
      ],
      'no-restricted-imports': ['error', { patterns: ['*'] }],
      'no-restricted-syntax': ['error', ...DIZIN_YASAK,
        ...YASAK.map(ad => ({
          selector: 'Identifier[name="' + ad + '"]',
          message: 'Düzenek yalnız ctx üzerinden çalışır (§5.2).'
        }))
      ],
      'sozlesme/salt-okunur': 'error',
      'sozlesme/modul-durumu': 'error'
    }
  }
];
