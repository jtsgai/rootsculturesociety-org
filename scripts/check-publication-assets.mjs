import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(new URL('../src/data/site.ts', import.meta.url), 'utf8');
const publicationsBlock = source.match(/export const publications = \[([\s\S]*?)\n\];/);

if (!publicationsBlock) {
  throw new Error('Could not find the publications data block in src/data/site.ts.');
}

const imagePaths = [...publicationsBlock[1].matchAll(/image:\s*['"]([^'"]+)['"]/g)].map(
  ([, imagePath]) => imagePath,
);

if (imagePaths.length === 0) {
  throw new Error('No publication cover images were found in src/data/site.ts.');
}

const missingPaths = imagePaths.filter((imagePath) => {
  if (!imagePath.startsWith('/')) return true;
  return !existsSync(resolve('public', `.${imagePath}`));
});

if (missingPaths.length > 0) {
  throw new Error(`Missing publication cover image(s):\n${missingPaths.join('\n')}`);
}

console.log(`Publication image check passed (${imagePaths.length} covers).`);
