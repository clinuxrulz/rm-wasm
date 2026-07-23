# API Reference

## Types

### WasmType

```typescript
type WasmType = "i32" | "i64" | "f32" | "f64" | "void";
```

### Node<A>

A compiled node in the expression DAG. Extends `BaseNode` with arithmetic methods for the given type `A`.

### I32Like, I64Like, F32Like, F64Like

Union types accepting either a number literal or a `Node` of the corresponding type.

---

## Literal constructors

```typescript
i32(v: number): Node<"i32">
i64(v: number | bigint): Node<"i64">
f32(v: number): Node<"f32">
f64(v: number): Node<"f64">
```

Accept a plain number (or bigint for i64) and return a constant node. Also accept a `Node` to construct via cast.

---

## Arithmetic & comparison ops

Every node has methods matching WASM opcodes:

| Type    | Ops |
|---------|-----|
| `i32`   | `add`, `sub`, `mul`, `div_s`, `div_u`, `rem_s`, `rem_u`, `and`, `or`, `xor`, `shl`, `shr_s`, `shr_u`, `rotl`, `rotr`, `eq`, `ne`, `lt_s`, `lt_u`, `gt_s`, `gt_u`, `le_s`, `le_u`, `ge_s`, `ge_u`, `neg`, `not`, `clz`, `ctz`, `popcnt` |
| `i64`   | Same as i32 (comparisons return `i32`) |
| `f32`   | `add`, `sub`, `mul`, `div`, `min`, `max`, `copysign`, `eq`, `ne`, `lt`, `gt`, `le`, `ge`, `neg`, `abs`, `ceil`, `floor`, `trunc`, `nearest`, `sqrt` |
| `f64`   | Same as f32 |

Comparison aliases (no suffix = signed): `lt`, `gt`, `le`, `ge`.

---

## Variables

```typescript
node.toVar(): Node               // allocate a new local, assign value, return local node
node.assign(val: Node | number | bigint): void  // assign a new value to a variable
```

---

## Functions

### Fn(name, opts, bodyFn)

```typescript
Fn<R extends Node>(
  name: string,
  opts: { params?: any[]; result?: any },
  bodyFn: (...args: any[]) => R | void,
): (...args: any[]) => R
```

- `params`: array of param descriptors (`{ name, type }`), struct references (`Point.ref`), or struct params (`Point.asParam("p")`)
- `result`: a type string (`"i32"`, etc.) or a struct constructor for struct returns
- Returns a callable that can be invoked to produce a `call` node

### ParamDef

```typescript
interface ParamDef {
  name: string;
  type: string;
  isRef?: boolean;
  structLayout?: StructLayout;
}
```

---

## Control flow

```typescript
// Expression form (returns a value):
If<R extends Node>(cond: I32Like, thenFn: () => R, elseFn?: () => R): R

// Statement form with ElseIf chaining:
If(cond: I32Like, body: () => void): ElseIfChain

Loop(body: () => void): void
While(cond: I32Like, body: () => void): void
Break(): void
Continue(): void
Return(val?: any): void
```

---

## Structs

```typescript
struct(name: string, fieldDefs: Record<string, any>): StructCtor
```

See [Structs & Memory](structs.md) for full documentation.

---

## Raw memory access

```typescript
store8(addr: Node<"i32">, value: Node<"i32">): void
load8_u(addr: Node<"i32">): Node<"i32">
load8_s(addr: Node<"i32">): Node<"i32">
```

Byte-level memory access into the WASM linear memory. Emit `i32.store8`, `i32.load8_u`, and `i32.load8_s` respectively.

Requires memory to be present — use `compileWAT({ memoryPages: 1 })` or ensure structs are used.

**Example:**
```typescript
store8(ptr, i32(255));                // write byte
let v = load8_u(ptr);                 // read unsigned byte
let vs = load8_s(ptr);                // read signed byte
```

---

## Inline WAT

```typescript
asm(wat: string, ...interpolations: Node[]): void
asmExpr(wat: string, ...interpolations: Node[]): Node
```

Interpolate nodes into raw WAT with `$0`, `$1`, etc.

**Example:**
```typescript
asm("(i32.store (local.get $0) (i32.const 42))", ptr);
```

---

## Compilation

```typescript
compileWAT(): string
compileWAT(opts: { exports?: string[]; memoryPages?: number }): string
```

Produces a complete WAT module string.

- `exports`: function names to export
- `memoryPages`: number of WASM memory pages (default: 1). Only emitted when structs are used.

---

## Registry

```typescript
clearRegistry(): void
```

Clears the function registry and resets internal counters. Call before each compilation unit.

---

## Low-level

```typescript
node(config): BaseNode        // create a raw node
nodeVar(name, type): BaseNode  // create a variable reference node
wrapValue(v): BaseNode         // coerce a literal or node to a node
isNode(v): v is BaseNode       // type guard
buildBlock(fn: () => void): BaseNode  // capture a scope block
```
