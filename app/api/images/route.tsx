import { NextRequest, NextResponse } from "next/server";

export default function GET(req: NextRequest) {
  return NextResponse.json({ message: "Hello, world!" });
}
