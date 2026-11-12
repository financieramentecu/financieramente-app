export interface StageChangeEvent {
	fromColumnName: string | null
	toColumnName: string
	changedAt: Date
}

export interface StageStay {
	columnName: string
	enteredAt: Date
	leftAt: Date | null
	durationMs: number
	current: boolean
}

export interface BuildStageStaysInput {
	createdAt: Date
	currentColumnName: string
	events: StageChangeEvent[]
	now: Date
}

/**
 * Turns append-only stage changes into the stays a lead spent in each column.
 * An empty history is a single open stay in the current column since the lead
 * was created. The first change closes a prior stay only when it names the
 * column the lead left and that moment is after creation.
 */
export function buildStageStays(input: BuildStageStaysInput): StageStay[] {
	const events = input.events.toSorted(
		(left, right) => left.changedAt.getTime() - right.changedAt.getTime()
	)
	if (events.length === 0) {
		return [openStay(input.currentColumnName, input.createdAt, input.now)]
	}

	const stays: StageStay[] = []
	const first = events[0]
	if (
		first.fromColumnName &&
		input.createdAt.getTime() < first.changedAt.getTime()
	) {
		stays.push(
			closedStay(first.fromColumnName, input.createdAt, first.changedAt)
		)
	}

	for (let index = 0; index < events.length; index += 1) {
		const event = events[index]
		const next = events[index + 1]
		if (next) {
			stays.push(
				closedStay(event.toColumnName, event.changedAt, next.changedAt)
			)
		} else {
			stays.push(openStay(event.toColumnName, event.changedAt, input.now))
		}
	}

	return stays
}

function closedStay(
	columnName: string,
	enteredAt: Date,
	leftAt: Date
): StageStay {
	return {
		columnName,
		enteredAt,
		leftAt,
		durationMs: elapsedMs(enteredAt, leftAt),
		current: false,
	}
}

function openStay(columnName: string, enteredAt: Date, now: Date): StageStay {
	return {
		columnName,
		enteredAt,
		leftAt: null,
		durationMs: elapsedMs(enteredAt, now),
		current: true,
	}
}

function elapsedMs(from: Date, to: Date): number {
	return Math.max(0, to.getTime() - from.getTime())
}
