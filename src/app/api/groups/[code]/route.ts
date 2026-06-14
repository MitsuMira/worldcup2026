import { NextResponse } from 'next/server'
import Ably from 'ably'

export const dynamic = 'force-dynamic'

// Check if a group exists by looking for a 'group-created' message in channel history
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const apiKey = process.env.ABLY_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'misconfigured' }, { status: 500 })

  const rest = new Ably.Rest(apiKey)
  try {
    const channel = rest.channels.get(`group-${code}`)
    const page = await channel.history({ limit: 100, direction: 'backwards' })
    const created = page.items.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m.name === 'group-created'
    )
    if (created) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return NextResponse.json({ exists: true, label: (created.data as any)?.label ?? code })
    }
    return NextResponse.json({ exists: false })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
