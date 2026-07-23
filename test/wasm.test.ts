import { describe, it, expect, beforeEach } from "vitest";
import {
  i32, i64, f32, f64,
  Fn, clearRegistry,
  If, Loop, While, Break, Continue, Return,
  struct, asm, asmExpr,
  store8, load8_u, load8_s,
  compileWAT,
  buildBlock,
  node,
  Node,
} from "../src/wasm";

beforeEach(() => {
  clearRegistry();
});

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

describe("Literals", () => {
  it("i32 literal", () => {
    const f = Fn("f", { result: "i32" }, () => i32(42));
    let wat = compileWAT({ exports: ["f"] });
    expect(wat).toContain("(i32.const 42)");
  });

  it("i64 literal", () => {
    const f = Fn("f", { result: "i64" }, () => i64(42n));
    let wat = compileWAT();
    expect(wat).toContain("(i64.const 42)");
  });

  it("f64 literal", () => {
    const f = Fn("f", { result: "f64" }, () => f64(3.14));
    let wat = compileWAT();
    expect(wat).toContain("(f64.const 3.14)");
  });

  it("f32 literal", () => {
    const f = Fn("f", { result: "f32" }, () => f32(1.5));
    let wat = compileWAT();
    expect(wat).toContain("(f32.const 1.5)");
  });
});

describe("Binary ops", () => {
  it("i32 add", () => {
    const f = Fn("f", { params: [{ name: "a", type: "i32" }, { name: "b", type: "i32" }], result: "i32" }, (a, b) => {
      return a.add(b);
    });
    let wat = compileWAT({ exports: ["f"] });
    expect(wat).toContain('(i32.add (local.get $a) (local.get $b))');
  });

  it("i32 mul", () => {
    const f = Fn("f", { params: [{ name: "a", type: "i32" }, { name: "b", type: "i32" }], result: "i32" }, (a, b) => {
      return a.mul(b);
    });
    let wat = compileWAT();
    expect(wat).toContain('(i32.mul (local.get $a) (local.get $b))');
  });

  it("f64 add", () => {
    const f = Fn("f", { params: [{ name: "a", type: "f64" }, { name: "b", type: "f64" }], result: "f64" }, (a, b) => {
      return a.add(b);
    });
    let wat = compileWAT();
    expect(wat).toContain('(f64.add (local.get $a) (local.get $b))');
  });
});

describe("Variables", () => {
  it("toVar creates a local and assigns", () => {
    const f = Fn("f", { result: "i32" }, () => {
      let x = i32(42).toVar();
      return x;
    });
    let wat = compileWAT();
    expect(wat).toContain("(local $_v0 i32)");
    expect(wat).toContain("(local.set $_v0 (i32.const 42))");
    expect(wat).toContain("(local.get $_v0)");
  });

  it("assign updates a variable", () => {
    const f = Fn("f", { result: "i32" }, () => {
      let x = i32(1).toVar();
      x.assign(i32(99));
      return x;
    });
    let wat = compileWAT();
    expect(wat).toContain("(local.set $_v0 (i32.const 99))");
  });
});

describe("Functions", () => {
  it("function with params and return", () => {
    const add = Fn("add", { params: [{ name: "a", type: "i32" }, { name: "b", type: "i32" }], result: "i32" }, (a, b) => {
      return a.add(b);
    });
    const main = Fn("main", { result: "i32" }, () => {
      return add(i32(40), i32(2));
    });
    let wat = compileWAT({ exports: ["main"] });
    expect(wat).toContain("(func $add");
    expect(wat).toContain("(param $a i32)");
    expect(wat).toContain("(param $b i32)");
    expect(wat).toContain("(result i32)");
    expect(wat).toContain("(call $add (i32.const 40) (i32.const 2))");
  });
});

