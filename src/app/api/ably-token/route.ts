import { NextResponse } from 'next/server'
import Ably from 'ably'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.ABLY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ABLY_API_KEY not configured' }, { status: 500 })
  }
  const client = new Ably.Rest(apiKey)
  const tokenRequest = await client.auth.createTokenRequest({
    capability: { 'group-*': ['subscribe', 'publish', 'history'] },
  })
  return NextResponse.json(tokenRequest)
}
