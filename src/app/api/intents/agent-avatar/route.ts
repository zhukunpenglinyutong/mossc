import { NextResponse } from "next/server"
import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

const AVATARS_DIR = join(process.cwd(), "public", "avatars")
const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const agentId = formData.get("agentId")
      const file = formData.get("file")

      if (typeof agentId !== "string" || !agentId.trim()) {
        return NextResponse.json({ error: "agentId is required." }, { status: 400 })
      }

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required." }, { status: 400 })
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "Only PNG, JPEG, and WebP images are supported." },
          { status: 400 }
        )
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: "File size must be under 2MB." },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg"
      const filename = `${agentId.trim()}${ext}`

      await mkdir(AVATARS_DIR, { recursive: true })
      await writeFile(join(AVATARS_DIR, filename), buffer)

      const avatarUrl = `/avatars/${filename}?t=${Date.now()}`
      return NextResponse.json({ ok: true, avatarUrl })
    }

    // JSON body — for selecting a preset avatar URL
    const body = await request.json()
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
    }

    const { agentId, avatarUrl } = body as { agentId?: string; avatarUrl?: string }
    if (!agentId || !avatarUrl) {
      return NextResponse.json({ error: "agentId and avatarUrl are required." }, { status: 400 })
    }

    return NextResponse.json({ ok: true, avatarUrl })
  } catch {
    return NextResponse.json({ error: "Failed to process avatar." }, { status: 500 })
  }
}
