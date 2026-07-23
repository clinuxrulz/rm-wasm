import {
  Fn, While, If, i32, i64, f64, Break,
  clearRegistry, compileWAT, node, asm,
} from "rm-wasm";

const SPLIT = 134217729;
const LN2 = Math.LN2;

function dd_add(dstHi: any, dstLo: any, aHi: any, aLo: any, bHi: any, bLo: any) {
  const x = aHi.add(bHi).toVar();
  const bv = x.sub(aHi).toVar();
  const av = x.sub(bv).toVar();
  const br = bHi.sub(bv).toVar();
  const ar = aHi.sub(av).toVar();
  const y = ar.add(br).toVar();
  const lo = y.add(aLo).add(bLo).toVar();
  const t = x.add(lo).toVar();
  dstLo.assign(x.sub(t).add(lo));
  dstHi.assign(t);
}

function dd_mul(dstHi: any, dstLo: any, aHi: any, aLo: any, bHi: any, bLo: any) {
  const t1 = f64(SPLIT).mul(aHi).toVar();
  const a1 = t1.sub(t1.sub(aHi)).toVar();
  const a0 = aHi.sub(a1).toVar();
  const t2 = f64(SPLIT).mul(bHi).toVar();
  const b1 = t2.sub(t2.sub(bHi)).toVar();
  const b0 = bHi.sub(b1).toVar();
  const p_hi = aHi.mul(bHi).toVar();
  const p_lo = a1.mul(b1).sub(p_hi).add(a1.mul(b0)).add(a0.mul(b1)).add(a0.mul(b0)).toVar();
  p_lo.assign(p_lo.add(aHi.mul(bLo)).add(aLo.mul(bHi)));
  const h = p_hi.add(p_lo).toVar();
  dstLo.assign(p_lo.sub(h.sub(p_hi)));
  dstHi.assign(h);
}

function dd_sub(dstHi: any, dstLo: any, aHi: any, aLo: any, bHi: any, bLo: any) {
  dd_add(dstHi, dstLo, aHi, aLo, node({ _t: "f64", type: "neg", params: [bHi] }), node({ _t: "f64", type: "neg", params: [bLo] }));
}

function wasmLog(val: any): any {
  const bits = node({ _t: "i64", type: "reinterpret_f64", params: [val] }) as any;
  const expBits = bits.shr_u(i64(52)).and(i64(0x7FFn)).toVar();
  const expSigned = expBits.sub(i64(1023)).toVar();
  const mantBits = bits.and(i64(0x000FFFFFFFFFFFFFn)).or(i64(0x3FF0000000000000n));
  const mant = node({ _t: "f64", type: "reinterpret_i64", params: [mantBits] }) as any;
  const t = mant.sub(f64(1.0));
  const t2 = t.mul(t);
  const t3 = t2.mul(t);
  const t4 = t3.mul(t);
  const t5 = t4.mul(t);
  const logMant = t.sub(t2.div(f64(2))).add(t3.div(f64(3))).sub(t4.div(f64(4))).add(t5.div(f64(5)));
  const expF64 = node({ _t: "f64", type: "convert_i64_s", params: [expSigned] }) as any;
  return logMant.add(expF64.mul(f64(LN2)));
}

function pixelBody(out: any, width: any, x: any, y: any, iter: any, maxIter: any, zx: any, zy: any) {
  const pixelByteIdx = y.mul(width).add(x).mul(i32(4));
  const n_f64 = node({ _t: "f64", type: "convert_i32_s", params: [iter] }) as any;

  If(iter.lt(maxIter), () => {
    const magSq = zx.mul(zx).add(zy.mul(zy));
    const logInner = wasmLog(magSq);
    const logOuter = wasmLog(logInner);
    const smooth = n_f64.add(f64(2)).sub(logOuter.div(f64(LN2)));
    asm("(f32.store $0 (f32.demote_f64 $1))", out.add(pixelByteIdx), smooth);
  }).Else(() => {
    const maxF64 = node({ _t: "f64", type: "convert_i32_s", params: [maxIter] }) as any;
    asm("(f32.store $0 (f32.demote_f64 $1))", out.add(pixelByteIdx), maxF64);
  });
}

