'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Ably from 'ably'
import type { PartyRoomState, PartyMember, PartyPrediction } from '@/lib/partyTypes'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export function useAblyGroup(
  code: string | null,
  userId: string,
  name: string,
  predictions: Record<string, PartyPrediction>,
) {
  const [roomState, setRoomState] = useState<PartyRoomState>({ members: {} })
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  const clientRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const stateRef = useRef<Record<string, PartyMember>>({})
  const predictionsRef = useRef(predictions)
  const nameRef = useRef(name)

  useEffect(() => { predictionsRef.current = predictions }, [predictions])
  useEffect(() => { nameRef.current = name }, [name])

  const presenceData = useCallback((): PartyMember => ({
    userId,
    name: nameRef.current,
    predictions: predictionsRef.current,
    joinedAt: stateRef.current[userId]?.joinedAt ?? new Date().toISOString(),
    online: true,
  }), [userId])

  const updatePresence = useCallback(() => {
    channelRef.current?.presence.update(presenceData())
  }, [presenceData])

  // Push prediction updates while connected
  useEffect(() => {
    if (status !== 'connected' || !userId) return
    updatePresence()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions, status, userId])

  useEffect(() => {
    if (!code || !userId) return

    setStatus('connecting')

    const client = new Ably.Realtime({
      authUrl: `/api/ably-token?clientId=${encodeURIComponent(userId)}`,
      authMethod: 'GET',
      clientId: userId,
    })
    clientRef.current = client

    const applyMember = (member: PartyMember, online: boolean) => {
      stateRef.current[member.userId] = { ...member, online }
      setRoomState({ members: { ...stateRef.current } })
    }

    client.connection.on('connected', () => {
      setStatus('connected')

      const channel = client.channels.get(`group-${code}`)
      channelRef.current = channel

      // Subscribe to presence events
      channel.presence.subscribe('enter', (msg) => {
        applyMember(msg.data as PartyMember, true)
      })
      channel.presence.subscribe('update', (msg) => {
        applyMember(msg.data as PartyMember, true)
      })
      channel.presence.subscribe('leave', (msg) => {
        const m = stateRef.current[msg.clientId]
        if (m) applyMember({ ...m }, false)
      })

      // Announce ourselves
      channel.presence.enter(presenceData())

      // Get everyone already in the room
      channel.presence.get().then(members => {
        for (const m of members) {
          applyMember(m.data as PartyMember, true)
        }
        setRoomState({ members: { ...stateRef.current } })
      }).catch(() => {})
    })

    client.connection.on('disconnected', () => setStatus('disconnected'))
    client.connection.on('suspended', () => setStatus('disconnected'))
    client.connection.on('failed', () => setStatus('disconnected'))

    return () => {
      channelRef.current?.presence.leave()
      channelRef.current?.unsubscribe()
      channelRef.current = null
      client.close()
      clientRef.current = null
      stateRef.current = {}
      setStatus('disconnected')
    }
  }, [code, userId, presenceData])

  const rename = useCallback((newName: string) => {
    nameRef.current = newName
    updatePresence()
  }, [updatePresence])

  return { state: roomState, status, rename }
}
