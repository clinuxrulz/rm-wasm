// == RM-WASM: A C-like TypeScript DSL that compiles to WAT ==
// Architecture follows the same node-graph DAG pattern as RMSL.

const __brand = Symbol();

// === Types ===

export type WasmType = "i32" | "i64" | "f32" | "f64" | "void";

const WASM_TYPES: Record<string, string> = {
  i32: "i32", i64: "i64", f32: "f32", f64: "f64", void: "void",
};

const TYPE_SIZES: Record<string, number> = { i32: 4, i64: 8, f32: 4, f64: 8 };
const TYPE_ALIGN: Record<string, number> = { i32: 4, i64: 8, f32: 4, f64: 8 };

export interface BaseNode<A extends string = string> {
  [__brand]: A;
  _t: string;
  type: string;
  params?: BaseNode[];
  value?: unknown;
}

// === Like types ===
export type I32Like = number | BaseNode<"i32">;
export type I64Like = number | bigint | BaseNode<"i64">;
export type F32Like = number | BaseNode<"f32">;
export type F64Like = number | BaseNode<"f64">;

// === Per-type arithmetic ops ===
interface IntOps {
  add(other: I32Like): Node<"i32">; sub(other: I32Like): Node<"i32">;
  mul(other: I32Like): Node<"i32">; div_s(other: I32Like): Node<"i32">;
  div_u(other: I32Like): Node<"i32">; rem_s(other: I32Like): Node<"i32">;
  rem_u(other: I32Like): Node<"i32">; and(other: I32Like): Node<"i32">;
  or(other: I32Like): Node<"i32">; xor(other: I32Like): Node<"i32">;
  shl(other: I32Like): Node<"i32">; shr_s(other: I32Like): Node<"i32">;
  shr_u(other: I32Like): Node<"i32">; rotl(other: I32Like): Node<"i32">;
  rotr(other: I32Like): Node<"i32">;
  eq(other: I32Like): Node<"i32">; ne(other: I32Like): Node<"i32">;
  lt_s(other: I32Like): Node<"i32">; lt_u(other: I32Like): Node<"i32">;
  gt_s(other: I32Like): Node<"i32">; gt_u(other: I32Like): Node<"i32">;
  le_s(other: I32Like): Node<"i32">; le_u(other: I32Like): Node<"i32">;
  ge_s(other: I32Like): Node<"i32">; ge_u(other: I32Like): Node<"i32">;
  lt(other: I32Like): Node<"i32">; gt(other: I32Like): Node<"i32">;
  le(other: I32Like): Node<"i32">; ge(other: I32Like): Node<"i32">;
  neg(): Node<"i32">; not(): Node<"i32">; clz(): Node<"i32">;
  ctz(): Node<"i32">; popcnt(): Node<"i32">;
}
interface Int64Ops {
  add(other: I64Like): Node<"i64">; sub(other: I64Like): Node<"i64">;
  mul(other: I64Like): Node<"i64">; div_s(other: I64Like): Node<"i64">;
  div_u(other: I64Like): Node<"i64">; rem_s(other: I64Like): Node<"i64">;
  rem_u(other: I64Like): Node<"i64">; and(other: I64Like): Node<"i64">;
  or(other: I64Like): Node<"i64">; xor(other: I64Like): Node<"i64">;
  shl(other: I64Like): Node<"i64">; shr_s(other: I64Like): Node<"i64">;
  shr_u(other: I64Like): Node<"i64">; rotl(other: I64Like): Node<"i64">;
  rotr(other: I64Like): Node<"i64">;
  eq(other: I64Like): Node<"i32">; ne(other: I64Like): Node<"i32">;
  lt_s(other: I64Like): Node<"i32">; lt_u(other: I64Like): Node<"i32">;
  gt_s(other: I64Like): Node<"i32">; gt_u(other: I64Like): Node<"i32">;
  le_s(other: I64Like): Node<"i32">; le_u(other: I64Like): Node<"i32">;
  ge_s(other: I64Like): Node<"i32">; ge_u(other: I64Like): Node<"i32">;
  lt(other: I64Like): Node<"i32">; gt(other: I64Like): Node<"i32">;
  le(other: I64Like): Node<"i32">; ge(other: I64Like): Node<"i32">;
  neg(): Node<"i64">; not(): Node<"i64">; clz(): Node<"i64">;
  ctz(): Node<"i64">; popcnt(): Node<"i64">;
}
interface FloatOps {
  add(other: F64Like): Node<"f64">; sub(other: F64Like): Node<"f64">;
  mul(other: F64Like): Node<"f64">; div(other: F64Like): Node<"f64">;
  min(other: F64Like): Node<"f64">; max(other: F64Like): Node<"f64">;
  copysign(other: F64Like): Node<"f64">;
  eq(other: F64Like): Node<"i32">; ne(other: F64Like): Node<"i32">;
  lt(other: F64Like): Node<"i32">; gt(other: F64Like): Node<"i32">;
  le(other: F64Like): Node<"i32">; ge(other: F64Like): Node<"i32">;
  neg(): Node<"f64">; abs(): Node<"f64">; ceil(): Node<"f64">;
  floor(): Node<"f64">; trunc(): Node<"f64">; nearest(): Node<"f64">;
  sqrt(): Node<"f64">;
}
interface F32Ops {
  add(other: F32Like): Node<"f32">; sub(other: F32Like): Node<"f32">;
  mul(other: F32Like): Node<"f32">; div(other: F32Like): Node<"f32">;
  min(other: F32Like): Node<"f32">; max(other: F32Like): Node<"f32">;
  copysign(other: F32Like): Node<"f32">;
  eq(other: F32Like): Node<"i32">; ne(other: F32Like): Node<"i32">;
  lt(other: F32Like): Node<"i32">; gt(other: F32Like): Node<"i32">;
  le(other: F32Like): Node<"i32">; ge(other: F32Like): Node<"i32">;
  neg(): Node<"f32">; abs(): Node<"f32">; ceil(): Node<"f32">;
  floor(): Node<"f32">; trunc(): Node<"f32">; nearest(): Node<"f32">;
  sqrt(): Node<"f32">;
}

