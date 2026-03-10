import { fetchJson } from "@/lib/http";

export const postStudioIntent = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  return await fetchJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};
