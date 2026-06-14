'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Ably from 'ably'
import type { PartyRoomState, PartyMember, PartyPrediction } from '@/lib/partyTypes'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface ConnectionLog {
  ts: string
  msg: string
  type: 'info' | 'ok' | 'error'
}

type AblyMessage =
  | { type: 'member-update'; member: PartyMember }
  | { type: 'request-state'; fromUserId: string }
  | { type: 'state-response'; toUserId: string; members: Record<string, PartyMember> }

function ts() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function addLog(logs: ConnectionLog[], msg: string, type: ConnectionLog['type'] = 'info'): ConnectionLog[] {
  return [...logs.slice(-29), { ts: ts(), msg, type }]
}

export function useAblyGroup(
  code: string | null,
  userId: string,
  name: string,
  predictions: Record<string, PartyPrediction>,
) {
  const [roomState, setRoomState] = useState<PartyRoomState>({ members: {} })
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [logs, setLogs] = useState<ConnectionLog[]>([])

  const clientRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const stateRef = useRef<PartyRoomState>({ members: {} })
  const predictionsRef = useRef(predictions)
  const nameRef = useRef(name)

  useEffect(() => { predictionsRef.current = predictions }, [predictions])
  useEffect(() => { nameRef.current = name }, [name])

  const log = useCallback((msg: string, type: ConnectionLog['type'] = 'info') => {
    setLogs(prev => addLog(prev, msg, type))
  }, [])

  const publishSelf = useCallback(() => {
    const ch = channelRef.current
    if (!ch || !userId) return
    const member: PartyMember = {
      userId,
      name: nameRef.current,
      predictions: predictionsRef.current,
      joinedAt: stateRef.current.members[userId]?.joinedAt ?? new Date().toISOString(),
      online: true,
    }
    stateRef.current.members[userId] = member
    setRoomState({ members: { ...stateRef.current.members } })
    const msg: AblyMessage = { type: 'member-update', member }
    ch.publish('msg', msg)
  }, [userId])

  // Sync predictions when they change while connected
  useEffect(() => {
    if (status !== 'connected' || !userId) return
    publishSelf()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions, status, userId])

  useEffect(() => {
    if (!code || !userId) return

    setStatus('connecting')

    const client = new Ably.Realtime({ authUrl: '/api/ably-token', authMethod: 'GET' })
    clientRef.current = client

    client.connection.on('connected', () => {
      setStatus('connected')
      log('Conectado', 'ok')

      const channel = client.channels.get(`group-${code}`)
      channelRef.current = channel

      channel.subscribe('msg', (ablyMsg) => {
        const data = ablyMsg.data as AblyMessage

        if (data.type === 'member-update') {
          const m = data.member
          stateRef.current.members[m.userId] = m
          setRoomState({ members: { ...stateRef.current.members } })
        }

        if (data.type === 'request-state' && data.fromUserId !== userId) {
          const resp: AblyMessage = {
            type: 'state-response',
            toUserId: data.fromUserId,
            members: stateRef.current.members,
          }
          channel.publish('msg', resp)
        }

        if (data.type === 'state-response' && data.toUserId === userId) {
          for (const [uid, member] of Object.entries(data.members)) {
            if (!stateRef.current.members[uid]) {
              stateRef.current.members[uid] = member
            }
          }
          setRoomState({ members: { ...stateRef.current.members } })
          log(`${Object.keys(data.members).length} membro(s) recebido(s)`, 'ok')
        }
      })

      // Replay last 2 min of channel history to catch up without needing an online peer
      channel.history({ limit: 50 }, (err, page) => {
        if (err || !page) return
        const seen = new Set<string>()
        for (const msg of page.items) {
          const data = msg.data as AblyMessage
          if (data.type === 'member-update') {
            const m = data.member
            if (!seen.has(m.userId)) {
              seen.add(m.userId)
              if (!stateRef.current.members[m.userId]) {
                stateRef.current.members[m.userId] = m
              }
            }
          }
        }
        setRoomState({ members: { ...stateRef.current.members } })
      })

      publishSelf()
      // Ask online peers for their state too
      channel.publish('msg', { type: 'request-state', fromUserId: userId } satisfies AblyMessage)
    })

    client.connection.on('failed', (err) => {
      setStatus('disconnected')
      log(`Falha: ${err?.reason?.message ?? 'erro desconhecido'}`, 'error')
    })

    client.connection.on('disconnected', () => setStatus('disconnected'))
    client.connection.on('suspended', () => setStatus('disconnected'))

    return () => {
      channelRef.current?.unsubscribe()
      channelRef.current = null
      client.close()
      clientRef.current = null
      setStatus('disconnected')
    }
  }, [code, userId, log, publishSelf])

  const rename = useCallback((newName: string) => {
    nameRef.current = newName
    publishSelf()
  }, [publishSelf])

  return { state: roomState, status, logs, rename }
}
