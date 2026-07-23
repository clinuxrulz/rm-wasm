# Structs & Memory

Structs in rm-wasm use **linear memory** with a stack pointer. Each struct variable is backed by an `i32` pointer into a WASM memory region allocated from `__stack_ptr`.

## Defining a struct

```typescript
const Point = struct("Point", { x: f64, y: f64 });
const Line = struct("Line", { start: Point, end: Point });
```

Field types can be primitives (`i32`, `i64`, `f32`, `f64`) or nested structs.

## Allocation and field access

```typescript
let p = Point(f64(1.0), f64(2.0)).toVar();
// p.x -> f64.load offset=0
// p.y -> f64.load offset=8

let sum = p.x.add(p.y);
```

`.toVar()` allocates from the stack pointer and stores each field into linear memory. The struct proxy intercepts field reads as `load` nodes and field writes as `store` nodes.

## Memory layout (C ABI)

Layout follows C ABI alignment rules:

| Type | Size | Alignment |
|------|------|-----------|
| i32  | 4    | 4         |
| i64  | 8    | 8         |
| f32  | 4    | 4         |
| f64  | 8    | 8         |

For the struct `Point { x: f64, y: f64 }`:
- `x` at offset 0, size 8
- `y` at offset 8, size 8
- Total: 16 bytes

For `Line { start: Point, end: Point }`:
- `start` at offset 0, size 16
- `end` at offset 16, size 16
- Total: 32 bytes

## The `.addr` property

Returns the `i32` pointer address of the struct variable (equivalent to `&` in C):

```typescript
let p = Point(f64(1), f64(2)).toVar();
let addr: Node<"i32"> = p.addr;
```

## Field mutation

```typescript
p.y = f64(5.0);
// -> (f64.store offset=8 (local.get $_s0) (f64.const 5))
```

## Struct assignment

```typescript
p.assign(Point(f64(3), f64(4)));
// Copies field-by-field through memory stores
```

## Pass-by-value vs pass-by-reference

### By-value (default)

Struct params are expanded to individual scalar params at the call site. The function receives each field as a separate local.

```typescript
Fn("foo", { params: [Point.asParam("p")], result: "f64" }, (p) => {
  return p.x;
});
// Compiles to: (func $foo (param $p_x f64) (param $p_y f64) (result f64)
```

### By-reference (`Point.ref`)

The function receives an `i32` pointer. Field access uses `load`/`store` with byte offsets.

```typescript
Fn("foo", { params: [Point.ref], result: "f64" }, (p) => {
  return p.x;
});
// Compiles to: (func $foo (param $p i32) (result f64)
//   (f64.load offset=0 (local.get $p))
```

## Stack frame

When structs are used, the module includes:

```wat
(memory 1)
(global $__stack_ptr (mut i32) (i32.const 65528))
```

Each function saves and restores the stack pointer:

```wat
(local.set $_stack_save (global.get $__stack_ptr))
(global.set $__stack_ptr (i32.add (global.get $__stack_ptr) (i32.const N)))
; ... function body ...
(global.set $__stack_ptr (local.get $_stack_save))
```
