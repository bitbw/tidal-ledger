import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { confirmImport, type ImportCandidate, type ImportSource } from "@/features/importers/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { source?: ImportSource; filename?: string; rows?: ImportCandidate[] };
  if (!body.source || !Array.isArray(body.rows) || typeof body.filename !== "string") return NextResponse.json({ error: "Invalid import request" }, { status: 400 });
  try { return NextResponse.json(await confirmImport(session.user.id, { source: body.source, filename: body.filename, rows: body.rows })); }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "导入失败。" }, { status: 400 }); }
}
