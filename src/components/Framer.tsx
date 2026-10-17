"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BottomBar } from "@/components/consult/ui";

// Output matches YouCam's framing rules: 4:5, face oval = 68% of the width (hair models ask for 50-80%,
// the face analyzer for more than 60%). The oval sits low so a close-up keeps the hair above it in frame.
const OUT_W = 900;
const OUT_H = 1125;

type Props = {
  hint: string;
  onCapture: (blob: Blob) => void;
  guide?: "front" | "right" | "left" | "down";
};

export default function Framer({ hint, onCapture, guide = "front" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(380);

  // Size the frame to the screen space left below it (minus the phone's bottom bar), so the whole
  // frame and its buttons are visible without scrolling.
  useEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const bar = window.innerWidth < 640 ? 96 : 24;
      const room = window.innerHeight - top - bar;
      setFit(Math.round(Math.min(380, Math.max(180, room * 0.8))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  async function startCamera() {
    setCamError(null);
    setImg(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1600 } } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      setCamError("Camera not available. Upload a photo instead.");
    }
  }

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  function onFile(f: File) {
    stop();
    const url = URL.createObjectURL(f);
    const i = new Image();
    i.onload = () => {
      setImg(i);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    i.src = url;
  }

  // Draw the current view (cover-fit, then zoom + pan) into the output canvas.
  function capture() {
    const src: CanvasImageSource | null = img ?? videoRef.current;
    if (!src) return;
    const sw = img ? img.naturalWidth : videoRef.current!.videoWidth;
    const sh = img ? img.naturalHeight : videoRef.current!.videoHeight;
    if (!sw || !sh) return;
    const box = boxRef.current!.getBoundingClientRect();
    const c = document.createElement("canvas");
    c.width = OUT_W;
    c.height = OUT_H;
    const ctx = c.getContext("2d")!;
    const cover = Math.max(OUT_W / sw, OUT_H / sh) * zoom;
    const k = OUT_W / box.width;
    ctx.translate(OUT_W / 2 + pan.x * k, OUT_H / 2 + pan.y * k);
    ctx.drawImage(src, (-sw * cover) / 2, (-sh * cover) / 2, sw * cover, sh * cover);
    c.toBlob((b) => b && onCapture(b), "image/jpeg", 0.9);
    stop();
  }

  const live = !!stream;
  const has = live || !!img;
  const media = { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` };

  return (
    <div className="w-full">
      <div
        ref={boxRef}
        className="relative mx-auto aspect-[4/5] w-full overflow-hidden bg-tile touch-none select-none"
        style={{ maxWidth: fit }}
        onPointerDown={(e) => {
          if (!img) return;
          (e.target as Element).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPan({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        {live && (
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" style={{ ...media, transform: media.transform + " scaleX(-1)" }} />
        )}
        {img && <img src={img.src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={media} />}
        {!has && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <GuideIcon guide={guide} />
            <p className="text-muted" role={camError ? "alert" : undefined}>{camError ?? hint}</p>
          </div>
        )}
        {/* Oval guide: 68% of the width, centred just below the middle, room for hair on top */}
        <svg aria-hidden viewBox="0 0 100 125" className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <mask id={`m-${guide}`}>
              <rect width="100" height="125" fill="white" />
              <ellipse cx="50" cy="66" rx="34" ry="43" fill="black" />
            </mask>
          </defs>
          <rect width="100" height="125" fill="rgba(255,255,255,0.55)" mask={`url(#m-${guide})`} />
          <ellipse cx="50" cy="66" rx="34" ry="43" fill="none" stroke="#141414" strokeWidth="0.5" strokeDasharray="2 1.5" />
        </svg>
        {/* Bottom edge, so it never covers the hair the models need to see. */}
        {has && <div className="label absolute inset-x-2 bottom-2 bg-paper/90 px-2 py-1 text-center text-[11px]">{hint}</div>}
      </div>

      {img && (
        <label className="mx-auto mt-3 flex max-w-[380px] items-center gap-3 text-sm text-muted">
          Zoom
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[#141414]" />
        </label>
      )}
      {img && <p className="mt-1 text-center text-sm text-muted">Drag and zoom until your face fills the oval.</p>}

      <div className="mx-auto mt-4 hidden max-w-[380px] sm:block">{controls()}</div>
      {/* On phones the controls live in the bar pinned to the bottom, so they're visible without scrolling. */}
      <BottomBar>{controls()}</BottomBar>
    </div>
  );

  // Fixed positions: the main action is always on the left (Use camera, then Take photo or Use this),
  // Upload photo is always on the right, so nothing jumps between taps.
  function controls() {
    return (
      <div className="grid w-full grid-cols-2 gap-2 [&>*]:px-3">
        <button className="btn btn-solid whitespace-nowrap" onClick={has ? capture : startCamera} type="button">
          {live ? "Take photo" : img ? "Use this" : "Use camera"}
        </button>
        <label className="btn btn-line cursor-pointer whitespace-nowrap focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-ink">
          Upload photo
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </div>
    );
  }
}

// Shows the movement: a head seen from the front, turned (features shift, nose points) with an arrow,
// or tipped forward. Turning is a rotation around the neck, not a sideways tilt.
function GuideIcon({ guide }: { guide: Props["guide"] }) {
  const ink = "#141414";
  if (guide === "down")
    return (
      <svg aria-hidden viewBox="0 0 80 64" className="h-16 w-20" fill="none" stroke={ink} strokeWidth="1.5">
        <ellipse cx="40" cy="34" rx="16" ry="19" />
        <path d="M25 27c5-9 25-9 30 0" />
        <path d="M31 40h3M46 40h3" />
        <path d="M62 16v18m-4-4 4 4 4-4" />
      </svg>
    );
  if (guide === "right" || guide === "left") {
    const d = guide === "right" ? 1 : -1;
    const x = (v: number) => 40 + d * v;
    return (
      <svg aria-hidden viewBox="0 0 80 64" className="h-16 w-20" fill="none" stroke={ink} strokeWidth="1.5">
        <ellipse cx="40" cy="34" rx="15" ry="19" />
        <circle cx={x(2)} cy="31" r="1.4" fill={ink} />
        <circle cx={x(10)} cy="31" r="1.4" fill={ink} />
        <path d={`M${x(8)} 33 L${x(14)} 39 L${x(8)} 40`} />
        <path d={`M${x(3)} 45c${d * 3} 1.5 ${d * 6} 1.5 ${d * 8} 0`} />
        <path d={`M${x(-14)} 30c${-d * 3} 1 ${-d * 3} 7 0 8`} />
        <path d={`M${x(-12)} 9c${d * 8} -5 ${d * 20} -5 ${d * 26} 1`} />
        <path d={`M${x(10)} 6l${d * 4} 4l${-d * 5} 2`} />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 80 64" className="h-16 w-20" fill="none" stroke={ink} strokeWidth="1.5">
      <ellipse cx="40" cy="34" rx="15" ry="19" />
      <circle cx="34" cy="31" r="1.4" fill={ink} />
      <circle cx="46" cy="31" r="1.4" fill={ink} />
      <path d="M40 33v6h-2M35 45c3 2 7 2 10 0" />
    </svg>
  );
}
