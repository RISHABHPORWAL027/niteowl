import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    '';

  return NextResponse.json({
    apiKey,
    configured: Boolean(apiKey && apiKey.length > 5),
  });
}
