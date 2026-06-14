'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Ably from 'ably'
import type { PartyRoomState, PartyMember, PartyPrediction } from '@/lib/partyTypes'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface MemberUpdate extends PartyMember {
  groupLabel?: string
}

export function useAblyGroup(
  code: string | null,
  userId: string,
  name: string,
  predictions: Record<string, PartyPrediction>,
  groupLabel?: string,
) {
  const [roomState, setRoomState] = useState<PartyRoomState>({ members: {} })
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  const clientRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const stateRef = useRef<Record<string, PartyMember>>({})
  const predictionsRef = useRef(predictions)
  const nameRef = useRef(name)
  const groupLabelRef = useRef(groupLabel)

  useEffect(() => { predictionsRef.current = predictions }, [predictions])
  useEffect(() => { nameRef.current = name }, [name])
  useEffect(() => { groupLabelRef.current = groupLabel }, [groupLabel])

  const makeMemberData = useCallback((): MemberUpdate => ({
    userId,
    name: nameRef.current,
    predictions: predictionsRef.current,
    joinedAt: stateRef.current[userId]?.joinedAt ?? new Date().toISOString(),
    online: true,
    groupLabel: groupLabelRef.current,
  }), [userId])

  const publishSelf = useCallback(() => {
    channelRef.current?.publish('member-update', makeMemberData())
  }, [makeMemberData])

  // Push updated predictions while connected
  useEffect(() => {
    if (status !== 'connected' || !userId) return
    publishSelf()
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

    client.connection.on('connected', () => {
      setStatus('connected')

      const channel = client.channels.get(`group-${code}`)
      channelRef.current = channel

      // When someone new joins, they broadcast a ping — everyone responds with their data
      channel.subscribe('who-is-here', msg => {
        // Don't respond to our own ping
        if (msg.data?.userId === userId) return
        publishSelf()
      })

      channel.subscribe('member-update', msg => {
        const data = msg.data as MemberUpdate
        if (!data?.userId) return
        stateRef.current[data.userId] = { ...data, online: true }
        setRoomState({ members: { ...stateRef.current } })
      })

      // Publish our presence, then ping everyone else to respond
      publishSelf()
      channel.publish('who-is-here', { userId })
    })

    client.connection.on('disconnected', () => setStatus('disconnected'))
    client.connection.on('suspended', () => setStatus('disconnected'))
    client.connection.on('failed', () => setStatus('disconnected'))

    return () => {
      channelRef.current?.unsubscribe()
      channelRef.current = null
      client.close()
      clientRef.current = null
      stateRef.current = {}
      setStatus('disconnected')
    }
  }, [code, userId, publishSelf])

  const rename = useCallback((newName: string) => {
    nameRef.current = newName
    publishSelf()
  }, [publishSelf])

  return { state: roomState, status, rename }
}