interface NodeMethods<A extends string = string> {
  toVar(): Node<A>;
  assign(val: Node<A> | number | bigint): void;
}

interface NodeOps {
  i32: IntOps; i64: Int64Ops; f32: F32Ops; f64: FloatOps; void: {};
}

const CMP_ALIAS: Record<string, string> = {
  lt: "lt_s", gt: "gt_s", le: "le_s", ge: "ge_s",
};

export type Node<A extends string = string> = BaseNode<A> & NodeMethods<A> & (A extends keyof NodeOps ? NodeOps[A] : {});

export function isNode(v: unknown): v is BaseNode {
  return typeof v === "object" && v !== null && __brand in v;
}

// === NodeImpl ===
export class NodeImpl {
  [__brand]: string;
  _t: string; type: string; params?: BaseNode[]; value?: unknown;
  constructor(config: { _t?: string; type: string; params?: BaseNode[]; value?: unknown }) {
    this[__brand] = config._t ?? config.type;
    this._t = config._t ?? config.type;
    this.type = config.type;
    this.params = config.params;
    this.value = config.value;
  }
  toVar(): Node {
    let name = `_v${nextVarId++}`;
    let v = nodeVar(name, this._t);
    assertBlockScope("toVar", (scope) => {
      scope.push(node({ _t: "void", type: "let", params: [v, this as BaseNode] }));
    });
    return v as Node;
  }
  assign(val: any): void {
    let rhs = wrapValue(val) as BaseNode;
    assertBlockScope("assign", (scope) => {
      scope.push(node({ _t: "void", type: "assign", params: [this as BaseNode, rhs] }));
    });
  }
  wrap_i64(): Node<"i64"> {
    return node({ _t: "i64", type: "wrap_i64", params: [this as BaseNode] }) as Node<"i64">;
  }
}

// Initialize shared prototype with type-checking ops
function initOps() {
  const proto = NodeImpl.prototype as any;

  const allBinary = ["add","sub","mul","div_s","div_u","div","rem_s","rem_u",
    "and","or","xor","shl","shr_s","shr_u","rotl","rotr","min","max","copysign"];
  const allCmp = ["eq","ne","lt","gt","le","ge","lt_s","lt_u","gt_s","gt_u","le_s","le_u","ge_s","ge_u"];
  const allUnary = ["neg","not","clz","ctz","popcnt","abs","ceil","floor","trunc","nearest","sqrt"];

  for (let op of [...allBinary, ...allCmp]) {
    proto[op] = function(other: any) {
      let t = (this as BaseNode)._t;
      let isCmp = allCmp.includes(op);
      return node({ _t: isCmp ? "i32" : t, type: op, params: [this as BaseNode, wrapValue(other) as BaseNode] });
    };
  }
  for (let op of allUnary) {
    proto[op] = function() {
      return node({ _t: (this as BaseNode)._t, type: op, params: [this as BaseNode] });
    };
  }
  // Type-aware comparison aliases (lt→lt_s for int, lt for float)
  for (let [alias, target] of Object.entries(CMP_ALIAS)) {
    proto[alias] = function(other: any) {
      let t = (this as BaseNode)._t;
      let isFloat = t === "f32" || t === "f64";
      return node({ _t: "i32", type: isFloat ? alias : target, params: [this as BaseNode, wrapValue(other) as BaseNode] });
    };
  }
}
initOps();

export const Node = NodeImpl as unknown as new (config: {
  _t?: string; type: string; params?: BaseNode[]; value?: unknown;
}) => Node;

// === Helpers ===
let nextVarId = 0;

export function node(config: { _t?: string; type: string; params?: BaseNode[]; value?: unknown }): BaseNode {
  return new NodeImpl(config) as BaseNode;
}
export function nodeVar(name: string, type: string): BaseNode {
  return node({ _t: type, type: "var", value: { varName: name, varType: type } });
}
export function wrapValue(v: any): BaseNode {
  if (isNode(v)) return v;
  if (typeof v === "number") return node({ _t: "f64", type: "f64", value: v }) as BaseNode;
  if (typeof v === "bigint") return node({ _t: "i64", type: "i64", value: v }) as BaseNode;
  if (typeof v === "boolean") return node({ _t: "i32", type: "i32", value: v ? 1 : 0 }) as BaseNode;
  throw new Error(`[rm-wasm] Cannot wrap value: ${v}`);
}

// === Literal constructors ===
export function i32(v: number): Node<"i32"> {
  if (isNode(v)) return node({ _t: "i32", type: "construct", params: [v] }) as Node<"i32">;
  return node({ _t: "i32", type: "i32", value: Math.floor(v) }) as Node<"i32">;
}
(i32 as any).type = "i32";
export function i64(v: number | bigint): Node<"i64"> {
  if (isNode(v)) return node({ _t: "i64", type: "construct", params: [v] }) as Node<"i64">;
  return node({ _t: "i64", type: "i64", value: BigInt(v) }) as Node<"i64">;
}
(i64 as any).type = "i64";
export function f32(v: number): Node<"f32"> {
  if (isNode(v)) return node({ _t: "f32", type: "construct", params: [v] }) as Node<"f32">;
  return node({ _t: "f32", type: "f32", value: Math.fround(v) }) as Node<"f32">;
}
(f32 as any).type = "f32";
export function f64(v: number): Node<"f64"> {
  if (isNode(v)) return node({ _t: "f64", type: "construct", params: [v] }) as Node<"f64">;
  return node({ _t: "f64", type: "f64", value: v }) as Node<"f64">;
}
(f64 as any).type = "f64";

// === Scope management ===
let blockScope: BaseNode[] | null = null;

function assertBlockScope(context: string, fn: (scope: BaseNode[]) => void): void {
  if (!blockScope) throw new Error(`[rm-wasm] ${context} used outside of a function body`);
  fn(blockScope);
}