describe("Control flow", () => {
  it("If/Else statement", () => {
    const f = Fn("f", { params: [{ name: "cond", type: "i32" }], result: "i32" }, (cond) => {
      let x = i32(0).toVar();
      If(cond, () => {
        x.assign(i32(10));
      }).Else(() => {
        x.assign(i32(20));
      });
      return x;
    });
    let wat = compileWAT();
    expect(wat).toContain("(if");
    expect(wat).toContain("(then");
    expect(wat).toContain("(else");
  });

  it("Loop with Break", () => {
    const f = Fn("f", { result: "i32" }, () => {
      let x = i32(0).toVar();
      Loop(() => {
        x.assign(x.add(i32(1)));
        If(x.gt(i32(5)), () => { Break(); });
      });
      return x;
    });
    let wat = compileWAT();
    expect(wat).toContain("(loop");
    expect(wat).toContain("(br $loop_exit");
    expect(wat).toContain("(br $loop_");
  });

  it("While loop", () => {
    const f = Fn("f", { result: "i32" }, () => {
      let i = i32(0).toVar();
      While(i.lt(i32(10)), () => {
        i.assign(i.add(i32(1)));
      });
      return i;
    });
    let wat = compileWAT();
    expect(wat).toContain("(block $while_exit");
    expect(wat).toContain("(loop $while_cont");
    expect(wat).toContain("(br_if $while_exit");
  });
});

describe("Structs", () => {
  it("basic struct field access (memory-backed)", () => {
    const Point = struct("Point", { x: f64, y: f64 });
    const f = Fn("f", { result: "f64" }, () => {
      let p = Point(f64(1.0), f64(2.0)).toVar();
      return p.x.add(p.y);
    });
    let wat = compileWAT();
    // Module has memory and stack pointer
    expect(wat).toContain('(memory (export "memory") 1)');
    expect(wat).toContain("(global $__stack_ptr");
    // Allocation: i32 local for pointer
    expect(wat).toContain("(local $_s0 i32)");
    expect(wat).toContain("(local.set $_s0 (global.get $__stack_ptr))");
    // Field stores via memory
    expect(wat).toContain("(f64.store offset=0 (local.get $_s0) (f64.const 1)");
    expect(wat).toContain("(f64.store offset=8 (local.get $_s0) (f64.const 2)");
    // Field loads via memory
    expect(wat).toContain("(f64.load offset=0 (local.get $_s0)");
    expect(wat).toContain("(f64.load offset=8 (local.get $_s0)");
  });

  it("struct field mutation (memory-backed)", () => {
    const Point = struct("Point", { x: f64, y: f64 });
    const f = Fn("f", { result: "f64" }, () => {
      let p = Point(f64(1.0), f64(2.0)).toVar();
      p.y = f64(5.0);
      return p.y;
    });
    let wat = compileWAT();
    expect(wat).toContain('(memory (export "memory") 1)');
    // Store y at offset 8
    expect(wat).toContain("(f64.store offset=8 (local.get $_s0) (f64.const 5)");
    // Load y at offset 8
    expect(wat).toContain("(f64.load offset=8 (local.get $_s0)");
  });

  it("nested struct (memory-backed)", () => {
    const Point = struct("Point", { x: f64, y: f64 });
    const Line = struct("Line", { start: Point, end: Point });
    const f = Fn("f", { result: "f64" }, () => {
      let line = Line(Point(f64(0), f64(1)), Point(f64(2), f64(3))).toVar();
      return line.start.x.add(line.end.y);
    });
    let wat = compileWAT();
    expect(wat).toContain('(memory (export "memory") 1)');
    // Point: x=offset 0, y=offset 8 (size 16)
    // Line: start=offset 0, end=offset 16 (size 32)
    expect(wat).toContain("(f64.store offset=0 (local.get $_s0) (f64.const 0)");
    expect(wat).toContain("(f64.store offset=8 (local.get $_s0) (f64.const 1)");
    expect(wat).toContain("(f64.store offset=16 (local.get $_s0) (f64.const 2)");
    expect(wat).toContain("(f64.store offset=24 (local.get $_s0) (f64.const 3)");
    expect(wat).toContain("(f64.load offset=0 (local.get $_s0)");
    expect(wat).toContain("(f64.load offset=24 (local.get $_s0)");
  });

  it("struct assignment (copy) (memory-backed)", () => {
    const Point = struct("Point", { x: f64, y: f64 });
    const f = Fn("f", { result: "f64" }, () => {
      let p = Point(f64(1), f64(2)).toVar();
      p.assign(Point(f64(3), f64(4)));
      return p.x;
    });
    let wat = compileWAT();
    // First point creation: stores at offset 0 and 8
    expect(wat).toContain("(f64.store offset=0 (local.get $_s0) (f64.const 1)");
    expect(wat).toContain("(f64.store offset=8 (local.get $_s0) (f64.const 2)");
    // After assign: stores at offset 0 and 8
    expect(wat).toContain("(f64.store offset=0 (local.get $_s0) (f64.const 3)");
    expect(wat).toContain("(f64.store offset=8 (local.get $_s0) (f64.const 4)");
    // Return loads from offset 0
    expect(wat).toContain("(f64.load offset=0 (local.get $_s0)");
  });

  it("struct .addr returns pointer", () => {
    const Point = struct("Point", { x: f64, y: f64 });
    const f = Fn("f", { result: "i32" }, () => {
      let p = Point(f64(1), f64(2)).toVar();
      return p.addr;
    });
    let wat = compileWAT();
    expect(wat).toContain("(local.get $_s0)");
  });
});

