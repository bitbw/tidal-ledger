import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { archiveLedgerCategory, updateLedgerCategory } from "@/features/ledger/server";

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { name?: string; kind?: "expense" | "income"; parentId?: string | null; icon?: string | null; color?: string };
  if (!body.name || (body.kind !== "expense" && body.kind !== "income")) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  try {
    const category = await updateLedgerCategory(user.id, (await params).id, {
      name: body.name,
      kind: body.kind,
      parentId: body.parentId,
      icon: body.icon,
      color: body.color,
    });
    return category ? NextResponse.json(category) : NextResponse.json({ error: "Category not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新分类失败。" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const category = await archiveLedgerCategory(user.id, (await params).id);
    return category ? NextResponse.json(category) : NextResponse.json({ error: "Category not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "归档分类失败。" }, { status: 400 });
  }
}