export function buildBlock(fn: () => void): BaseNode {
  let oldScope = blockScope;
  let scope: BaseNode[] = [];
  blockScope = scope;
  try { fn(); return node({ _t: "void", type: "seq", params: [...scope] }); }
  finally { blockScope = oldScope; }
}

// === Return, Break, Continue ===
export function Return(val?: any): void {
  if (val !== undefined) {
    let wrapped = wrapValue(val) as BaseNode;
    assertBlockScope("Return", (scope) => { scope.push(node({ _t: "void", type: "return", params: [wrapped] })); });
  } else {
    assertBlockScope("Return", (scope) => { scope.push(node({ _t: "void", type: "return" })); });
  }
}
export function Break(): void {
  assertBlockScope("Break", (scope) => { scope.push(node({ _t: "void", type: "break" })); });
}
export function Continue(): void {
  assertBlockScope("Continue", (scope) => { scope.push(node({ _t: "void", type: "continue" })); });
}

// === Fn — function definition ===

export interface ParamDef {
  name: string;
  type: string;
  isRef?: boolean;
  structLayout?: StructLayout;
}

interface FuncDef {
  name: string;
  paramDefs: ParamDef[];
  result: string;
  resultLayout?: StructLayout;
  bodyFn: (...args: any[]) => any;
}

let funcRegistry: FuncDef[] = [];

export function clearRegistry(): void {
  funcRegistry = [];
  nextVarId = 0;
  needsMemory = false;
}

/** Resolve a param type value (string, struct ctor, ref, etc.) to a ParamDef. */
function resolveParam(p: any): ParamDef {
  if (typeof p === "object" && p !== null) {
    if (p.ref) return { name: p.name, type: "i32", isRef: true, structLayout: p.layout };
    if (p.layout) return { name: p.name, type: `struct:${p.layout.name}`, structLayout: p.layout };
  }
  return p;
}

/** Resolve a result type to string + optional layout. */
function resolveResult(r: any): { result: string; resultLayout?: StructLayout } {
  if (typeof r === "object" && r !== null && r.layout) {
    return { result: `struct:${r.layout.name}`, resultLayout: r.layout };
  }
  return { result: r ?? "void" };
}

export function Fn<R extends Node>(
  name: string,
  opts: { params?: any[]; result?: any },
  bodyFn: (...args: any[]) => R | void,
): (...args: any[]) => R {
  let resolvedParams = (opts.params ?? []).map(resolveParam);
  let { result, resultLayout } = resolveResult(opts.result);
  const def: FuncDef = {
    name,
    paramDefs: resolvedParams,
    result,
    resultLayout,
    bodyFn,
  };
  funcRegistry.push(def);

  // Build callable that expands struct args for pass-by-value
  const callable = (...args: any[]): R => {
    let expanded: BaseNode[] = [];
    for (let i = 0; i < args.length; i++) {
      let arg = args[i];
      let pd = resolvedParams[i];
      if (pd?.structLayout && !pd.isRef) {
        // By-value struct: expand fields from the struct arg
        let expandedFields = expandStructArg(arg, pd.structLayout, false);
        expanded.push(...expandedFields);
      } else {
        expanded.push(wrapValue(arg) as BaseNode);
      }
    }
    return node({ _t: def.result, type: "call", params: expanded, value: def.name }) as R;
  };
  return callable;
}

/** Walk a struct_value or struct_var and emit load/field nodes for each flat field. */
function expandStructArg(arg: any, layout: StructLayout, fromRef: boolean): BaseNode[] {
  let argNode = wrapValue(arg) as BaseNode;
  let fields: BaseNode[] = [];
  for (let fname of layout.fieldOrder) {
    let field = layout.fields[fname];
    if (field.isStruct && field.nestedLayout) {
      let nested = node({
        _t: `struct:${field.nestedLayout.name}`,
        type: "struct_field",
        params: [argNode],
        value: { layout, path: [fname] },
      });
      fields.push(...expandStructArg(nested, field.nestedLayout, fromRef));
    } else {
      // Create a struct_field node — compiler resolves to load or local.get
      let fn = node({
        _t: field.type,
        type: "struct_field",
        params: [argNode],
        value: { layout, path: [fname] },
      });
      fields.push(fn);
    }
  }
  return fields;
}

// === Control flow ===
type ElseIfChain = { ElseIf: (cond: I32Like, body: () => void) => ElseIfChain; Else: (body: () => void) => void; };

export function If(cond: I32Like, body: () => void): ElseIfChain;
export function If<R extends Node>(cond: I32Like, thenFn: () => R, elseFn?: () => R): R;
export function If(cond: any, bodyOrThen: any, elseFn?: any): any {
  let condNode = wrapValue(cond) as BaseNode;
  if (elseFn !== undefined) {
    let thenSeq = buildBlock(bodyOrThen), elseSeq = buildBlock(elseFn);
    let thenExpr = thenSeq.params?.[thenSeq.params.length - 1];
    return node({ _t: thenExpr?._t ?? "void", type: "if_expr", params: [condNode, thenSeq, elseSeq] }) as Node;
  }
  let ifNode = node({ _t: "void", type: "if", params: [condNode, buildBlock(bodyOrThen)] });
  assertBlockScope("If", (scope) => { scope.push(ifNode); });
  let deepestIf = ifNode;
  let elseIfChain: ElseIfChain = {
    ElseIf: (nextCond: any, nextBody: any) => {
      let n = node({ _t: "void", type: "if", params: [wrapValue(nextCond) as BaseNode, buildBlock(nextBody)] });
      deepestIf.params![2] = n; deepestIf = n;
      return elseIfChain;
    },
    Else: (elseBody: any) => { deepestIf.params![2] = buildBlock(elseBody); },
  };
  return elseIfChain;
}

export function Loop(body: () => void): void {
  assertBlockScope("Loop", (scope) => { scope.push(node({ _t: "void", type: "loop", params: [buildBlock(body)] })); });
}
export function While(cond: I32Like, body: () => void): void {
  assertBlockScope("While", (scope) => {
    scope.push(node({ _t: "void", type: "while", params: [wrapValue(cond) as BaseNode, buildBlock(body)] }));
  });
}

