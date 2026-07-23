# Mandelbrot Demo

Renders the Mandelbrot set using rm-wasm — the entire fractal computation is defined as a C-like TypeScript DSL and compiled to WebAssembly.

## How it works

1. **`src/mandelbrot.ts`** — Defines the `mandelbrot` function using the rm-wasm DSL. Uses nested `While` loops, `If`/`Else` control flow, f64 arithmetic, and the `store8` helper for byte-level pixel output.

2. **`src/runner.ts`** — Compiles the DSL to WAT via `compileWAT()`, converts to WASM binary with `wabt.js`, instantiates the module, and renders pixel data to a `<canvas>`.

3. **Memory model**: The WASM module has a 1-page linear memory. JS passes a pointer (offset 0) and the WASM function writes RGBA pixels directly into shared memory. JS reads the buffer back via `Uint8ClampedArray` on the exported `memory`.

## Run

```bash
pnpm --filter @rm-wasm/demo-mandelbrot dev
```

Or from the root:

```bash
cd demos/mandelbrot
pnpm dev
```

## Controls

| Control | Range | Default |
|---------|-------|---------|
| Iterations | 16–512 | 128 |
| Zoom | 0–40 | 4 |
| Pan X | -2–2 | 0 |
| Pan Y | -2–2 | 0 |
