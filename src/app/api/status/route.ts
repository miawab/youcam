import { liveAllowed } from "@/lib/youcam";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await liveAllowed());
}
