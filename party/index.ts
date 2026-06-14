import type * as Party from 'partykit/server'

export interface Prediction {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  homeTeamFlag: string
  awayTeamFlag: string
  homeScore: number
  awayScore: number
  createdAt: string
}

export interface Member {
  userId: string
  name: string
  predictions: Record<string, Prediction>
  joinedAt: string
  online: boolean
}

export interface RoomState {
  members: Record<string, Member>
}

export type ClientMessage =
  | { type: 'join'; userId: string; name: string; predictions: Record<string, Prediction> }
  | { type: 'predictions'; userId: string; predictions: Record<string, Prediction> }
  | { type: 'rename'; userId: string; name: string }

export type ServerMessage =
  | { type: 'state'; state: RoomState }

const STORAGE_KEY = 'room_state'

export default class GroupServer implements Party.Server {
  constructor(readonly party: Party.Party) {}

  async onConnect(conn: Party.Connection) {
    const raw = await this.party.storage.get<RoomState>(STORAGE_KEY)
    const state: RoomState = raw ?? { members: {} }
    conn.send(JSON.stringify({ type: 'state', state } satisfies ServerMessage))
  }

  async onMessage(message: string, conn: Party.Connection) {
    const msg = JSON.parse(message) as ClientMessage
    const raw = await this.party.storage.get<RoomState>(STORAGE_KEY)
    const state: RoomState = raw ?? { members: {} }

    if (msg.type === 'join') {
      state.members[msg.userId] = {
        userId: msg.userId,
        name: msg.name,
        predictions: msg.predictions,
        joinedAt: state.members[msg.userId]?.joinedAt ?? new Date().toISOString(),
        online: true,
      }
    } else if (msg.type === 'predictions') {
      if (state.members[msg.userId]) {
        state.members[msg.userId].predictions = msg.predictions
      }
    } else if (msg.type === 'rename') {
      if (state.members[msg.userId]) {
        state.members[msg.userId].name = msg.name
      }
    }

    await this.party.storage.put(STORAGE_KEY, state)
    this.party.broadcast(JSON.stringify({ type: 'state', state } satisfies ServerMessage))
  }

  async onClose(conn: Party.Connection) {
    // Mark offline but keep data — state persists in storage
    void conn
  }
}

GroupServer satisfies Party.Worker
