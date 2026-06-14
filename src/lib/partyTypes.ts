// Re-export party types for client-side use (can't import from party/ directly in Next.js)

export interface PartyPrediction {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  homeTeamFlag: string
  awayTeamFlag: string
  homeScore: number
  awayScore: number
  createdAt: string
}

export interface PartyMember {
  userId: string
  name: string
  predictions: Record<string, PartyPrediction>
  joinedAt: string
  online: boolean
}

export interface PartyRoomState {
  members: Record<string, PartyMember>
}

export type PartyClientMessage =
  | { type: 'join'; userId: string; name: string; predictions: Record<string, PartyPrediction> }
  | { type: 'predictions'; userId: string; predictions: Record<string, PartyPrediction> }
  | { type: 'rename'; userId: string; name: string }

export type PartyServerMessage =
  | { type: 'state'; state: PartyRoomState }

export const PARTY_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? ''
