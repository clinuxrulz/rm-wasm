import wabt from "wabt";
import { buildPerturbationWAT } from "./mandelbrot";
import MandelbrotWorker from "./mandelbrot.worker?worker";

const WIDTH = 800;
const HEIGHT = 600;

const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const statusEl = document.getElementById("status") as HTMLElement;
const iterInput = document.getElementById("iter") as HTMLInputElement;
let zoom = 4;
let panX = 0;
let panY = 0;

interface Quadrant {
  x: number; y: number;
  w: number; h: number;
}

const QUADRANTS: Quadrant[] = [
  { x: 0,   y: 0,   w: 400, h: 300 },
  { x: 400, y: 0,   w: 400, h: 300 },
  { x: 0,   y: 300, w: 400, h: 300 },
  { x: 400, y: 300, w: 400, h: 300 },
];

const workers: Worker[] = [];
let renderId = 0;
const pendingByRender = new Map<number, number>();
let workersReady = 0;
let computeRef: CallableFunction;
let refMemory: WebAssembly.Memory;

async function computeReference(cx: number, cy: number, maxIter: number): Promise<{ orbit: Float64Array; refIter: number }> {
  const wabtApi = await wabt();
  const watStr = buildPerturbationWAT(WIDTH, HEIGHT, maxIter);
  const module = wabtApi.parseWat("mandelbrot.wat", watStr);
  const binary = module.toBinary({ write_debug_names: false });
  module.destroy();

  const inst = await WebAssembly.instantiate(binary.buffer, {});
  const mem = inst.instance.exports.memory as WebAssembly.Memory;
  computeRef = inst.instance.exports.compute_reference as CallableFunction;

  const orbitBytes = (maxIter + 1) * 16;
  const refIter = computeRef(0, cx, cy, maxIter) as number;
  const orbit = new Float64Array(mem.buffer, 0, (refIter + 1) * 2);
  return { orbit: new Float64Array(orbit), refIter };
}

async function init() {
  statusEl.textContent = "Compiling WAT...";
  const maxIter = +iterInput.value;
  const watStr = buildPerturbationWAT(WIDTH, HEIGHT, maxIter);

  statusEl.textContent = "Parsing WAT → WASM...";
  const wabtApi = await wabt();
  const module = wabtApi.parseWat("mandelbrot.wat", watStr);
  const binary = module.toBinary({ write_debug_names: false });
  module.destroy();

  statusEl.textContent = "Computing reference orbit...";
  const inst = await WebAssembly.instantiate(binary.buffer, {});
  const mem = inst.instance.exports.memory as WebAssembly.Memory;
  refMemory = mem;
  computeRef = inst.instance.exports.compute_reference as CallableFunction;

  const orbitBytes = (maxIter + 1) * 16;
  const refIter = computeRef(0, panX, panY, maxIter) as number;
  const orbitData = new Float64Array(mem.buffer, 0, (refIter + 1) * 2);
  const orbitCopy = new Float64Array(orbitData);

  statusEl.textContent = "Starting workers...";

  for (let i = 0; i < 4; i++) {
    const worker = new MandelbrotWorker();
    workers.push(worker);

    worker.postMessage({
      type: "init",
      binary: binary.buffer,
      orbitData: orbitCopy.buffer,
      refIter,
      maxIter,
    });

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "ready") {
        workersReady++;
        if (workersReady === 4) render();
        return;
      }
      if (msg.type === "result") {
        const left = pendingByRender.get(msg.renderId);
        if (left === undefined) return;
        const pixels = new Uint8ClampedArray(msg.pixels);
        const imgData = new ImageData(pixels, msg.w, msg.h);
        ctx.putImageData(imgData, msg.x, msg.y);
        if (left === 1) {
          pendingByRender.delete(msg.renderId);
          statusEl.textContent = "Done";
        } else {
          pendingByRender.set(msg.renderId, left - 1);
        }
      }
    };
  }
}

async function render() {
  statusEl.textContent = "Computing ref orbit...";

  const maxIter = +iterInput.value;
  const refIter = computeRef(0, panX, panY, maxIter) as number;
  const orbitData = new Float64Array(refMemory.buffer, 0, (refIter + 1) * 2);
  const orbitCopy = new Float64Array(orbitData);

  statusEl.textContent = "Rendering...";

  const pixelScale = zoom / Math.min(WIDTH, HEIGHT);
  const xMin = panX - (WIDTH / 2) * pixelScale;
  const yMin = panY - (HEIGHT / 2) * pixelScale;

  const rid = ++renderId;
  pendingByRender.set(rid, 4);

  for (let i = 0; i < 4; i++) {
    const q = QUADRANTS[i];
    const quadXMin = xMin + q.x * pixelScale;
    const quadYMin = yMin + q.y * pixelScale;

    workers[i].postMessage({
      type: "render",
      renderId: rid,
      x: q.x,
      y: q.y,
      w: q.w,
      h: q.h,
      maxIter,
      refIter,
      xMin: quadXMin,
      yMin: quadYMin,
      pixelScale,
      cx: panX,
      cy: panY,
      orbitData: orbitCopy.buffer,
    });
  }
}

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (WIDTH / rect.width);
  const mouseY = (e.clientY - rect.top) * (HEIGHT / rect.height);

  const minWH = Math.min(WIDTH, HEIGHT);
  const pixelScale = zoom / minWH;

  const mX = panX + (mouseX - WIDTH / 2) * pixelScale;
  const mY = panY + (mouseY - HEIGHT / 2) * pixelScale;

  zoom *= Math.pow(1.001, e.deltaY);
  const newPixelScale = zoom / minWH;

  panX = mX - (mouseX - WIDTH / 2) * newPixelScale;
  panY = mY - (mouseY - HEIGHT / 2) * newPixelScale;

  render();
}, { passive: false });

let isPanning = false;
let panStart: { panX: number; panY: number; px: number; py: number } | null = null;

canvas.addEventListener("pointerdown", (e) => {
  isPanning = true;
  canvas.setPointerCapture(e.pointerId);
  panStart = { panX, panY, px: e.clientX, py: e.clientY };
});

canvas.addEventListener("pointermove", (e) => {
  if (!isPanning || !panStart) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  const pixelScale = zoom / Math.min(WIDTH, HEIGHT);

  const dx = (e.clientX - panStart.px) * scaleX;
  const dy = (e.clientY - panStart.py) * scaleY;

  panX = panStart.panX - dx * pixelScale;
  panY = panStart.panY - dy * pixelScale;

  render();
});

canvas.addEventListener("pointerup", () => {
  isPanning = false;
  panStart = null;
});

canvas.addEventListener("pointercancel", () => {
  isPanning = false;
  panStart = null;
});

iterInput.addEventListener("input", render);
init();
