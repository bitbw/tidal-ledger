import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { checkImportRows, type ImportCandidate, type ImportSource } from "@/features/importers/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { source?: ImportSource; rows?: ImportCandidate[] };
  if (!body.source || !Array.isArray(body.rows) || body.rows.length > 500) return NextResponse.json({ error: "Invalid import rows" }, { status: 400 });
  try { return NextResponse.json({ rows: await checkImportRows(session.user.id, body.source, body.rows) }); }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "重复预检失败。" }, { status: 400 }); }
}
