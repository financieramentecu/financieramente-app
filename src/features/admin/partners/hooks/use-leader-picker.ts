'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { failure, IDLE, LOADING, success } from '../lib/async-state'
import { partnerApi } from '../lib/partner-api'
import type {
	LeaderLevelOption,
	PartnerLeaderOption,
} from '../types/partner.types'

/**
 * Two-step leader picker: first the leader's level (LEVEL_1..LEVEL_5, with the
 * display names), then the active users of that level. The server validates
 * the leader again on create.
 */
export function useLeaderPicker(initialLevelCode: string | null = null) {
	const [levels, setLevels] = useState<AsyncState<LeaderLevelOption[]>>(LOADING)
	const [leaders, setLeaders] = useState<AsyncState<PartnerLeaderOption[]>>(
		initialLevelCode === null ? IDLE : LOADING
	)
	const [levelCode, setLevelCode] = useState<string | null>(initialLevelCode)

	useEffect(() => {
		let cancelled = false
		partnerApi
			.leaderLevels()
			.then((data) => {
				if (!cancelled) setLevels(success(data))
			})
			.catch((error: unknown) => {
				console.error('Error loading leader levels:', error)
				if (!cancelled) setLevels(failure(error, 'Error al cargar los niveles'))
			})
		return () => {
			cancelled = true
		}
	}, [])

	// The selected level drives the leaders request. The cleanup flags the
	// previous request as stale, so a slow response for an older level can
	// never overwrite the leaders of the current one (also covers unmount and
	// the edit-mode prefill, where the initial level loads on mount).
	useEffect(() => {
		if (levelCode === null) return
		let cancelled = false
		partnerApi
			.leaders(levelCode)
			.then((data) => {
				if (!cancelled) setLeaders(success(data))
			})
			.catch((error: unknown) => {
				console.error('Error loading leaders:', error)
				if (!cancelled)
					setLeaders(failure(error, 'Error al cargar los líderes'))
			})
		return () => {
			cancelled = true
		}
	}, [levelCode])

	function selectLevel(code: string | null) {
		// Same level: the effect would not re-run, so do not park the list on LOADING.
		if (code === levelCode) return
		setLevelCode(code)
		setLeaders(code === null ? IDLE : LOADING)
	}

	return { levels, leaders, levelCode, selectLevel }
}
