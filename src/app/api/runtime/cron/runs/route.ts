import { executeRuntimeGatewayRead } from "@/lib/controlplane/runtime-read-route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId") ?? undefined;
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");

  const params: Record<string, unknown> = {};
  if (jobId) {
    params.id = jobId;
    params.scope = "job";
  }
  if (limit) params.limit = Number(limit);
  if (offset) params.offset = Number(offset);

  return await executeRuntimeGatewayRead("cron.runs", params);
}
