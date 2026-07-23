let memory: WebAssembly.Memory;
let mandelbrot: CallableFunction;
let mandelbrotAccurate: CallableFunction;
let palette: Uint8Array;

const PALETTE_SIZE = 2048;

function buildPalette(maxIter: number): Uint8Array {
  const p = new Uint8Array(PALETTE_SIZE * 4);
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const t = i / PALETTE_SIZE;
    const fade = Math.min(1, t * 8);
    p[i * 4] = Math.floor(fade * (127.5 + 127.5 * Math.sin(Math.PI * t * 3.0)));
    p[i * 4 + 1] = Math.floor(fade * (127.5 + 127.5 * Math.sin(Math.PI * t * 3.0 + 2.094)));
    p[i * 4 + 2] = Math.floor(fade * (127.5 + 127.5 * Math.sin(Math.PI * t * 3.0 + 4.188)));
    p[i * 4 + 3] = 255;
  }
  return p;
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "init") {
    const inst = await WebAssembly.instantiate(msg.binary, {});
    memory = inst.instance.exports.memory as WebAssembly.Memory;
    mandelbrot = inst.instance.exports.mandelbrot as CallableFunction;
    mandelbrotAccurate = inst.instance.exports.mandelbrot_accurate as CallableFunction;
    palette = buildPalette(msg.maxIter || 256);
    self.postMessage({ type: "ready" });
    return;
  }

  if (msg.type === "render") {
    const { renderId, x, y, w, h, maxIter, xMin, yMin, pixelScale, fn } = msg;
    const fnCall = fn === "accurate" ? mandelbrotAccurate : mandelbrot;

    fnCall(0, maxIter, w, h, xMin, yMin, pixelScale);

    const f32View = new Float32Array(memory.buffer, 0, w * h);
    const pixels = new Uint8Array(w * h * 4);

    const maxIdx = PALETTE_SIZE - 1;
    for (let i = 0; i < w * h; i++) {
      const t = f32View[i] / maxIter;
      const idx = Math.floor(Math.min(1, Math.max(0, t)) * maxIdx) * 4;
      const off = i * 4;
      pixels[off] = palette[idx];
      pixels[off + 1] = palette[idx + 1];
      pixels[off + 2] = palette[idx + 2];
      pixels[off + 3] = palette[idx + 3];
    }

    self.postMessage({ type: "result", renderId, x, y, w, h, pixels: pixels.buffer }, [pixels.buffer]);
  }
};
