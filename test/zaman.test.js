import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canlandir, canlandirmayiDurdur } from '../motor/zaman.js';

function saatKur(azalt = false) {
  const adlar = ['requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia'];
  const onceki = adlar.map(ad => Object.getOwnPropertyDescriptor(globalThis, ad));
  const bekleyen = new Map();
  let kimlik = 0;
  const degerler = [
    islev => { kimlik += 1; bekleyen.set(kimlik, islev); return kimlik; },
    id => bekleyen.delete(id),
    () => ({ matches: azalt })
  ];
  adlar.forEach((ad, i) => Object.defineProperty(globalThis, ad, {
    configurable: true, writable: true, value: degerler[i]
  }));
  return {
    bekleyen,
    kare(zaman) {
      const islevler = [...bekleyen.values()];
      bekleyen.clear();
      islevler.forEach(islev => islev(zaman));
    },
    kaldir() {
      adlar.forEach((ad, i) => {
        if (onceki[i]) Object.defineProperty(globalThis, ad, onceki[i]);
        else delete globalThis[ad];
      });
    }
  };
}

function animasyon(sure = 1000) {
  const kareler = [];
  const calisma = { sure, kare: t => kareler.push(t), bitti: () => {} };
  return { kareler, calisma };
}

describe('canlandir', () => {
  it('kare sayısı yerine geçen süreyle sıfır, yarım ve son konuma gider', async () => {
    const saat = saatKur();
    try {
      const { kareler, calisma } = animasyon();
      const oturum = { canli: true };
      const bitti = canlandir(oturum, calisma);
      saat.kare(400);
      saat.kare(900);
      saat.kare(1400);
      await bitti;
      assert.deepEqual(kareler, [0, 0.5, 1]);
      assert.equal(saat.bekleyen.size, 0);
      assert.equal(oturum.animasyonIptal, null);
    } finally { saat.kaldir(); }
  });
});

describe('canlandir', () => {
  it('seyrek karede son konumu aşmadan tamamlar', async () => {
    const saat = saatKur();
    try {
      const { kareler, calisma } = animasyon();
      const bitti = canlandir({ canli: true }, calisma);
      saat.kare(0);
      saat.kare(4000);
      await bitti;
      assert.deepEqual(kareler, [0, 1]);
    } finally { saat.kaldir(); }
  });
});

describe('canlandir', () => {
  it('hareket azaltma açıkken son kareyi doğrudan uygular', async () => {
    const saat = saatKur(true);
    try {
      const { kareler, calisma } = animasyon();
      await canlandir({ canli: true }, calisma);
      assert.deepEqual(kareler, [1]);
      assert.equal(saat.bekleyen.size, 0);
    } finally { saat.kaldir(); }
  });
});

describe('canlandir', () => {
  it('sıfır süreyi zaman bölmesi yapmadan tamamlar', async () => {
    const saat = saatKur();
    try {
      const { kareler, calisma } = animasyon(0);
      await canlandir({ canli: true }, calisma);
      assert.deepEqual(kareler, [1]);
      assert.equal(saat.bekleyen.size, 0);
    } finally { saat.kaldir(); }
  });
});

describe('canlandir', () => {
  it('iptal edilen oturumun bekleyen karesini kaldırıp sözü reddeder', async () => {
    const saat = saatKur();
    try {
      const { kareler, calisma } = animasyon();
      const oturum = { canli: true };
      const bitti = canlandir(oturum, calisma);
      const reddedildi = assert.rejects(bitti, { message: 'DUZENEK_YOK' });
      canlandirmayiDurdur(oturum);
      await reddedildi;
      assert.equal(saat.bekleyen.size, 0);
      assert.deepEqual(kareler, []);
      assert.equal(oturum.animasyonIptal, null);
    } finally { saat.kaldir(); }
  });
});

describe('canlandir', () => {
  it('kapanan oturum için yeni durum karesi üretmez', async () => {
    const saat = saatKur();
    try {
      const { kareler, calisma } = animasyon();
      const oturum = { canli: true };
      const bitti = canlandir(oturum, calisma);
      const reddedildi = assert.rejects(bitti, { message: 'DUZENEK_YOK' });
      oturum.canli = false;
      saat.kare(0);
      await reddedildi;
      assert.deepEqual(kareler, []);
    } finally { saat.kaldir(); }
  });
});

describe('canlandir', () => {
  it('karede oluşan hatayı bekleyen söze taşır ve yeni kare planlamaz', async () => {
    const saat = saatKur();
    try {
      const { calisma } = animasyon();
      calisma.kare = () => { throw new Error('SEMA_HATASI'); };
      const bitti = canlandir({ canli: true }, calisma);
      const reddedildi = assert.rejects(bitti, { message: 'SEMA_HATASI' });
      saat.kare(0);
      await reddedildi;
      assert.equal(saat.bekleyen.size, 0);
    } finally { saat.kaldir(); }
  });
});

describe('canlandir', () => {
  it('eksik veya geçersiz animasyon tanımını reddeder', () => {
    for (const sure of [-1, NaN, Infinity, undefined]) {
      const { calisma } = animasyon();
      calisma.sure = sure;
      assert.throws(() => canlandir({ canli: true }, calisma), {
        message: 'IMZA_EKSIK'
      });
    }
    assert.throws(() => canlandir({ canli: true }, { sure: 1 }), {
      message: 'IMZA_EKSIK'
    });
  });
});
