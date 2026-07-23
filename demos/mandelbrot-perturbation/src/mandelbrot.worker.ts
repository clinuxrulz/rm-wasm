let memory: WebAssembly.Memory;
let renderPerturb: CallableFunction;
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

function loadOrbit(orbitData: Float64Array, refIter: number): void {
  const dst = new Float64Array(memory.buffer, 0, (refIter + 1) * 2);
  dst.set(orbitData);
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "init") {
    const inst = await WebAssembly.instantiate(msg.binary, {});
    memory = inst.instance.exports.memory as WebAssembly.Memory;
    renderPerturb = inst.instance.exports.render_perturb as CallableFunction;
    if (msg.orbitData) {
      loadOrbit(new Float64Array(msg.orbitData), msg.refIter);
    }
    palette = buildPalette(msg.maxIter || 256);
    self.postMessage({ type: "ready" });
    return;
  }

  if (msg.type === "render") {
    const { renderId, x, y, w, h, maxIter, refIter, xMin, yMin, pixelScale, cx, cy, orbitData } = msg;

    if (orbitData) {
      loadOrbit(new Float64Array(orbitData), refIter);
    }

    const refOrbitOffset = 0;
    const pixelOffset = (refIter + 1) * 16;
    renderPerturb(pixelOffset, refOrbitOffset, refIter, maxIter, w, h, xMin, yMin, pixelScale, cx, cy);

    const f32View = new Float32Array(memory.buffer, pixelOffset, w * h);
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
