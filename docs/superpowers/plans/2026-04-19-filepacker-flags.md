# filepacker CLI Flags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--remove-comments` and `--remove-empty-lines` flags to `filepacker/pack.js` using inline regex/scanner logic with zero new dependencies.

**Architecture:** Two additions to the single `pack.js` file: (1) a `processContent(content, ext, opts)` function that handles comment stripping via a single-pass string-aware character scanner and empty-line removal via a line filter; (2) flag parsing in `main()` and wiring in `formatFile`. All changes stay in one file.

**Tech Stack:** Node.js built-ins only (`fs`, `path`)

---

### Task 1: Add `processContent` — comment removal and empty line removal

**Files:**
- Modify: `filepacker/pack.js` (insert new function before `formatFile`)

The current `formatFile` starts at line 98. Insert `processContent` and its helpers just before it.

- [ ] **Step 1: Add `COMMENT_EXTS` constant after `LANG_MAP`**

In `filepacker/pack.js`, after the closing `};` of `LANG_MAP` (after line 65), add:

```js
// Extensions that support comment removal
const COMMENT_EXTS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.java']);
```

- [ ] **Step 2: Add `removeComments` function after `COMMENT_EXTS`**

Add this function after the `COMMENT_EXTS` constant:

```js
/**
 * Strip // line comments and /* block comments from source content.
 * String-aware: skips content inside "", '', and `` literals.
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
```

- [ ] **Step 3: Add `processContent` function after `removeComments`**

```js
/**
 * Apply content transformations based on opts.
 * @param {string} content   Raw file text
 * @param {string} ext       Lowercase file extension e.g. '.js'
 * @param {{ removeComments: boolean, removeEmptyLines: boolean }} opts
 * @returns {string}
 */
function processContent(content, ext, opts) {
  let out = content;

  if (opts.removeComments && COMMENT_EXTS.has(ext)) {
    out = removeComments(out);
  }

  if (opts.removeEmptyLines) {
    out = out.split('\n').filter(line => line.trim() !== '').join('\n');
  }

  return out;
}
```

- [ ] **Step 4: Verify the functions work with a quick inline test**

```bash
node -e "
const content = \`
// top comment
const x = 1; // inline
/* block */ const y = 2;
/**
 * javadoc
 */
const url = 'http://example.com';
const s = \"he said // not a comment\";

const z = 3;
\`;

// paste removeComments and processContent here inline, or load the file
// Quick structural check — run pack.js itself to confirm no syntax errors:
require('/home/pran/anotherDrive/codes/aiinx/filepacker/pack.js');
console.log('syntax OK');
" 2>&1
```

Expected: `syntax OK` (the script runs without error; main() will fire but output.md write is acceptable)

Actually, since `main()` runs on require, use this instead to check syntax only:

```bash
node --check /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js && echo "syntax OK"
```

Expected: `syntax OK`

- [ ] **Step 5: Commit**

```bash
cd /home/pran/anotherDrive/codes/aiinx
git add filepacker/pack.js
git commit -m "feat: add processContent with comment and empty-line removal"
```

---

### Task 2: Parse CLI flags and wire `processContent` into `formatFile` and `main`

**Files:**
- Modify: `filepacker/pack.js` (`formatFile` and `main` functions)

- [ ] **Step 1: Update `formatFile` to accept and use `opts`**

The current `formatFile` signature is:
```js
function formatFile(absPath, relPath) {
```

Replace the entire `formatFile` function with:

```js
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
```

- [ ] **Step 2: Update `main` to parse flags and pass `opts`**

Replace the entire `main` function with:

```js
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
```

- [ ] **Step 3: Syntax check**

```bash
node --check /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js && echo "syntax OK"
```

Expected: `syntax OK`

- [ ] **Step 4: Smoke test — no flags (baseline unchanged)**

```bash
cd /home/pran/anotherDrive/codes/aiinx/filepacker && node pack.js .
```

Expected: `Packed 1 files → output.md`

- [ ] **Step 5: Smoke test — `--remove-comments`**

Create a temp JS file with comments, run pack on it, verify comments are stripped:

```bash
mkdir -p /tmp/packtest
cat > /tmp/packtest/sample.js << 'EOF'
// top comment
const x = 1; // inline
/* block */ const y = 2;
const url = 'http://example.com';
const z = 3;
EOF

node /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js /tmp/packtest --remove-comments
grep -c '//' /tmp/packtest/output.md || true
```

Expected: `0` (no `//` remaining in output except possibly inside the `http://` string literal)

Also check `http://` is preserved:
```bash
grep 'http://' /tmp/packtest/output.md
```
Expected: `const url = 'http://example.com';`

- [ ] **Step 6: Smoke test — `--remove-empty-lines`**

```bash
cat > /tmp/packtest/spaced.js << 'EOF'
const a = 1;

const b = 2;


const c = 3;
EOF

node /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js /tmp/packtest --remove-empty-lines
grep -c '^$' /tmp/packtest/output.md || true
```

Expected: `0` (no blank lines in output)

- [ ] **Step 7: Smoke test — both flags together**

```bash
node /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js /tmp/packtest --remove-comments --remove-empty-lines
wc -l /tmp/packtest/output.md
```

Expected: output has no `//` comment lines and no blank lines; line count is lower than without flags.

- [ ] **Step 8: Smoke test — run on the real repo**

```bash
node /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js /home/pran/anotherDrive/codes/aiinx --remove-comments --remove-empty-lines
```

Expected: `Packed N files → output.md` (no crash)

- [ ] **Step 9: Clean up temp test dir**

```bash
rm -rf /tmp/packtest
```

- [ ] **Step 10: Commit**

```bash
cd /home/pran/anotherDrive/codes/aiinx
git add filepacker/pack.js
git commit -m "feat: wire --remove-comments and --remove-empty-lines flags into CLI"
```
