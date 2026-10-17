"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Output matches YouCam's framing rules: 4:5, face oval = 60% of the width (they ask for 50-80%).
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
        className="relative mx-auto aspect-[4/5] w-full max-w-[380px] overflow-hidden bg-tile touch-none select-none"
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
        {/* Oval guide: 60% of the width */}
        <svg aria-hidden viewBox="0 0 100 125" className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <mask id={`m-${guide}`}>
              <rect width="100" height="125" fill="white" />
              <ellipse cx="50" cy="56" rx="30" ry="39" fill="black" />
            </mask>
          </defs>
          <rect width="100" height="125" fill="rgba(255,255,255,0.55)" mask={`url(#m-${guide})`} />
          <ellipse cx="50" cy="56" rx="30" ry="39" fill="none" stroke="#141414" strokeWidth="0.5" strokeDasharray="2 1.5" />
        </svg>
        {has && <div className="label absolute left-3 top-3 bg-paper px-2 py-1">{hint}</div>}
      </div>

      {img && (
        <label className="mx-auto mt-3 flex max-w-[380px] items-center gap-3 text-sm text-muted">
          Zoom
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[#141414]" />
        </label>
      )}
      {img && <p className="mt-1 text-center text-sm text-muted">Drag and zoom until your face fills the oval.</p>}

      <div className="mx-auto mt-4 flex max-w-[380px] gap-2 [&>*]:flex-1 [&>*]:px-3">
        {!live && (
          <button className="btn btn-line" onClick={startCamera} type="button">
            Use camera
          </button>
        )}
        <label className="btn btn-line focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-ink">
          Upload photo
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {has && (
          <button className="btn btn-solid" onClick={capture} type="button">
            {live ? "Take photo" : "Use this"}
          </button>
        )}
      </div>
    </div>
  );
}

function GuideIcon({ guide }: { guide: Props["guide"] }) {
  const rot = guide === "right" ? -35 : guide === "left" ? 35 : 0;
  return (
    <svg aria-hidden viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="#141414" strokeWidth="1.5">
      <g transform={guide === "down" ? "translate(0 6) rotate(0)" : `rotate(${rot} 32 32)`}>
        <ellipse cx="32" cy="32" rx="16" ry="20" />
        {guide === "down" ? (
          <path d="M18 26c4-8 24-8 28 0" />
        ) : (
          <>
            <circle cx="26" cy="30" r="1.5" fill="#141414" />
            <circle cx="38" cy="30" r="1.5" fill="#141414" />
            <path d="M27 40c3 2 7 2 10 0" />
          </>
        )}
      </g>
    </svg>
  );
}