// === asm() — inline raw WAT ===
export function asm(wat: string, ...interpolations: Node[]): void {
  assertBlockScope("asm", (scope) => { scope.push(node({ _t: "void", type: "asm", value: { wat, interpolations } })); });
}
export function asmExpr(wat: string, ...interpolations: Node[]): Node {
  return node({ _t: "void", type: "asm_expr", value: { wat, interpolations } }) as Node;
}

// === Raw memory access ===

export function store8(addr: Node<"i32">, value: Node<"i32">): void {
  needsMemory = true;
  assertBlockScope("store8", (scope) => {
    scope.push(node({ _t: "void", type: "i32_store8", params: [addr as BaseNode, value as BaseNode] }));
  });
}
export function load8_u(addr: Node<"i32">): Node<"i32"> {
  needsMemory = true;
  return node({ _t: "i32", type: "i32_load8_u", params: [addr as BaseNode] }) as Node<"i32">;
}
export function load8_s(addr: Node<"i32">): Node<"i32"> {
  needsMemory = true;
  return node({ _t: "i32", type: "i32_load8_s", params: [addr as BaseNode] }) as Node<"i32">;
}

// === Structs (memory-backed) ===

export interface StructFieldLayout {
  name: string;
  type: string;
  isStruct: boolean;
  offset: number;     // byte offset from struct base
  size: number;       // byte size
  align: number;      // alignment requirement
  nestedLayout?: StructLayout;
}

export interface StructLayout {
  name: string;
  fields: Record<string, StructFieldLayout>;
  fieldOrder: string[];
  size: number;   // total byte size (padded)
  align: number;  // overall alignment
}

let needsMemory = false;

function alignTo(offset: number, alignment: number): number {
  return (offset + alignment - 1) & ~(alignment - 1);
}

function computeStructLayout(name: string, fieldDefs: Record<string, any>): StructLayout {
  let fields: Record<string, StructFieldLayout> = {};
  let fieldOrder: string[] = [];
  let offset = 0;
  let maxAlign = 1;

  for (let [fname, ftype] of Object.entries(fieldDefs)) {
    fieldOrder.push(fname);
    if (ftype !== null && ftype !== undefined && (ftype as any).layout) {
      let nested = (ftype as any).layout as StructLayout;
      offset = alignTo(offset, nested.align);
      fields[fname] = {
        name: fname, type: `struct:${nested.name}`, isStruct: true,
        offset, size: nested.size, align: nested.align, nestedLayout: nested,
      };
      offset += nested.size;
      maxAlign = Math.max(maxAlign, nested.align);
    } else {
      let typeStr = typeof ftype === "string" ? ftype : (ftype as any).type || "f64";
      let sz = TYPE_SIZES[typeStr] || 4;
      let al = TYPE_ALIGN[typeStr] || 4;
      offset = alignTo(offset, al);
      fields[fname] = { name: fname, type: typeStr, isStruct: false, offset, size: sz, align: al };
      offset += sz;
      maxAlign = Math.max(maxAlign, al);
    }
  }
  let totalSize = alignTo(offset, maxAlign);
  return { name, fields, fieldOrder, size: totalSize, align: maxAlign };
}

function makeStructProxy(target: BaseNode, layout: StructLayout): any {
  const handler: ProxyHandler<BaseNode> = {
    get(t, prop, receiver) {
      if (typeof prop === "string") {
        if (prop === "toVar") return () => structToVar(t, layout);
        if (prop === "assign") return (val: any) => structAssignMem(t, layout, val);
        if (prop === "addr") return structAddr(t, layout);
        if (prop in layout.fields) {
          let field = layout.fields[prop];
          if (field.isStruct && field.nestedLayout) {
            let chain = node({ _t: field.type, type: "struct_field", params: [t], value: { layout, path: [prop] } });
            return makeStructProxy(chain, field.nestedLayout);
          }
          return node({ _t: field.type, type: "struct_field", params: [t], value: { layout, path: [prop] } }) as Node;
        }
      }
      return Reflect.get(t, prop, receiver);
    },
    set(t, prop, value, receiver) {
      if (typeof prop === "string" && prop in layout.fields) {
        let field = layout.fields[prop];
        if (field.isStruct && isNode(value)) {
          assignNestedStructField(t, layout, [prop], value as BaseNode);
          return true;
        }
        if (!field.isStruct) {
          let wrapped = wrapValue(value) as BaseNode;
          let addr = structAddrInner(t, layout);
          assertBlockScope("field set", (scope) => {
            scope.push(node({ _t: "void", type: "store", params: [addr, wrapped], value: { offset: field.offset, memType: field.type } }));
          });
          return true;
        }
      }
      return Reflect.set(t, prop, value, receiver);
    },
  };
  return new Proxy(target, handler);
}

/** Get the struct base address (i32) for memory access. */
function structAddrInner(base: BaseNode, layout: StructLayout): BaseNode {
  let bv = base.value as any;
  if (bv?.baseName) return node({ _t: "i32", type: "var", value: { varName: bv.baseName, varType: "i32" } });
  return base;
}

/** .addr property — returns the i32 address as a Node<"i32">. */
function structAddr(base: BaseNode, layout: StructLayout): Node<"i32"> {
  // For struct_var, get the backing i32 local
  let bv = base.value as any;
  if (bv?.baseName) {
    return node({ _t: "i32", type: "var", value: { varName: bv.baseName, varType: "i32" } }) as Node<"i32">;
  }
  // For struct_value, we need to materialize it first. This is an error in practice.
  throw new Error("[rm-wasm] Cannot take address of a struct value (call .toVar() first)");
}

