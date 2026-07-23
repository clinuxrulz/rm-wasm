import wabt from "wabt";
import { buildMandelbrotWAT } from "./mandelbrot";
import MandelbrotWorker from "./mandelbrot.worker?worker";

const WIDTH = 800;
const HEIGHT = 600;

const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const statusEl = document.getElementById("status") as HTMLElement;
const iterInput = document.getElementById("iter") as HTMLInputElement;
const precisionBtn = document.getElementById("precisionBtn") as HTMLButtonElement;
let zoom = 4;
let panX = 0;
let panY = 0;
let useAccurate = false;

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

async function init() {
  statusEl.textContent = "Compiling WAT...";
  const watStr = buildMandelbrotWAT(WIDTH, HEIGHT);

  statusEl.textContent = "Parsing WAT → WASM...";
  const wabtApi = await wabt();
  const module = wabtApi.parseWat("mandelbrot.wat", watStr);
  const binary = module.toBinary({ write_debug_names: false });
  module.destroy();

  statusEl.textContent = "Starting workers...";
  const wasmBinary = binary.buffer;

  for (let i = 0; i < 4; i++) {
    const worker = new MandelbrotWorker();
    workers.push(worker);

    worker.postMessage({ type: "init", binary: wasmBinary, maxIter: +iterInput.value });

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

function render() {
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
      id: i,
      x: q.x,
      y: q.y,
      w: q.w,
      h: q.h,
      maxIter: +iterInput.value,
      xMin: quadXMin,
      yMin: quadYMin,
      pixelScale,
      fn: useAccurate ? "accurate" : "fast",
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

canvas.addEventListener("pointerup", (e) => {
  isPanning = false;
  panStart = null;
  canvas.releasePointerCapture(e.pointerId);
});

canvas.addEventListener("pointercancel", () => {
  isPanning = false;
  panStart = null;
});

precisionBtn.addEventListener("click", () => {
  useAccurate = !useAccurate;
  precisionBtn.textContent = useAccurate ? "High Precision: ON" : "High Precision: OFF";
  render();
});

iterInput.addEventListener("input", render);
init();
