// Build QA-only theme fixtures without adding a product theme selector.
import { readFile, writeFile } from 'node:fs/promises';
const base = new URL('./', import.meta.url);
const css = await readFile(new URL('styles.css', base), 'utf8');
const html = await readFile(new URL('index.html', base), 'utf8');
for (const [theme, media] of [['light', '@media not all'], ['dark', '@media all']]) {
  await writeFile(new URL(`qa-${theme}.css`, base), css.replaceAll('@media(prefers-color-scheme:dark)', media));
  await writeFile(new URL(`qa-${theme}.html`, base), html.replace('href="styles.css"', `href="qa-${theme}.css"`));
}
