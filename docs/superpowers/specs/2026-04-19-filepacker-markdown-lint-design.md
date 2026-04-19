# filepacker Markdown Lint Design Spec

**Date:** 2026-04-19

## Goal

Fix `pack.js` so the generated `output.md` passes markdownlint rules, specifically MD041, MD002, MD040, and MD047.

## Violations and Fixes

### MD041 / MD002 — First line must be an h1 header

**Problem:** `output.md` currently starts with `## path/to/file` (h2).

**Fix:** Write `# Packed Files\n\n` as the first bytes of `output.md` in `main()`, before the file-section loop.

### MD040 — Fenced code blocks must have a language specified

**Problem:** Files with extensions not in `LANG_MAP` get an empty language tag (` ```\n `).

**Fix:** Change `LANG_MAP[ext] ?? ''` to `LANG_MAP[ext] ?? 'text'` in `formatFile`.

### MD047 — File must end with exactly one newline character

**Problem:** Each section ends with `\n\n`, so the last line of the file is a blank line. The file ends with two newlines.

**Fix:** After `fs.closeSync(fd)` in `main()`, truncate the file by 1 byte using `fs.truncateSync(outputPath, fs.statSync(outputPath).size - 1)`. This removes the trailing extra `\n`, leaving exactly one.

## Non-Goals

- MD013 (line length): source code lines inside fences can exceed 80 chars — not fixable without corrupting content
- MD012 (multiple blank lines): blank lines inside fences are not checked by linters
- No new CLI flags, no new files, no structural changes
