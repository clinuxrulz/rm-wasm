# WAT Output

The `compileWAT()` function produces a complete WAT (WebAssembly Text Format) module. This document explains the output structure.

## Module structure

```wat
(module
  (memory 1)                                 ; optional, only when structs are used
  (global $__stack_ptr (mut i32) (i32.const 65528))  ; optional

  (func $add (param $a i32) (param $b i32) (result i32)
    (i32.add (local.get $a) (local.get $b))
  )

  (func $main (result i32)
    (call $add (i32.const 40) (i32.const 2))
  )

  (export "main" (func $main))
)
```

## Memory

When any struct is used in the program, the module includes:

- `(memory N)` — linear memory, default 1 page (64KB).
  Customize via `compileWAT({ memoryPages: N })`.
- `(global $__stack_ptr (mut i32) (i32.const ...))` — stack pointer initialized to the end of memory minus 8 bytes.

## Functions

Each `Fn()` produces a `(func ...)` block:

```
(func $name (param $p1 type) (param $p2 type) ... (result type)
  (local $v0 type)
  ...
  (local.set $_stack_save (global.get $__stack_ptr))  ; if structs used
  (global.set $__stack_ptr (i32.add ...))              ; allocate stack frame
  ... body instructions ...
  (global.set $__stack_ptr (local.get $_stack_save))  ; restore stack
)
```

## Ops mapping

| DSL method     | WAT output                          |
|----------------|-------------------------------------|
| `a.add(b)`     | `(TYPE.add a b)`                    |
| `a.sub(b)`     | `(TYPE.sub a b)`                    |
| `a.eq(b)`      | `(TYPE.eq a b)`                     |
| `a.gt(b)`      | `(TYPE.gt_s a b)`                   |
| `i32(v)`       | `(i32.const v)`                     |
| `f64(v)`       | `(f64.const v)`                     |
| `x.toVar()`    | `(local.set $v (value))`            |
| `x.assign(v)`  | `(local.set $v (value))`            |
| `p.x` (struct) | `(TYPE.load offset=N (local.get $addr))` |
| `p.x = v`      | `(TYPE.store offset=N addr val)`    |
| `store8(a, v)` | `(i32.store8 a v)`                 |
| `load8_u(a)`   | `(i32.load8_u a)`                  |
| `load8_s(a)`   | `(i32.load8_s a)`                  |

## Control flow

```
If(cond, then, else)     -> (if (cond) (then ...) (else ...))
Loop(body)               -> (block $exit (loop $loop ... (br $loop)))
While(cond, body)        -> (block $exit (loop $cont (br_if $exit (i32.eqz cond)) ... (br $cont)))
Break()                  -> (br $exit_label)
Continue()               -> (br $continue_label)
```

## Inline asm

`asm("(i32.const $0)", val)` interpolates node expressions into raw WAT text using `$0`, `$1`, etc. as placeholders.
