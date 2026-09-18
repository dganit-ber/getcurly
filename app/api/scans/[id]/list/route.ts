import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { clientIpHash } from "@/lib/ipHash";
import { allowWrite } from "@/lib/writeGuard";
import { reviseScan, type ScanEdit } from "@/lib/scanEdits";

export const runtime = "nodejs";

const fail = (reason: string, status: number) =>
  NextResponse.json({ ok: false, reason }, { status });

/** Long enough for any real INCI name, short enough not to be a paste target. */
const MAX_TEXT = 120;

const cleanText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > 0 && text.length <= MAX_TEXT ? text : null;
};

const cleanPos = (value: unknown): number | null =>
  Number.isInteger(value) && (value as number) > 0 ? (value as number) : null;

/**
 * She corrected the list and asked for the verdict again.
 *
 * The edits arrive from the client, so nothing here trusts what they say an
 * ingredient *is* — only what she typed. The category that decides the verdict
 * comes back from `match_ingredient` in the database, never from the request.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return fail("bad_scan_id", 400);
  const scanId = Number(id);

  let ipHash: string;
  try {
    ipHash = clientIpHash(req);
  } catch {
    return fail("server_misconfigured", 500);
  }

  const body = await req.json().catch(() => null);
  if (!body) return fail("bad_body", 400);

  const edits: ScanEdit[] = [];
  for (const raw of Array.isArray(body.edits) ? body.edits : []) {
    const pos = cleanPos(raw?.pos);
    const text = cleanText(raw?.text);
    if (pos === null || text === null) return fail("bad_edit", 400);
    edits.push({ pos, text });
  }

  const removed: number[] = [];
  for (const raw of Array.isArray(body.removed) ? body.removed : []) {
    const pos = cleanPos(raw);
    if (pos === null) return fail("bad_removal", 400);
    removed.push(pos);
  }

  const added: string[] = [];
  for (const raw of Array.isArray(body.added) ? body.added : []) {
    const text = cleanText(raw);
    if (text === null) return fail("bad_addition", 400);
    added.push(text);
  }

  // Nothing changed — the button that sent this should have been disabled, so
  // this is a bug or a replay either way. Don't fork a scan for it.
  if (edits.length === 0 && removed.length === 0 && added.length === 0) {
    return fail("no_changes", 400);
  }

  const supabase = createServerSupabaseClient();

  const allowed = await allowWrite(supabase, ipHash, "edit_list");
  if (allowed === null) return fail("server_error", 500);
  if (!allowed) return fail("rate_limited", 429);

  const revised = await reviseScan(supabase, { scanId, ipHash, edits, removed, added });
  if (!revised) return fail("server_error", 500);

  return NextResponse.json({ ok: true, ...revised });
}
