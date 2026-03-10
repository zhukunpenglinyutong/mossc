import { parseIntentBody, executeGatewayIntent } from "@/lib/controlplane/intent-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseIntentBody(request);
  if (parsed instanceof Response) return parsed;

  const key = typeof parsed.key === "string" ? parsed.key.trim() : "";
  if (!key) {
    return Response.json({ error: "key is required." }, { status: 400 });
  }

  return executeGatewayIntent("sessions.reset", { key });
}
