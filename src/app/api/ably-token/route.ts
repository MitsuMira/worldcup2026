import { NextResponse } from 'next/server'
import Ably from 'ably'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const apiKey = process.env.ABLY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ABLY_API_KEY not configured' }, { status: 500 })
  }
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId') ?? 'anon'
  const client = new Ably.Rest(apiKey)
  const tokenRequest = await client.auth.createTokenRequest({
    clientId,
    capability: { 'group-*': ['subscribe', 'publish', 'history', 'presence'] },
  })
  return NextResponse.json(tokenRequest)
}
