# filepacker — Design Spec

**Date:** 2026-04-19

## Goal

A single Node.js script with zero dependencies that recursively packs all files in a directory into one `output.md` file, with each file's path and contents rendered as a fenced code block.

## Folder Structure

```
filepacker/
└── pack.js
```

## Behavior

1. Walk the directory where `pack.js` lives (or an optional path argument)
2. Skip the following by default:
   - `node_modules/`, `.git/`, `dist/`, `.cache/`
   - The output file itself (`output.md`)
   - Binary files (detected by extension: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.eot`, `.pdf`, `.zip`, `.gz`, `.tar`, `.exe`, `.bin`)
3. For each included file, append to `output.md`:

```
## relative/path/to/file.ext

```lang
<file contents>
```
```

4. Language tag is inferred from file extension (`.js` → `js`, `.py` → `python`, `.ts` → `typescript`, unknown → empty string)
5. Print a summary line to stdout: `Packed 23 files → output.md`

## CLI Usage

```bash
node pack.js              # packs current dir
node pack.js ./some/dir   # optional target dir
```

## Non-Goals

- No config file
- No glob patterns
- No `.packignore`
- No npm packages