export function buildMandelbrotWAT(fullWidth: number, fullHeight: number): string {
  clearRegistry();

  Fn("mandelbrot", {
    params: [
      { name: "out", type: "i32" },
      { name: "maxIter", type: "i32" },
      { name: "width", type: "i32" },
      { name: "height", type: "i32" },
      { name: "xMin", type: "f64" },
      { name: "yMin", type: "f64" },
      { name: "scale", type: "f64" },
    ],
    result: "void",
  }, (out: any, maxIter: any, width: any, height: any, xMin: any, yMin: any, scale: any) => {
    let y = i32(0).toVar();
    While(y.lt(height), () => {
      let x = i32(0).toVar();
      While(x.lt(width), () => {
        const xf = node({ _t: "f64", type: "convert_i32_s", params: [x] }) as any;
        const yf = node({ _t: "f64", type: "convert_i32_s", params: [y] }) as any;
        const cx = xMin.add(xf.mul(scale));
        const cy = yMin.add(yf.mul(scale));
        let zx = f64(0).toVar();
        let zy = f64(0).toVar();
        let iter = i32(0).toVar();
        While(iter.lt(maxIter), () => {
          const zx2 = zx.mul(zx);
          const zy2 = zy.mul(zy);
          If(zx2.add(zy2).gt(f64(4.0)), () => {
            Break();
          }).Else(() => {
            const saved_zx = f64(0).toVar();
            saved_zx.assign(zx);
            const saved_zy = f64(0).toVar();
            saved_zy.assign(zy);
            zy.assign(f64(2).mul(saved_zx).mul(saved_zy).add(cy));
            zx.assign(saved_zx.mul(saved_zx).sub(saved_zy.mul(saved_zy)).add(cx));
            iter.assign(iter.add(i32(1)));
          });
        });
        pixelBody(out, width, x, y, iter, maxIter, zx, zy);
        x.assign(x.add(i32(1)));
      });
      y.assign(y.add(i32(1)));
    });
  });

  Fn("mandelbrot_accurate", {
    params: [
      { name: "out", type: "i32" },
      { name: "maxIter", type: "i32" },
      { name: "width", type: "i32" },
      { name: "height", type: "i32" },
      { name: "xMin", type: "f64" },
      { name: "yMin", type: "f64" },
      { name: "scale", type: "f64" },
    ],
    result: "void",
  }, (out: any, maxIter: any, width: any, height: any, xMin: any, yMin: any, scale: any) => {
    let y = i32(0).toVar();
    While(y.lt(height), () => {
      let x = i32(0).toVar();
      While(x.lt(width), () => {
        const xf = node({ _t: "f64", type: "convert_i32_s", params: [x] }) as any;
        const yf = node({ _t: "f64", type: "convert_i32_s", params: [y] }) as any;
        const cxHi = xMin.add(xf.mul(scale));
        const cyHi = yMin.add(yf.mul(scale));
        let zxHi = f64(0).toVar();
        let zxLo = f64(0).toVar();
        let zyHi = f64(0).toVar();
        let zyLo = f64(0).toVar();
        let iter = i32(0).toVar();
        While(iter.lt(maxIter), () => {
          const zx2Hi = f64(0).toVar();
          const zx2Lo = f64(0).toVar();
          dd_mul(zx2Hi, zx2Lo, zxHi, zxLo, zxHi, zxLo);
          const zy2Hi = f64(0).toVar();
          const zy2Lo = f64(0).toVar();
          dd_mul(zy2Hi, zy2Lo, zyHi, zyLo, zyHi, zyLo);
          const magHi = f64(0).toVar();
          const magLo = f64(0).toVar();
          dd_add(magHi, magLo, zx2Hi, zx2Lo, zy2Hi, zy2Lo);
          If(magHi.gt(f64(4.0)).or(magHi.eq(f64(4.0)).and(magLo.gt(f64(0.0)))), () => {
            Break();
          }).Else(() => {
            const oldZxHi = f64(0).toVar();
            oldZxHi.assign(zxHi);
            const oldZxLo = f64(0).toVar();
            oldZxLo.assign(zxLo);
            const oldZyHi = f64(0).toVar();
            oldZyHi.assign(zyHi);
            const oldZyLo = f64(0).toVar();
            oldZyLo.assign(zyLo);
            const diffHi = f64(0).toVar();
            const diffLo = f64(0).toVar();
            dd_sub(diffHi, diffLo, zx2Hi, zx2Lo, zy2Hi, zy2Lo);
            dd_add(zxHi, zxLo, diffHi, diffLo, cxHi, f64(0));
            const prodHi = f64(0).toVar();
            const prodLo = f64(0).toVar();
            dd_mul(prodHi, prodLo, oldZxHi, oldZxLo, oldZyHi, oldZyLo);
            dd_add(zyHi, zyLo, prodHi.mul(f64(2)), prodLo.mul(f64(2)), cyHi, f64(0));
            iter.assign(iter.add(i32(1)));
          });
        });
        pixelBody(out, width, x, y, iter, maxIter, zxHi, zyHi);
        x.assign(x.add(i32(1)));
      });
      y.assign(y.add(i32(1)));
    });
  });

  const neededPages = Math.ceil((fullWidth * fullHeight * 4) / 65536);
  return compileWAT({
    exports: ["mandelbrot", "mandelbrot_accurate"],
    memoryPages: neededPages,
  });
}