function structToVar(structNode: BaseNode, layout: StructLayout): any {
  let baseName = `_s${nextVarId++}`;
  needsMemory = true;

  // Create i32 local for the pointer
  let ptrLocal = nodeVar(baseName, "i32");

  assertBlockScope("struct toVar", (scope) => {
    // Allocate from stack: ptr = __stack_ptr; __stack_ptr += size
    scope.push(node({ _t: "void", type: "let", params: [ptrLocal, node({ _t: "i32", type: "__stack_ptr" })] }));
    scope.push(node({ _t: "void", type: "__stack_ptr_add", value: layout.size }));

    // Store each field
    let structParams = structNode.params ?? [];
    for (let i = 0; i < layout.fieldOrder.length; i++) {
      let fname = layout.fieldOrder[i];
      let field = layout.fields[fname];
      let src = structParams[i];
      if (!src) continue;
      if (field.isStruct && field.nestedLayout) {
        // Copy nested struct fields into place
        let nestedParams = src?.params ?? [];
        for (let j = 0; j < field.nestedLayout.fieldOrder.length; j++) {
          let nfname = field.nestedLayout.fieldOrder[j];
          let nf = field.nestedLayout.fields[nfname];
          let nsrc = nestedParams[j];
          if (nsrc) {
            scope.push(node({
              _t: "void", type: "store",
              params: [ptrLocal, nsrc],
              value: { offset: field.offset + nf.offset, memType: nf.type },
            }));
          }
        }
      } else {
        scope.push(node({
          _t: "void", type: "store",
          params: [ptrLocal, src],
          value: { offset: field.offset, memType: field.type },
        }));
      }
    }
  });

  let varNode = node({
    _t: `struct:${layout.name}`,
    type: "struct_var",
    value: { layout, baseName },
  });
  return makeStructProxy(varNode, layout);
}

function structAssignMem(base: BaseNode, layout: StructLayout, val: any): void {
  if (!isNode(val)) throw new Error("[rm-wasm] struct assign requires a struct value");
  let addr = structAddrInner(base, layout);
  let valParams = (val as BaseNode).params ?? [];
  assertBlockScope("struct assign", (scope) => {
    for (let i = 0; i < layout.fieldOrder.length; i++) {
      let fname = layout.fieldOrder[i];
      let field = layout.fields[fname];
      let src = valParams[i];
      if (!src) continue;
      if (field.isStruct && field.nestedLayout) {
        let nestedSrcParams = src?.params ?? [];
        for (let j = 0; j < field.nestedLayout.fieldOrder.length; j++) {
          let nfname = field.nestedLayout.fieldOrder[j];
          let nf = field.nestedLayout.fields[nfname];
          let nsrc = nestedSrcParams[j];
          if (nsrc) {
            scope.push(node({ _t: "void", type: "store", params: [addr, nsrc], value: { offset: field.offset + nf.offset, memType: nf.type } }));
          }
        }
      } else {
        scope.push(node({ _t: "void", type: "store", params: [addr, src], value: { offset: field.offset, memType: field.type } }));
      }
    }
  });
}

function assignNestedStructField(base: BaseNode, layout: StructLayout, path: string[], value: BaseNode): void {
  let targetLayout = layout;
  for (let seg of path) {
    let f = targetLayout.fields[seg];
    if (!f || !f.nestedLayout) throw new Error(`Cannot assign nested field at ${path.join(".")}`);
    targetLayout = f.nestedLayout;
  }
  let addr = structAddrInner(base, layout);
  let valParams = value?.params ?? [];
  assertBlockScope("nested field set", (scope) => {
    for (let i = 0; i < targetLayout.fieldOrder.length; i++) {
      let fname = targetLayout.fieldOrder[i];
      let f = targetLayout.fields[fname];
      let src = valParams[i];
      if (src) {
        let fullOffset = 0;
        let cur = layout;
        for (let seg of path) {
          fullOffset += cur.fields[seg].offset;
          cur = cur.fields[seg].nestedLayout!;
        }
        fullOffset += f.offset;
        scope.push(node({ _t: "void", type: "store", params: [addr, src], value: { offset: fullOffset, memType: f.type } }));
      }
    }
  });
}

export function struct(name: string, fieldDefs: Record<string, any>): any {
  let layout = computeStructLayout(name, fieldDefs);

  const ctor = (...args: any[]) => {
    let params = args.map((a: any) => wrapValue(a) as BaseNode);
    let val = node({ _t: `struct:${layout.name}`, type: "struct_value", params, value: { layout } });
    return makeStructProxy(val, layout);
  };

  ctor.layout = layout;
  // .ref is the "pass by reference" type descriptor
  ctor.ref = { ref: true, layout, name: "?" };
  // .asParam(name) returns a ParamDef for by-value passing
  ctor.asParam = (paramName: string) => ({ name: paramName, type: `struct:${layout.name}`, structLayout: layout });

  return ctor;
}

// === Compiler ===

interface CompileCtx {
  locals: { name: string; type: string }[];
  seenLocals: Set<string>;
  nextLabelId: number;
  loopStack: { breakLabel: string; continueLabel: string }[];
  hasMemory: boolean;
  stackFrameSize: number;
}

interface Compiled { body: string[]; expr: string; }

function watType(t: string): string { return WASM_TYPES[t] ?? t; }
function createCtx(): CompileCtx {
  return { locals: [], seenLocals: new Set(), nextLabelId: 0, loopStack: [], hasMemory: false, stackFrameSize: 0 };
}

