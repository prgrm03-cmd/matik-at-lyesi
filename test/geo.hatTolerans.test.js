import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as geo from '../geo/index.js';
import { rngOlustur } from '../motor/rng.js';
import { girisBagla } from '../motor/giris.js';
import { sahneOlustur } from '../motor/sahne.js';
import { sunumOlustur } from '../motor/sunum.js';
import { lazerOlustur } from '../widget/lazer.js';
import { motorOrtami } from './destek/motorOrtam.js';

const GENISLIKLER = [320, 360, 1080, 1920];

function tezgahaTasi(P) {
  return { x: P.x + 500, y: P.y + 500 };
}

function sahneKur(ortam, genislik) {
  const sinir = () => ({ left: 0, top: 0, width: genislik, height: genislik });
  ortam.ogeler.tezgah.getBoundingClientRect = sinir;
  ortam.ogeler.sahne.getBoundingClientRect = sinir;
  const mod = { tahta: false, metinOlcek: 1 };
  return sahneOlustur(ortam.kok, ortam.veri, mod, sunumOlustur(mod));
}

function isaretci(g, genislik, ad, P) {
  g.eleman.yay(ad, {
    pointerId: 1, button: 0, isPrimary: true,
    clientX: P.x * genislik / 1000, clientY: P.y * genislik / 1000
  });
}

function pimiYerlestir(g, genislik, ilk, hedef) {
  // Bir piksellik bırakma sapması her genişlikte farklı tezgâh uzaklığıdır.
  const yakin = { x: hedef.x + g.sahne.pxToBirim(1), y: hedef.y };
  isaretci(g, genislik, 'pointerdown', ilk);
  isaretci(g, genislik, 'pointermove', yakin);
  isaretci(g, genislik, 'pointerup', yakin);
}

function senaryoDene(g, genislik, lazer, seed) {
  const senaryo = geo.lazerSenaryosu(rngOlustur(seed));
  const sensor = senaryo.sensor.map(tezgahaTasi);
  const alarm = senaryo.alarm.map(tezgahaTasi);
  lazer.mod = senaryo.mod;
  lazer.A = { x: 100, y: 100 };
  lazer.B = { x: 900, y: 900 };
  const ciz = () => {
    g.sahne.temizle();
    sensor.forEach((P, i) => g.sahne.pim(P, { id: 'sensor' + i }));
    alarm.forEach((P, i) => g.sahne.pim(P, { id: 'alarm' + i }));
    lazer.ciz(g.sahne);
  };
  const giris = girisBagla(g, olay => { lazer.girdi(olay); ciz(); }, () => {});
  try {
    ciz();
    pimiYerlestir(g, genislik, lazer.A, sensor[0]);
    pimiYerlestir(g, genislik, lazer.B, sensor.at(-1));
    assert.deepEqual(lazer.A, sensor[0]);
    assert.deepEqual(lazer.B, sensor.at(-1));
    const sonuc = {
      sensor: lazer.gecerMi(sensor, geo.TOLERANS.hatBirim),
      alarm: lazer.gecerMi(alarm, geo.TOLERANS.hatBirim)
    };
    assert.deepEqual(sonuc.sensor, sensor.map(() => true));
    assert.deepEqual(sonuc.alarm, alarm.map(() => false));
    return JSON.stringify({ durum: lazer.durum(), sonuc });
  } finally {
    giris.kaldir();
  }
}

describe('ADT-010 hat toleransı', () => {
  it('gecerMi birim toleransının içini, sınırını ve dışını ayırır', () => {
    // ADT-010: gecerMi(noktalar, tolBirim) px değil tezgâh birimi alır.
    for (const mod of ['parca', 'isin', 'dogru']) {
      const lazer = lazerOlustur({ mod });
      lazer.A = { x: 100, y: 500 };
      lazer.B = { x: 900, y: 500 };
      const noktalar = [0, 11.9, 12, 12.1, 40, -11.9, -12, -12.1, -40]
        .map(sapma => ({ x: 500, y: 500 + sapma }));
      assert.deepEqual(lazer.gecerMi(noktalar, geo.TOLERANS.hatBirim),
        [true, true, true, false, false, true, true, false, false]);
      assert.deepEqual(lazer.gecerMi([lazer.A, lazer.B], geo.TOLERANS.hatBirim),
        [true, true]);
    }
  });

  it('I-010 değişmezi gerçek üretici aralığını korur ve 20 birimi reddeder', async t => {
    const kaynak = readFileSync(new URL('../geo/uretici.js', import.meta.url), 'utf8');
    const aralik = Number(/const EN_AZ_ARALIK = (\d+);/.exec(kaynak)?.[1]);
    assert.equal(aralik, 40);
    assert.ok(2 * geo.TOLERANS.hatBirim < aralik);
    assert.equal(2 * 20 < aralik, false);
    const kok = mkdtempSync(join(tmpdir(), 'matik-adt010-'));
    t.after(() => rmSync(kok, { recursive: true, force: true }));
    writeFileSync(join(kok, 'package.json'), '{"type":"module"}\n');
    cpSync(new URL('../geo/', import.meta.url), join(kok, 'geo'), { recursive: true });
    const yol = join(kok, 'geo/tolerans.js');
    const once = readFileSync(yol, 'utf8');
    const sonra = once.replace(/hatBirim: 12\b/, 'hatBirim: 20');
    assert.notEqual(sonra, once);
    writeFileSync(yol, sonra);
    await assert.rejects(import(pathToFileURL(join(kok, 'geo/uretici.js')).href),
      { message: 'ADT_010_HAT_ARALIGI' });
  });

  it('500 seed dört genişlikte snap sonrası aynı hat ve hükümleri üretir', t => {
    const ortam = motorOrtami(t);
    const beklenen = [];
    const modlar = new Set();
    for (const genislik of GENISLIKLER) {
      const g = sahneKur(ortam, genislik);
      const lazer = lazerOlustur({ mod: 'parca' });
      try {
        for (let seed = 1; seed <= 500; seed++) {
          const sonuc = senaryoDene(g, genislik, lazer, seed);
          modlar.add(lazer.mod);
          if (genislik === GENISLIKLER[0]) beklenen.push(sonuc);
          else assert.equal(sonuc, beklenen[seed - 1], 'seed=' + seed + ', px=' + genislik);
        }
      } finally {
        g.kaldir();
      }
    }
    assert.deepEqual([...modlar].sort(), ['dogru', 'isin', 'parca']);
  });
});
