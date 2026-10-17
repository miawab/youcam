// On-device photo check with MediaPipe Face Landmarker: head angle and face size, per photo, before
// anything is sent to YouCam. Nothing leaves the phone and no units are spent.
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

const VERSION = "0.10.21";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let loading: Promise<FaceLandmarker> | null = null;

export function loadChecker() {
  loading ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(WASM);
    return FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL },
      runningMode: "IMAGE",
      numFaces: 2,
      outputFacialTransformationMatrixes: true,
    });
  })();
  loading.catch(() => (loading = null));
  return loading;
}

export type Pose = { faces: number; yaw: number; pitch: number; roll: number; width: number };

// Degrees. yaw > 0: the nose points to the right side of the image (the sample set YouCam accepted reads
// front +2°, "right" +40°, "left" -40°, front pitch 14°). width: face mesh width as a share of the image.
export async function measure(blob: Blob): Promise<Pose | null> {
  let lm: FaceLandmarker;
  try {
    lm = await loadChecker();
  } catch {
    return null; // checker unavailable (offline, old browser): skip the check rather than block
  }
  const bmp = await createImageBitmap(blob);
  const r = lm.detect(bmp);
  bmp.close();
  const faces = r.faceLandmarks.length;
  if (faces === 0) return { faces, yaw: 0, pitch: 0, roll: 0, width: 0 };
  const pts = r.faceLandmarks[0];
  const xs = pts.map((p) => p.x);
  const width = Math.max(...xs) - Math.min(...xs);
  // Column-major 4x4; the rotation part gives the head pose.
  const m = r.facialTransformationMatrixes[0].data;
  const deg = (x: number) => (x * 180) / Math.PI;
  const yaw = deg(Math.asin(Math.max(-1, Math.min(1, m[8]))));
  const pitch = deg(Math.atan2(-m[9], m[10]));
  const roll = deg(Math.atan2(-m[4], m[0]));
  return { faces, yaw, pitch, roll, width };
}

export type Slot = "front" | "right" | "left" | "down";

// YouCam's rules: front within 10° of straight, sides turned more than 15° (we ask for 20°+ to be safe),
// face 50-80% of the image width. Returns a message the customer can act on, or null if it's fine.
export function problem(slot: Slot, p: Pose | null, other?: Pose | null): string | null {
  if (!p || slot === "down") return null;
  if (p.faces === 0) return "We can't find your face in this one. Fill the oval and face the light.";
  if (p.faces > 1) return "There's more than one face in this photo. Just you, please.";
  // Side views measure narrower than the front, so they get a lower floor.
  if (p.width < (slot === "front" ? 0.42 : 0.24)) return "Move closer. Your face should fill the oval.";
  if (p.width > 0.9) return "Move back a little. Your whole face and the top of your hair should be in the frame.";
  if (slot === "front") {
    if (Math.abs(p.yaw) > 9) return "Look straight at the camera. Your head is turned a little.";
    if (Math.abs(p.roll) > 9) return "Keep your head level. It's tilted to one side.";
    if (Math.abs(p.pitch) > 22) return "Keep your chin level, not up or down.";
    return null;
  }
  if (Math.abs(p.yaw) < 18) return "Turn your head further, about 45°, like you're shaking your head 'no'.";
  if (Math.abs(p.roll) > 15) return "Turn your head, don't tilt it. Keep it level.";
  if (other && Math.sign(other.yaw) === Math.sign(p.yaw) && Math.abs(other.yaw) >= 18)
    return "This is turned the same way as your other side photo. Turn the other way.";
  return null;
}
