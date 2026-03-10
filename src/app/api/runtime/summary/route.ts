import { NextResponse } from "next/server";

import { deriveRuntimeFreshness, probeOpenClawVersion } from "@/lib/controlplane/degraded-read";
import { serializeRuntimeInitFailure } from "@/lib/controlplane/runtime-init-errors";
import { bootstrapDomainRuntime } from "@/lib/controlplane/runtime-route-bootstrap";

export const runtime = "nodejs";

export async function GET() {
  const [bootstrap, version] = await Promise.all([
    bootstrapDomainRuntime(),
    probeOpenClawVersion(),
  ]);
  if (bootstrap.kind === "mode-disabled") {
    return NextResponse.json({ enabled: false, error: "domain_api_mode_disabled", version }, { status: 404 });
  }
  if (bootstrap.kind === "runtime-init-failed") {
    return NextResponse.json(
      {
        enabled: true,
        version,
        ...serializeRuntimeInitFailure(bootstrap.failure),
      },
      { status: 503 }
    );
  }
  const controlPlane = bootstrap.runtime;
  const startError = bootstrap.kind === "start-failed" ? bootstrap.message : null;

  const snapshot = controlPlane.snapshot();
  return NextResponse.json({
    enabled: true,
    version,
    ...(startError ? { error: startError } : {}),
    summary: snapshot,
    freshness: deriveRuntimeFreshness(snapshot, null),
  });
}
