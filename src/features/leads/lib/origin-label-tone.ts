const ORIGIN_LABEL_TONES = [
	'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
	'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
	'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
	'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
	'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
	'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
	'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
	'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200',
	'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
	'bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-200',
] as const

/** Same origin name always maps to the same chip color. */
export function originLabelTone(origin: string): string {
	let hash = 0
	for (const char of origin.trim().toLowerCase()) {
		hash = (hash * 33 + char.charCodeAt(0)) >>> 0
	}
	return ORIGIN_LABEL_TONES[hash % ORIGIN_LABEL_TONES.length] ?? ORIGIN_LABEL_TONES[0]
}
