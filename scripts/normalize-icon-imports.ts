import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const iconIndexImport = "@/components/icons";

function getFiles(dir: string, exts: string[] = ['.ts', '.tsx']): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath, exts));
    } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeImports(content: string): string {
  // local icon path variants that should be normalized
  const pathRegex = /from\s+['"]([^'"]*components\/icons[^'"]*\.(tsx|ts))['"]/g;

  return content.replace(pathRegex, (_, originalPath) => {
    // If already from alias path, keep it
    if (originalPath.startsWith('@/components/icons')) {
      return `from '${iconIndexImport}'`;
    }

    // Convert everything that points to components/icons/* to the normalized index path
    return `from '${iconIndexImport}'`;
  });
}

function runNormalization() {
  const files = getFiles(projectRoot, ['.ts', '.tsx']);

  for (const file of files) {
    const relativeFile = path.relative(projectRoot, file);
    const content = fs.readFileSync(file, { encoding: 'utf8' });

    if (!content.includes('components/icons')) continue;

    const normalized = normalizeImports(content);

    if (normalized !== content) {
      fs.writeFileSync(file, normalized, { encoding: 'utf8' });
      console.log(`Normalized icon imports in: ${relativeFile}`);
    }
  }

  console.log('Icon import normalization complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runNormalization();
}