function compileNode(n: BaseNode, ctx: CompileCtx): Compiled {
  if (n === undefined || n === null) return { body: [], expr: "" };
  if (typeof n === "number") return { body: [], expr: `(f64.const ${n})` };
  if (typeof n === "boolean") return { body: [], expr: `(i32.const ${n ? 1 : 0})` };

  switch (n.type) {
    case "i32": return { body: [], expr: `(i32.const ${(n.value as number) | 0})` };
    case "i64": return { body: [], expr: `(i64.const ${n.value})` };
    case "f32": return { body: [], expr: `(f32.const ${f32lit(n.value as number)})` };
    case "f64": return { body: [], expr: `(f64.const ${n.value})` };
    case "void": return { body: [], expr: "" };
    case "var": {
      let v = n.value as any;
      let vt = watType(n._t);
      if (!ctx.seenLocals.has(v.varName)) {
        ctx.seenLocals.add(v.varName);
        ctx.locals.push({ name: v.varName, type: vt });
      }
      return { body: [], expr: `(local.get $${v.varName})` };
    }
    case "param": return { body: [], expr: `(local.get $${n.value})` };
    case "let": {
      let rhs = compileNode(n.params![1], ctx);
      let vn = (n.params![0].value as any).varName;
      return { body: [...rhs.body, `(local.set $${vn} ${rhs.expr})`], expr: `(local.get $${vn})` };
    }
    case "assign": {
      let lhs = compileNode(n.params![0], ctx);
      let rhs = compileNode(n.params![1], ctx);
      return { body: [...lhs.body, ...rhs.body, `(local.set $${localNameOf(lhs)} ${rhs.expr})`], expr: lhs.expr };
    }
    case "seq": {
      let allBody: string[] = [], expr = "";
      for (let p of (n.params ?? [])) { let r = compileNode(p, ctx); allBody.push(...r.body); if (r.expr) expr = r.expr; }
      return { body: allBody, expr };
    }
    case "return": {
      if (n.params?.length) { let v = compileNode(n.params![0], ctx); return { body: [...v.body, v.expr], expr: "" }; }
      return { body: [], expr: "" };
    }
    case "if": {
      // Statement-form if — must not leave values on the stack
      let cond = compileNode(n.params![0], ctx);
      let body = compileNode(n.params![1], ctx);
      let lines: string[] = [...cond.body, `(if`, `  ${cond.expr}`, `  (then`, ...body.body.map(l => `    ${l}`), `  )`];
      if (n.params!.length >= 3 && n.params![2] !== undefined) {
        let e = compileNode(n.params![2], ctx);
        if (e.body.length || e.expr) { lines.push(`  (else`); lines.push(...e.body.map(l => `    ${l}`)); lines.push(`  )`); }
      }
      lines.push(`)`);
      return { body: lines, expr: "" };
    }
    case "if_expr": {
      let cond = compileNode(n.params![0], ctx), t = compileNode(n.params![1], ctx), e = compileNode(n.params![2], ctx);
      return { body: [...cond.body, `(if (result ${watType(n._t)})`, `  ${cond.expr}`, `  (then`, ...t.body.map(l => `    ${l}`), ...(t.expr ? [`    ${t.expr}`] : []), `  )`, `  (else`, ...e.body.map(l => `    ${l}`), ...(e.expr ? [`    ${e.expr}`] : []), `  )`, `)`], expr: "" };
    }
    case "loop": {
      let id = ctx.nextLabelId++;
      ctx.loopStack.push({ breakLabel: `$loop_exit_${id}`, continueLabel: `$loop_${id}` });
      let body = compileNode(n.params![0], ctx);
      ctx.loopStack.pop();
      return { body: [`(block $loop_exit_${id}`, `  (loop $loop_${id}`, ...body.body.map(l => `    ${l}`), `    (br $loop_${id})`, `  )`, `)`], expr: "" };
    }
    case "while": {
      let id = ctx.nextLabelId++;
      let cond = compileNode(n.params![0], ctx);
      ctx.loopStack.push({ breakLabel: `$while_exit_${id}`, continueLabel: `$while_cont_${id}` });
      let body = compileNode(n.params![1], ctx);
      ctx.loopStack.pop();
      return { body: [`(block $while_exit_${id}`, `  (loop $while_cont_${id}`, ...cond.body, `    (br_if $while_exit_${id} (i32.eqz ${cond.expr}))`, ...body.body.map(l => `    ${l}`), `    (br $while_cont_${id})`, `  )`, `)`], expr: "" };
    }
    case "break": {
      let loop = ctx.loopStack[ctx.loopStack.length - 1];
      if (!loop) throw new Error("[rm-wasm] Break outside loop");
      return { body: [`(br ${loop.breakLabel})`], expr: "" };
    }
    case "continue": {
      let loop = ctx.loopStack[ctx.loopStack.length - 1];
      if (!loop) throw new Error("[rm-wasm] Continue outside loop");
      return { body: [`(br ${loop.continueLabel})`], expr: "" };
    }
    case "call": {
      let fnName = n.value as string;
      let args = (n.params ?? []).map((p: BaseNode) => compileNode(p, ctx));
      let allBody: string[] = [], argExprs: string[] = [];
      for (let a of args) { allBody.push(...a.body); argExprs.push(a.expr); }
      return { body: allBody, expr: `(call $${fnName} ${argExprs.join(" ")})` };
    }
    case "struct_value": {
      let params = n.params ?? [];
      return params.length > 0 ? compileNode(params[params.length - 1], ctx) : { body: [], expr: "" };
    }
    case "struct_var": return { body: [], expr: "" };

    case "struct_field": {
      // Walk chain to find ultimate base + full path + layout
      let resolvedPath: string[] = [];
      let baseNode = n as BaseNode;
      let ultimateBase: BaseNode | null = null;
      let ultimateLayout: StructLayout | null = null;

      while (baseNode.type === "struct_field") {
        let v = baseNode.value as any;
        resolvedPath = [...(v?.path ?? []), ...resolvedPath];
        ultimateLayout = v?.layout ?? ultimateLayout;
        baseNode = baseNode.params?.[0] as BaseNode;
        if (!baseNode) break;
      }
      ultimateBase = baseNode;
      if (!ultimateLayout) { ultimateLayout = ((n.value as any)?.layout) as StructLayout; }
      if (!ultimateLayout) return { body: [], expr: "" };

      // Find field byte offset
      let fieldOffset = findFieldOffset(ultimateLayout, resolvedPath);
      if (fieldOffset === -1) throw new Error(`[rm-wasm] Field ${resolvedPath.join(".")} not found`);

      let fieldType = findFieldType(ultimateLayout, resolvedPath);

      // struct_var base: emit memory load
      let bv = ultimateBase?.value as any;
      if (bv?.baseName) {
        let lName = bv.baseName;
        if (!ctx.seenLocals.has(lName)) {
          ctx.seenLocals.add(lName);
          ctx.locals.push({ name: lName, type: "i32" });
        }
        ctx.hasMemory = true;
        return { body: [], expr: `(${watType(fieldType)}.load offset=${fieldOffset} (local.get $${lName}))` };
      }

      // struct_value base: resolve to constructor arg
      if (ultimateBase?.type === "struct_value") {
        return resolveStructValueField(ultimateBase, ultimateLayout, resolvedPath, ctx);
      }

      return { body: [], expr: "" };
    }

    case "store": {
      let addr = compileNode(n.params![0], ctx);
      let val = compileNode(n.params![1], ctx);
      let v = n.value as any;
      let memType = (v?.memType as string) || "i64";
      let offset = v?.offset ?? 0;
      ctx.hasMemory = true;
      return {
        body: [...addr.body, ...val.body, `(${watType(memType)}.store offset=${offset} ${addr.expr} ${val.expr})`],
        expr: val.expr,
      };
    }
    case "i32_store8": {
      let addr = compileNode(n.params![0], ctx);
      let val = compileNode(n.params![1], ctx);
      ctx.hasMemory = true;
      return {
        body: [...addr.body, ...val.body, `(i32.store8 ${addr.expr} ${val.expr})`],
        expr: val.expr,
      };
    }
    case "i32_load8_u": {
      let addr = compileNode(n.params![0], ctx);
      ctx.hasMemory = true;
      return { body: addr.body, expr: `(i32.load8_u ${addr.expr})` };
    }
    case "i32_load8_s": {
      let addr = compileNode(n.params![0], ctx);
      ctx.hasMemory = true;
      return { body: addr.body, expr: `(i32.load8_s ${addr.expr})` };
    }
    case "i32_load": {
      let addr = compileNode(n.params![0], ctx);
      ctx.hasMemory = true;
      return { body: addr.body, expr: `(i32.load ${addr.expr})` };
    }
    case "f64_load": {
      let addr = compileNode(n.params![0], ctx);
      ctx.hasMemory = true;
      return { body: addr.body, expr: `(f64.load ${addr.expr})` };
    }

    case "__stack_ptr": {
      ctx.hasMemory = true;
      return { body: [], expr: `(global.get $__stack_ptr)` };
    }
    case "__stack_ptr_add": {
      let size = n.value as number;
      ctx.hasMemory = true;
      ctx.stackFrameSize += size;
      return { body: [], expr: "" };
    }

    case "asm": {
      let v = n.value as any, ip = v.interpolations as BaseNode[];
      let ir = ip.map((p: BaseNode) => compileNode(p, ctx));
      let b: string[] = []; let ex: string[] = [];
      for (let r of ir) { b.push(...r.body); ex.push(r.expr); }
      return { body: [...b, v.wat.replace(/\$(\d+)/g, (_s: string, i: string) => ex[+i] ?? "")], expr: "" };
    }
    case "asm_expr": {
      let v = n.value as any, ip = v.interpolations as BaseNode[];
      let ir = ip.map((p: BaseNode) => compileNode(p, ctx));
      let b: string[] = []; let ex: string[] = [];
      for (let r of ir) { b.push(...r.body); ex.push(r.expr); }
      return { body: b, expr: v.wat.replace(/\$(\d+)/g, (_s: string, i: string) => ex[+i] ?? "") };
    }
  }

  // Binary ops
  let binaryOps = ["add","sub","mul","div_s","div_u","div","rem_s","rem_u","and","or","xor","shl","shr_s","shr_u","rotl","rotr","min","max","copysign"];
  let cmpOps = ["eq","ne","lt","gt","le","ge","lt_s","lt_u","gt_s","gt_u","le_s","le_u","ge_s","ge_u"];
  if (binaryOps.includes(n.type) || cmpOps.includes(n.type)) {
    let a = compileNode(n.params![0], ctx), b = compileNode(n.params![1], ctx);
    let prefix = watType(n.params![0]._t);
    return { body: [...a.body, ...b.body], expr: `(${prefix}.${n.type} ${a.expr} ${b.expr})` };
  }
  let unaryOps = ["neg","not","clz","ctz","popcnt","abs","ceil","floor","trunc","nearest","sqrt"];
  if (unaryOps.includes(n.type)) {
    let a = compileNode(n.params![0], ctx);
    return { body: a.body, expr: `(${watType(n.params![0]._t)}.${n.type} ${a.expr})` };
  }
  let conversions = ["wrap_i64","extend_i32_s","extend_i32_u","demote_f64","promote_f32",
                     "trunc_f32_s","trunc_f32_u","trunc_f64_s","trunc_f64_u",
                     "convert_i32_s","convert_i32_u","convert_i64_s","convert_i64_u",
                     "reinterpret_f32","reinterpret_f64","reinterpret_i32","reinterpret_i64"];
  if (conversions.includes(n.type)) {
    let a = compileNode(n.params![0], ctx);
    return { body: a.body, expr: `(${watType(n._t)}.${n.type} ${a.expr})` };
  }

  console.warn(`[rm-wasm] Unknown node type: ${n.type}`);
  return { body: [], expr: "" };
}

