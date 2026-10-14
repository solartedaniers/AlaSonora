// Íconos de Material Symbols de la app: una lista central (src/app/theme/material-icons.json) y este script.
//   node scripts/material-icons.mjs          → revisa que todo ícono usado esté en la lista (corre antes del build)
//   node scripts/material-icons.mjs --subset → además descarga el subconjunto de Google Fonts con esa lista y lo
//                                              incrusta en src/app/theme/_material-symbols-font.scss
// Al usar un ícono nuevo: agrégalo a la lista y corre --subset.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const LIST = join(SRC, 'app/theme/material-icons.json');
const FONT_SCSS = join(SRC, 'app/theme/_material-symbols-font.scss');
const CSS_API = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=';
// Google Fonts entrega woff2 solo a navegadores modernos: me identifico como uno.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const ICON_NAME = /^[a-z0-9_]+$/;

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : /\.(html|ts)$/.test(name) ? [path] : [];
});

/** Nombres literales dentro de los elementos con la clase del ícono, más los nombres que el código arma. */
function usedIcons() {
  const used = new Map();
  const add = (name, file) => { if (ICON_NAME.test(name)) used.set(name, used.get(name) ?? relative(ROOT, file)); };
  for (const file of files(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const [, , inner] of text.matchAll(/<(\w+)[^>]*class="[^"]*material-symbols-outlined[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)) {
      const literal = inner.replace(/\{\{[\s\S]*?\}\}/g, '').trim();
      if (literal) add(literal, file);
      for (const [, expr] of inner.matchAll(/\{\{([\s\S]*?)\}\}/g)) for (const [, q] of expr.matchAll(/'([a-z0-9_]+)'/g)) add(q, file);
    }
    // Íconos elegidos por código: propiedades `icon: '...'` y mapas cuyo nombre termina en Icon(s).
    for (const [, name] of text.matchAll(/\bicon:\s*'([a-z0-9_]+)'/g)) add(name, file);
    for (const [, body] of text.matchAll(/\w*Icons?\b[^=\n]*=\s*\{([^}]*)\}/g)) for (const [, q] of body.matchAll(/'([a-z0-9_]+)'/g)) add(q, file);
  }
  return used;
}

const list = JSON.parse(readFileSync(LIST, 'utf8'));
const used = usedIcons();
const missing = [...used.keys()].filter((name) => !list.includes(name)).sort();
const unused = list.filter((name) => !used.has(name));
if (missing.length) {
  console.error(`Íconos usados que faltan en material-icons.json:\n${missing.map((n) => `  ${n}  (${used.get(n)})`).join('\n')}`);
  process.exit(1);
}
if (unused.length) console.warn(`Íconos en la lista que ya no se usan: ${unused.join(', ')}`);
console.log(`material icons OK: ${list.length} en la lista, ${used.size} en uso`);

if (process.argv.includes('--subset')) {
  const names = [...list].sort().join(',');
  const css = await (await fetch(CSS_API + names, { headers: { 'User-Agent': BROWSER_UA } })).text();
  const url = css.match(/url\((https:[^)]+)\)\s*format\('woff2'\)/)?.[1];
  if (!url) throw new Error(`Google Fonts no devolvió un woff2:\n${css.slice(0, 300)}`);
  const font = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(FONT_SCSS, `// Generado por scripts/material-icons.mjs --subset a partir de material-icons.json. No editar a mano.
// La fuente va incrustada en el CSS: sin una petición aparte, los íconos nunca se ven como su nombre
// aunque la red falle o Render esté despertando.
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url('data:font/woff2;base64,${font.toString('base64')}') format('woff2');
}
`);
  console.log(`subset: ${list.length} íconos, ${font.length} bytes → ${relative(ROOT, FONT_SCSS)}`);
}
