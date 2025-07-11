import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "API route is working correctly" });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "POST request received successfully" });
}
