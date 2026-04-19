# filepacker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a single zero-dependency Node.js script that recursively packs all text files in a directory into one `output.md` file, showing each file's relative path and contents as a fenced code block.

**Architecture:** A single `pack.js` script does a recursive directory walk using only Node's built-in `fs` and `path` modules, filters out binaries and ignored dirs, then streams each file into `output.md` as a markdown code block. No packages, no config files.

**Tech Stack:** Node.js (built-ins only: `fs`, `path`)

---

### Task 1: Create the `filepacker/` folder and scaffold `pack.js`

**Files:**
- Create: `filepacker/pack.js`

- [ ] **Step 1: Create the folder and empty file**

```bash
mkdir -p /home/pran/anotherDrive/codes/aiinx/filepacker
touch /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js
```

- [ ] **Step 2: Write the constants — ignored dirs, binary extensions, language map**

Open `filepacker/pack.js` and write:

```js
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
```

- [ ] **Step 3: Write the recursive file collector**

Append to `filepacker/pack.js`:

```js
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
```

- [ ] **Step 4: Write the markdown formatter and main entry point**

Append to `filepacker/pack.js`:

```js
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
```

- [ ] **Step 5: Make the script executable**

```bash
chmod +x /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js
```

- [ ] **Step 6: Smoke test — run against the filepacker dir itself**

```bash
cd /home/pran/anotherDrive/codes/aiinx/filepacker
node pack.js .
```

Expected stdout: `Packed 1 files → output.md`

Then verify `output.md` was created and looks like:

```bash
head -6 /home/pran/anotherDrive/codes/aiinx/filepacker/output.md
```

Expected output:
```
## pack.js

```js
#!/usr/bin/env node
'use strict';
```

- [ ] **Step 7: Run against the parent repo to verify scale**

```bash
node /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js /home/pran/anotherDrive/codes/aiinx
```

Expected stdout: `Packed N files → output.md` (some number > 1, no crash)

Check that `output.md` is not empty:

```bash
wc -l /home/pran/anotherDrive/codes/aiinx/output.md
```

- [ ] **Step 8: Commit**

```bash
cd /home/pran/anotherDrive/codes/aiinx
git add filepacker/pack.js
git commit -m "feat: add filepacker — zero-dep file amalgamation script"
```