describe("Inline asm", () => {
  it("asm() injects raw WAT", () => {
    const f = Fn("f", { result: "i32" }, () => {
      asm("(i32.const 42)");
      return i32(0);
    });
    let wat = compileWAT();
    expect(wat).toContain("(i32.const 42)");
  });

  it("asmExpr creates an expression", () => {
    const f = Fn("f", { result: "i32" }, () => {
      return asmExpr("(i32.const 99)");
    });
    let wat = compileWAT();
    expect(wat).toContain("(i32.const 99)");
  });
});

describe("Module output", () => {
  it("generates valid WAT module structure", () => {
    const f = Fn("main", { result: "i32" }, () => i32(7));
    let wat = compileWAT({ exports: ["main"] });
    expect(wat.startsWith("(module")).toBe(true);
    expect(wat.endsWith(")")).toBe(true);
    expect(wat).toContain('(export "main"');
  });

  it("multiple functions in one module", () => {
    const add = Fn("add", { params: [{ name: "a", type: "i32" }, { name: "b", type: "i32" }], result: "i32" }, (a, b) => a.add(b));
    const main = Fn("main", { result: "i32" }, () => add(i32(1), i32(2)));
    let wat = compileWAT({ exports: ["main"] });
    expect(wat).toContain("(func $add");
    expect(wat).toContain("(func $main");
  });
});

describe("Raw memory access", () => {
  it("store8 and load8_u", () => {
    const f = Fn("f", { params: [{ name: "p", type: "i32" }], result: "i32" }, (p) => {
      store8(p, i32(42));
      store8(p.add(i32(1)), i32(99));
      return load8_u(p);
    });
    let wat = compileWAT({ memoryPages: 1 });
    expect(wat).toContain("(i32.store8 (local.get $p) (i32.const 42))");
    expect(wat).toContain('(i32.store8 (i32.add (local.get $p) (i32.const 1)) (i32.const 99))');
    expect(wat).toContain("(i32.load8_u (local.get $p))");
  });

  it("load8_s", () => {
    const f = Fn("f", { params: [{ name: "p", type: "i32" }], result: "i32" }, (p) => {
      return load8_s(p);
    });
    let wat = compileWAT({ memoryPages: 1 });
    expect(wat).toContain("(i32.load8_s (local.get $p))");
  });
});
