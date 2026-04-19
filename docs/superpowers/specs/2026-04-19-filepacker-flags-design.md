# filepacker CLI Flags Design Spec

**Date:** 2026-04-19

## Goal

Add two optional CLI flags to `filepacker/pack.js`:
- `--remove-comments` — strips `//` and `/* */` comments from supported source files
- `--remove-empty-lines` — strips blank lines from all packed files

## CLI Usage

```bash
node pack.js [dir] [--remove-comments] [--remove-empty-lines]

# Examples
node pack.js                                        # pack current dir, no processing
node pack.js ./src --remove-comments                # strip comments only
node pack.js ./src --remove-empty-lines             # strip blank lines only
node pack.js ./src --remove-comments --remove-empty-lines  # both
```

Flags are position-independent (can appear before or after the dir argument).

## Supported Languages for Comment Removal

Comment removal only applies to files with these extensions:
`.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.tsx`, `.java`

All share the same comment syntax — no per-language branching needed.

## Comment Removal Rules

Using inline regex (zero dependencies). Three passes in order:

1. **Block comments** — remove `/* ... */` including multi-line and Javadoc `/** ... */`
2. **Line comments** — remove `// ...` from the end of a line (or whole line if `//` is the only content)
3. **String literal protection** — use a string-aware approach: scan character-by-character to skip content inside `"..."`, `'...'`, and `` `...` `` so that `"http://example.com"` is not mangled

Implementation strategy: single-pass scanner that tracks string state, emitting characters and skipping comment tokens when outside a string.

## Empty Line Removal Rules

Applied to ALL file types (after comment removal if both flags are set).

- A line is "empty" if it contains only whitespace (spaces, tabs)
- Remove all such lines entirely (do not collapse — remove)

## Code Change

Add `processContent(content, ext, opts)` function to `pack.js`:
- `opts.removeComments` (bool) — apply comment stripping if ext is in supported set
- `opts.removeEmptyLines` (bool) — apply empty line stripping

Called inside `formatFile` after reading the file, before building the markdown section.

`main()` parses flags from `process.argv` and passes `opts` through to `formatFile`.

## Non-Goals

- No support for `#` comments (Python, Ruby, YAML, shell) — not in user's target stack
- No HTML comment removal (`<!-- -->`)
- No AST/Tree-sitter parsing
- No new files — all changes stay in `filepacker/pack.js`
