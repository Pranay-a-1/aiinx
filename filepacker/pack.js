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
      results.push(absPath);
    }
  }
  return results;
}

/**
 * Format one file as a markdown section.
 */
function formatFile(absPath, relPath) {
  const ext  = path.extname(absPath).toLowerCase();
  const lang = LANG_MAP[ext] ?? '';
  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return `## ${relPath}\n\n_Could not read file._\n\n`;
  }
  return `## ${relPath}\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
}

function main() {
  const targetDir    = path.resolve(process.argv[2] ?? '.');
  const outputPath   = path.join(targetDir, 'output.md');
  const outputAbs    = path.resolve(outputPath);

  const files = collectFiles(targetDir, outputAbs);

  if (files.length === 0) {
    console.log('No files found.');
    return;
  }

  const fd = fs.openSync(outputPath, 'w');
  for (const absPath of files) {
    const relPath = path.relative(targetDir, absPath);
    fs.writeSync(fd, formatFile(absPath, relPath));
  }
  fs.closeSync(fd);

  console.log(`Packed ${files.length} files → ${path.relative(process.cwd(), outputPath)}`);
}

main();
