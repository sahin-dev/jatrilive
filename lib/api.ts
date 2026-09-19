import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (message === "FORBIDDEN") return NextResponse.json({ error: "You do not have permission to do that." }, { status: 403 });
  if (message === "NO_POINTS") return NextResponse.json({ error: "You need at least 1 point to start watching." }, { status: 402 });
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}
