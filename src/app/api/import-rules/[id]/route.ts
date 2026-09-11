import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { deleteImportRule, updateImportRule, type ImportRuleInput } from "@/features/importers/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rule = await updateImportRule(session.user.id, (await params).id, await request.json() as ImportRuleInput);
    return rule ? NextResponse.json(rule) : NextResponse.json({ error: "Rule not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新规则失败。" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rule = await deleteImportRule(session.user.id, (await params).id);
  return rule ? NextResponse.json(rule) : NextResponse.json({ error: "Rule not found" }, { status: 404 });
}
