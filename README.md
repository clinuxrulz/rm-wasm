# rm-wasm

[![npm](https://img.shields.io/npm/v/@random-mesh/rm-wasm.svg)](https://www.npmjs.com/package/@random-mesh/rm-wasm)
[![GitHub](https://img.shields.io/badge/GitHub-anomalyco/rm--wasm-blue.svg)](https://github.com/clinuxrulz/rm-wasm)

A C-like TypeScript DSL that compiles to WAT (WebAssembly Text Format). Follows the same node-graph DAG architecture as [RMSL](https://github.com/anomalyco/rmsl).

## Quick start

```typescript
import { Fn, i32, compileWAT, clearRegistry } from "rm-wasm";

clearRegistry();

const add = Fn("add", {
  params: [{ name: "a", type: "i32" }, { name: "b", type: "i32" }],
  result: "i32",
}, (a, b) => a.add(b));

const main = Fn("main", { result: "i32" }, () => add(i32(40), i32(2)));

const wat = compileWAT({ exports: ["main"] });
console.log(wat);
```

## Features

- **Primitive types**: `i32`, `i64`, `f32`, `f64`
- **Arithmetic & comparison ops**: methods on all node types
- **Variables**: `.toVar()` / `.assign()`
- **Control flow**: `If`/`Else If`/`Else`, `Loop`, `While`, `Break`, `Continue`, `Return`
- **Functions**: `Fn()` with named params and return types
- **Structs** (memory-backed): linear memory allocation with pass-by-value and pass-by-reference (`Point.ref`)
- **Inline WAT**: `asm()` / `asmExpr()` for raw WebAssembly
- **Raw memory access**: `store8()`, `load8_u()`, `load8_s()` for byte-level memory I/O
- **Compilation**: `compileWAT()` produces a complete WAT module

## Documentation

- [API Reference](https://github.com/clinuxrulz/rm-wasm/blob/main/docs/api.md)
- [Structs & Memory](https://github.com/clinuxrulz/rm-wasm/blob/main/docs/structs.md)
- [WAT Output](https://github.com/clinuxrulz/rm-wasm/blob/main/docs/wat-output.md)

## Demos

- [Mandelbrot Set](https://github.com/clinuxrulz/rm-wasm/blob/main/demos/mandelbrot/) — renders the Mandelbrot fractal fully compiled to WebAssembly

## Scripts

```bash
pnpm test            # run tests
pnpm test:watch      # watch mode
pnpm typecheck       # TypeScript type checking
pnpm --filter @rm-wasm/demo-mandelbrot dev   # run the mandelbrot demo
```
