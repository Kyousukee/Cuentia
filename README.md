# Cuentia 💚

> Tus cuentas, más simples.

App personal de finanzas en **Angular 22**: ingresos y gastos, presupuestos mensuales,
gráficas y metas de ahorro. Moneda **CLP**. Todo se guarda **en el dispositivo**
(IndexedDB) — sin servidor ni cuentas. Pensada como PWA para anclarla en la pantalla
de inicio del iPhone.

## Comandos

```bash
npm install
npm start            # http://localhost:4200
npm run start:lan    # accesible desde el iPhone en la misma red Wi‑Fi
npm test             # pruebas unitarias (Vitest)
npm run build        # build de producción en dist/cuentia
npm run icons        # regenera iconos desde public/brand/cuentia-logo.png
```

## Usarla en el iPhone

1. En el PC: `npm run start:lan` y busca tu IP local (`ipconfig` → IPv4, p. ej. `192.168.1.20`).
2. En el iPhone (misma Wi‑Fi), abre **Safari** en `http://192.168.1.20:4200`.
3. Toca **Compartir → Agregar a inicio**.

Se abre a pantalla completa con el icono de Cuentia. Los datos viven en el almacenamiento
de Safari de ese iPhone; usa **Ajustes → Exportar** para respaldarlos (puedes guardarlos en Archivos/iCloud).

**Modo offline:** iOS solo activa el service worker con HTTPS. Para tenerlo en local,
crea un certificado con [mkcert](https://github.com/FiloSottile/mkcert), instala su CA
raíz en el iPhone y ejecuta:

```bash
ng serve --host 0.0.0.0 --configuration production --ssl --ssl-cert cert.pem --ssl-key key.pem
```

Más adelante, publicarla en un hosting con HTTPS (Netlify, Vercel, Cloudflare Pages…) lo resuelve sin pasos extra.

## Estructura

```
src/app/
  core/        modelos, base de datos (Dexie), stores con signals, cálculos y formato CLP
  shared/      componentes reutilizables: hoja inferior, teclado de montos, gráficas SVG, íconos
  layout/      barra de pestañas y notificaciones
  features/    home · transactions · budgets · summary · goals · settings
src/styles/_tokens.scss   colores, tipografía y forma de la marca (modo claro/oscuro)
```

## Diseño

- Colores del logo: verde lima `#5BE07A`, verde `#22C46E`, teal `#0E8F7E`, navy `#16213D`.
- Tipografías: **Fredoka** (títulos y cifras) y **Nunito** (texto), empaquetadas localmente.
- La paleta de categorías de las gráficas está validada para daltonismo y contraste en ambos temas.
