#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

// Directories to never descend into
const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', '.cache', '.next',
  '.svelte-kit', 'build', 'coverage', '.turbo',
]);

// Extensions treated as binary — skip these
const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.gz', '.tar', '.7z', '.rar',
  '.exe', '.bin', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.ogg', '.mov', '.avi',
]);

// Filenames that should never be packed (credential exposure risk)
const SENSITIVE_NAMES = new Set([
  '.env', '.env.local', '.env.production', '.env.development',
  '.env.staging', '.env.test',
]);

// Map extension → markdown language tag
const LANG_MAP = {
  '.js':   'js',
  '.mjs':  'js',
  '.cjs':  'js',
  '.ts':   'typescript',
  '.tsx':  'typescript',
  '.jsx':  'jsx',
  '.json': 'json',
  '.py':   'python',
  '.rb':   'ruby',
  '.rs':   'rust',
  '.go':   'go',
  '.java': 'java',
  '.c':    'c',
  '.cpp':  'cpp',
  '.h':    'c',
  '.cs':   'csharp',
  '.php':  'php',
  '.sh':   'bash',
  '.bash': 'bash',
  '.zsh':  'bash',
  '.html': 'html',
  '.css':  'css',
  '.scss': 'scss',
  '.yaml': 'yaml',
  '.yml':  'yaml',
  '.toml': 'toml',
  '.md':   'markdown',
  '.sql':  'sql',
  '.xml':  'xml',
  '.vue':  'vue',
  '.svelte':'svelte',
  '.kt':   'kotlin',
  '.swift':'swift',
  '.r':    'r',
  '.lua':  'lua',
};

// Extensions that support comment removal (all use // and /* */ syntax)
const COMMENT_EXTS = new Set([
  '.js', '.mjs', '.cjs', '.jsx',
  '.ts', '.tsx',
  '.java',
  '.cs', '.go', '.swift', '.kt', '.php',
  '.rs', '.c', '.cpp', '.h',
  '.scss',
]);

/**
 * Strip // line comments and /* block comments from source content.
 * String-aware: skips content inside "", '', and `` literals.
 * @note Regex literals containing // (e.g. /https?:\/\//) will be corrupted.
 *       This is a known limitation of regex-based comment removal.
 */
function removeComments(content) {
  const out = [];
  let i = 0;
  const len = content.length;

  while (i < len) {
    const ch = content[i];

    // String literal — copy verbatim until closing quote
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out.push(content[i++]);
      while (i < len) {
        if (content[i] === '\\' && i + 1 < len) {
          // escaped character — keep both
          out.push(content[i++]);
          out.push(content[i++]);
        } else if (content[i] === quote) {
          out.push(content[i++]);
          break;
        } else {
          out.push(content[i++]);
        }
      }
      continue;
    }

    // Block comment  /* ... */
    if (ch === '/' && i + 1 < len && content[i + 1] === '*') {
      i += 2; // skip /*
      while (i + 1 < len && !(content[i] === '*' && content[i + 1] === '/')) {
        i++;
      }
      i += 2; // skip */
      continue;
    }

    // Line comment  // ...
    if (ch === '/' && i + 1 < len && content[i + 1] === '/') {
      while (i < len && content[i] !== '\n') {
        i++;
      }
      // leave the newline in place — don't advance past it
      continue;
    }

    out.push(content[i++]);
  }

  return out.join('');
}

/**
 * Apply content transformations based on opts.
 * @param {string} content   Raw file text
 * @param {string} ext       Lowercase file extension e.g. '.js'
 * @param {{ removeComments: boolean, removeEmptyLines: boolean }} opts
 * @returns {string}
 */
function processContent(content, ext, opts = {}) {
  let out = content;

  if (opts.removeComments && COMMENT_EXTS.has(ext)) {
    out = removeComments(out);
  }

  if (opts.removeEmptyLines) {
    // Note: trailing newline is not preserved after this filter.
    out = out.split('\n').filter(line => line.trim() !== '').join('\n');
  }

  return out;
}

/**
 * Recursively collect all non-binary, non-ignored file paths
 * under `dir`. Returns absolute paths sorted alphabetically.
 */
function collectFiles(dir, outputAbsPath, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results; // unreadable dir — skip silently
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      collectFiles(path.join(dir, entry.name), outputAbsPath, results);
    } else if (entry.isFile()) {
      const absPath = path.join(dir, entry.name);
      if (absPath === outputAbsPath) continue;               // skip output file
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTS.has(ext)) continue;                   // skip binaries
      if (SENSITIVE_NAMES.has(entry.name)) continue;        // skip sensitive files
      results.push(absPath);
    }
  }
  return results;
}

/**
 * Format one file as a markdown section.
 */
function formatFile(absPath, relPath, opts) {
  const ext  = path.extname(absPath).toLowerCase();
  const lang = LANG_MAP[ext] ?? '';
  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return `## ${relPath}\n\n_Could not read file._\n\n`;
  }

  content = processContent(content, ext, opts);

  const fence = content.includes('```') ? '````' : '```';
  return `## ${relPath}\n\n${fence}${lang}\n${content}\n${fence}\n\n`;
}

function main() {
  const args = process.argv.slice(2);

  const removeComments   = args.includes('--remove-comments');
  const removeEmptyLines = args.includes('--remove-empty-lines');
  const dirArg = args.find(a => !a.startsWith('--'));

  const opts = { removeComments, removeEmptyLines };

  const targetDir  = path.resolve(dirArg ?? '.');
  const outputPath = path.join(targetDir, 'output.md');

  const files = collectFiles(targetDir, outputPath);

  if (files.length === 0) {
    console.log('No files found.');
    return;
  }

  let fd;
  try {
    fd = fs.openSync(outputPath, 'w');
  } catch (err) {
    console.error(`Error: cannot write output file: ${err.message}`);
    process.exit(1);
  }
  try {
    for (const absPath of files) {
      const relPath = path.relative(targetDir, absPath);
      fs.writeSync(fd, formatFile(absPath, relPath, opts));
    }
  } finally {
    fs.closeSync(fd);
  }

  console.log(`Packed ${files.length} files → ${path.relative(process.cwd(), outputPath)}`);
}

main();