/** Walk a struct layout + path to find the byte offset of a primitive field. */
function findFieldOffset(layout: StructLayout, path: string[]): number {
  let off = 0, cur = layout;
  for (let i = 0; i < path.length; i++) {
    let f = cur.fields[path[i]];
    if (!f) return -1;
    off += f.offset;
    if (i < path.length - 1) {
      if (!f.nestedLayout) return -1;
      cur = f.nestedLayout;
    }
  }
  return off;
}

/** Find the primitive type of a field at the given path. */
function findFieldType(layout: StructLayout, path: string[]): string {
  let cur = layout;
  for (let i = 0; i < path.length; i++) {
    let f = cur.fields[path[i]];
    if (!f) return "f64";
    if (i === path.length - 1) return f.type;
    if (!f.nestedLayout) return "f64";
    cur = f.nestedLayout;
  }
  return "f64";
}

/** Resolve a struct_field on a struct_value by walking constructor args. */
function resolveStructValueField(ultimateBase: BaseNode, ultimateLayout: StructLayout, path: string[], ctx: CompileCtx): Compiled {
  let current: BaseNode[] = ultimateBase.params ?? [];
  let currentLayout = ultimateLayout;
  for (let i = 0; i < path.length; i++) {
    let seg = path[i];
    let fd = currentLayout.fields[seg];
    if (i === path.length - 1) {
      let idx = currentLayout.fieldOrder.indexOf(seg);
      if (idx >= 0 && idx < current.length) return compileNode(current[idx], ctx);
    } else if (fd.isStruct && fd.nestedLayout) {
      let idx = currentLayout.fieldOrder.indexOf(seg);
      if (idx >= 0 && idx < current.length) {
        current = (current[idx] as any)?.params ?? [];
        currentLayout = fd.nestedLayout;
      }
    }
  }
  return { body: [], expr: "" };
}

