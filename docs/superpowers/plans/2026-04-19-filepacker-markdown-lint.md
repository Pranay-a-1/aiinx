# filepacker Markdown Lint Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `filepacker/pack.js` so that generated `output.md` files pass markdownlint rules MD041, MD002, MD040, and MD047.

**Architecture:** Three surgical edits to `pack.js`: add an h1 title at the top of output, use `'text'` as fallback language tag, and truncate the trailing extra newline after writing.

**Tech Stack:** Node.js built-ins only (`fs`, `path`)

---

### Task 1: Apply all three markdown lint fixes to pack.js

**Files:**
- Modify: `filepacker/pack.js` (lines 190, 224–236)

- [ ] **Step 1: Fix MD040 — change empty language fallback to `'text'`**

In `filepacker/pack.js`, find line 190:

```js
  const lang = LANG_MAP[ext] ?? '';
```

Replace with:

```js
  const lang = LANG_MAP[ext] ?? 'text';
```

- [ ] **Step 2: Fix MD041/MD002 — write h1 title before file sections**

In `main()`, find the `try` block that opens the fd (around line 223):

```js
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
```

Replace with:

```js
  let fd;
  try {
    fd = fs.openSync(outputPath, 'w');
  } catch (err) {
    console.error(`Error: cannot write output file: ${err.message}`);
    process.exit(1);
  }
  try {
    fs.writeSync(fd, '# Packed Files\n\n');
    for (const absPath of files) {
      const relPath = path.relative(targetDir, absPath);
      fs.writeSync(fd, formatFile(absPath, relPath, opts));
    }
  } finally {
    fs.closeSync(fd);
  }

  // MD047: trim trailing extra newline so file ends with exactly one \n
  const size = fs.statSync(outputPath).size;
  fs.truncateSync(outputPath, size - 1);
```

- [ ] **Step 3: Syntax check**

```bash
node --check /home/pran/anotherDrive/codes/aiinx/filepacker/pack.js && echo "syntax OK"
```

Expected: `syntax OK`

- [ ] **Step 4: Smoke test — run pack and verify output structure**

```bash
cd /home/pran/anotherDrive/codes/aiinx && node filepacker/pack.js .
head -4 output.md
```

Expected first 4 lines:

```text
# Packed Files

## docs/superpowers/plans/2026-04-19-filepacker-flags.md

```

- [ ] **Step 5: Verify MD041 — first line is h1**

```bash
head -1 /home/pran/anotherDrive/codes/aiinx/output.md
```

Expected: `# Packed Files`

- [ ] **Step 6: Verify MD047 — file ends with exactly one newline**

```bash
tail -c 2 /home/pran/anotherDrive/codes/aiinx/output.md | xxd
```

Expected: last byte is `0a` (newline), second-to-last byte is NOT `0a` (i.e. `0a 0a` would be a failure — we want only one `0a` at end).

Alternatively:

```bash
tail -c 1 /home/pran/anotherDrive/codes/aiinx/output.md | xxd | grep '0a'
```

Expected: one line showing `0a`

- [ ] **Step 7: Verify MD040 — no fenced block with empty language tag**

```bash
grep -c '^\`\`\`$' /home/pran/anotherDrive/codes/aiinx/output.md || true
```

Expected: `0` (all opening fences have a language tag; closing fences are ` ``` ` alone which is correct)

- [ ] **Step 8: Commit**

```bash
cd /home/pran/anotherDrive/codes/aiinx
git add filepacker/pack.js
git commit -m "fix: generate markdownlint-compliant output (MD040, MD041, MD047)"
```
