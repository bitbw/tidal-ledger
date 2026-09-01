import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { createImportRule, listImportRules, type ImportRuleInput } from "@/features/importers/server";

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listImportRules(user.id));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await createImportRule(user.id, await request.json() as ImportRuleInput));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建规则失败。" }, { status: 400 });
  }
}
