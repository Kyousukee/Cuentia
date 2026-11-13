// Genera los iconos de la app (PWA + iOS) a partir del logo original.
// Uso: node scripts/icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'public/brand/cuentia-logo.png';
const OUT = 'public/icons';
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Región de la marca "C" (con destellos y flecha) dentro del PNG de 1254×1254.
const MARK = { left: 270, top: 150, width: 710, height: 575 };

await mkdir(OUT, { recursive: true });

// Quita el fondo blanco ("color a alfa"): conserva bordes suaves y colores originales.
const { data, info } = await sharp(SRC).extract(MARK).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  const a = Math.max(255 - r, 255 - g, 255 - b) / 255;
  const un = (c) => (a > 0 ? Math.round((c - 255 * (1 - a)) / a) : 0);
  rgba[j] = un(r);
  rgba[j + 1] = un(g);
  rgba[j + 2] = un(b);
  rgba[j + 3] = a < 0.04 ? 0 : Math.round(a * 255);
}
const mark = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim({ threshold: 1 })
  .png()
  .toBuffer();

await sharp(mark).resize(240).png().toFile('public/brand/cuentia-mark.png');

/** Marca centrada en un lienzo cuadrado; `pad` = fracción de margen por lado. */
async function icon(size, pad, file, background = CLEAR) {
  const inner = Math.round(size * (1 - pad * 2));
  const resized = await sharp(mark).resize(inner, inner, { fit: 'contain', background: CLEAR }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/${file}`);
}

await icon(180, 0.1, 'apple-touch-icon.png');
await icon(192, 0.06, 'icon-192.png');
await icon(512, 0.06, 'icon-512.png');
// Maskable (Android) exige fondo sólido y zona segura.
await icon(512, 0.2, 'icon-maskable-512.png', WHITE);
await icon(64, 0.02, 'favicon-64.png');
await icon(32, 0, 'favicon-32.png');

console.log('Iconos generados en', OUT);
