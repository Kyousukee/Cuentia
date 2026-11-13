// Genera los iconos de la app (PWA + iOS) a partir del logo original.
// Uso: node scripts/icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'public/brand/cuentia-logo.png';
const OUT = 'public/icons';
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

// Región de la marca "C" (con destellos y flecha) dentro del PNG de 1254×1254.
const MARK = { left: 270, top: 150, width: 710, height: 575 };

await mkdir(OUT, { recursive: true });

const mark = await sharp(SRC).extract(MARK).png().toBuffer();

// Marca con fondo transparente ("color a alfa" sobre blanco) para usar dentro de la app.
{
  const { data, info } = await sharp(mark).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const a = Math.max(255 - r, 255 - g, 255 - b) / 255;
    const un = (c) => (a > 0 ? Math.round((c - 255 * (1 - a)) / a) : 0);
    out[j] = un(r);
    out[j + 1] = un(g);
    out[j + 2] = un(b);
    out[j + 3] = a < 0.04 ? 0 : Math.round(a * 255);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(240)
    .png()
    .toFile('public/brand/cuentia-mark.png');
}

/** Marca centrada en un lienzo cuadrado; `pad` = fracción de margen por lado. */
async function icon(size, pad, file) {
  const inner = Math.round(size * (1 - pad * 2));
  const resized = await sharp(mark)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: resized, gravity: 'center' }])
    .flatten({ background: BG })
    .png()
    .toFile(`${OUT}/${file}`);
}

await icon(180, 0.1, 'apple-touch-icon.png');
await icon(192, 0.08, 'icon-192.png');
await icon(512, 0.08, 'icon-512.png');
await icon(512, 0.2, 'icon-maskable-512.png'); // zona segura para Android
await icon(64, 0.04, 'favicon-64.png');
await icon(32, 0.02, 'favicon-32.png');

console.log('Iconos generados en', OUT);
