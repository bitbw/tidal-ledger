import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { createLedgerCategory, getLedger } from "@/features/ledger/server";

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ledger = await getLedger(user.id);
  return NextResponse.json(ledger.categories);
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { name?: string; kind?: "expense" | "income"; parentId?: string | null; icon?: string | null; color?: string };
  if (!body.name || (body.kind !== "expense" && body.kind !== "income")) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  try {
    return NextResponse.json(await createLedgerCategory(user.id, {
      name: body.name,
      kind: body.kind,
      parentId: body.parentId,
      icon: body.icon,
      color: body.color,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建分类失败。" }, { status: 400 });
  }
}
