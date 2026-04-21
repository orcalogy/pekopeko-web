import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const knownExtensions = ['.mts', '.ts', '.tsx', '.js', '.mjs'];

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('@/')) {
    const relativePath = specifier.slice(2);
    const basePath = path.join(srcRoot, relativePath);
    const resolvedPath = resolveFile(basePath);

    if (!resolvedPath) {
      return defaultResolve(specifier, context, defaultResolve);
    }

    return {
      shortCircuit: true,
      url: pathToFileURL(resolvedPath).href,
    };
  }

  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if (
      error?.code !== 'ERR_MODULE_NOT_FOUND' ||
      (!specifier.startsWith('./') && !specifier.startsWith('../') && !specifier.startsWith('/'))
    ) {
      throw error;
    }

    const parentPath = context.parentURL
      ? path.dirname(new URL(context.parentURL).pathname)
      : projectRoot;
    const resolvedPath = resolveFile(path.resolve(parentPath, specifier));
    if (!resolvedPath) {
      throw error;
    }

    return {
      shortCircuit: true,
      url: pathToFileURL(resolvedPath).href,
    };
  }
}

function resolveFile(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  for (const extension of knownExtensions) {
    const withExtension = `${basePath}${extension}`;
    if (fs.existsSync(withExtension) && fs.statSync(withExtension).isFile()) {
      return withExtension;
    }
  }

  for (const extension of knownExtensions) {
    const indexPath = path.join(basePath, `index${extension}`);
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      return indexPath;
    }
  }

  return null;
}