function localNameOf(c: Compiled): string {
  let m = c.expr.match(/\(local\.get \$(\w+)\)/);
  return m ? m[1] : "";
}

function f32lit(v: number): string {
  let s = String(v);
  if (!s.includes(".") && !s.includes("e")) s += ".0";
  return s;
}

// === Compile a function definition ===

function compileFunc(def: FuncDef): string {
  let oldScope = blockScope;
  blockScope = [];

  // Create param nodes, expanding by-value structs into scalar params
  let paramNodes: any[] = [];
  let paramWAT: string[] = [];

  for (let pd of def.paramDefs) {
    if (pd.structLayout && !pd.isRef) {
      // By-value struct: expand to scalar params + create proxy
      let layout = pd.structLayout;
      let fieldParamNodes: BaseNode[] = [];
      for (let fname of layout.fieldOrder) {
        let field = layout.fields[fname];
        let pname = `${pd.name}_${fname}`;
        paramWAT.push(` (param $${pname} ${watType(field.type)})`);
        fieldParamNodes.push(node({ _t: field.type, type: "param", value: pname }));
      }
      // Create a proxy-wrapped "struct param var" that maps field access to local.get
      let proxyNode = node({
        _t: `struct:${layout.name}`,
        type: "struct_param_var",
        value: { layout, baseName: pd.name, fieldParamNodes },
      });
      paramNodes.push(makeStructProxy(proxyNode, layout));
    } else if (pd.isRef && pd.structLayout) {
      // By-reference: i32 param, proxy-wrapped
      paramWAT.push(` (param $${pd.name} i32)`);
      let paramNode = node({ _t: `ref:${pd.structLayout.name}`, type: "param", value: pd.name });
      paramNodes.push(makeStructProxy(paramNode, pd.structLayout));
    } else {
      // Primitive param
      paramWAT.push(` (param $${pd.name} ${watType(pd.type)})`);
      paramNodes.push(node({ _t: pd.type, type: "param", value: pd.name }));
    }
  }

  // Execute body
  let result = def.bodyFn(...paramNodes);

  // Wrap in seq
  let wrappedResult: BaseNode = (result !== undefined && result !== null)
    ? wrapValue(result) as BaseNode
    : node({ _t: "void", type: "void" });

  let bodyNode = node({
    _t: wrappedResult._t || "void",
    type: "seq",
    params: [...(blockScope ?? []), wrappedResult],
  });
  blockScope = oldScope;

  // Compile
  let ctx = createCtx();
  let compiled = compileNode(bodyNode, ctx);

  // Build WAT function
  let lines: string[] = [];
  let header = `(func $${def.name}`;
  for (let pw of paramWAT) header += pw;
  if (def.result && def.result !== "void") {
    header += ` (result ${watType(def.result)})`;
  }
  lines.push(header);

  // Stack frame save/restore if memory is used
  let stackSaveLabel: string | null = null;
  if (ctx.hasMemory && ctx.stackFrameSize > 0) {
    stackSaveLabel = `_stack_save_${def.name}`;
    let savedLocal = `_stack_save`;
    if (!ctx.seenLocals.has(savedLocal)) {
      ctx.seenLocals.add(savedLocal);
      ctx.locals.push({ name: savedLocal, type: "i32" });
    }
  }

  // Emit locals
  for (let local of ctx.locals) {
    lines.push(`  (local $${local.name} ${local.type})`);
  }

  // Stack save at entry
  if (stackSaveLabel) {
    lines.push(`  (local.set $_stack_save (global.get $__stack_ptr))`);
  }
  if (ctx.stackFrameSize > 0) {
    lines.push(`  (global.set $__stack_ptr (i32.add (global.get $__stack_ptr) (i32.const ${ctx.stackFrameSize})))`);
  }

  // Emit body
  for (let line of compiled.body) {
    if (line.trim()) lines.push(`  ${line}`);
  }
  if (compiled.expr && def.result && def.result !== "void") lines.push(`  ${compiled.expr}`);

  // Stack restore at exit
  if (stackSaveLabel) {
    lines.push(`  (global.set $__stack_ptr (local.get $_stack_save))`);
  }

  lines.push(`)`);
  return lines.join("\n");
}

// === Public compile API ===

export function compileWAT(): string;
export function compileWAT(opts: { exports?: string[]; memoryPages?: number }): string;
export function compileWAT(opts?: { exports?: string[]; memoryPages?: number }): string {
  let memoryPages = opts?.memoryPages ?? 1;

  // Compile all functions
  let funcBodies = funcRegistry.map(def => compileFunc(def));

  let useMemory = needsMemory || (opts?.memoryPages !== undefined && opts.memoryPages > 0);

  let lines: string[] = [];
  lines.push("(module");

  if (useMemory) {
    lines.push(`  (memory (export "memory") ${memoryPages})`);
    lines.push(`  (global $__stack_ptr (mut i32) (i32.const ${memoryPages * 65536 - 8}))`);
    lines.push("");
  }

  for (let fb of funcBodies) {
    lines.push("");
    for (let l of fb.split("\n")) {
      lines.push(`  ${l}`);
    }
  }

  if (opts?.exports) {
    for (let exp of opts.exports) {
      lines.push(`  (export "${exp}" (func $${exp}))`);
    }
  }

  lines.push(")");
  return lines.join("\n");
}
