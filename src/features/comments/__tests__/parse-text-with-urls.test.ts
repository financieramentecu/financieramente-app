import { describe, it, expect } from 'vitest'
import { parseTextWithUrls } from '../lib/parse-text-with-urls'

describe('parseTextWithUrls', () => {
	it('returns empty array for empty string', () => {
		expect(parseTextWithUrls('')).toEqual([])
	})

	it('keeps plain text without urls intact', () => {
		expect(parseTextWithUrls('Hola mundo')).toEqual([
			{ type: 'text', value: 'Hola mundo' },
		])
	})

	it('parses an https URL as a link segment', () => {
		expect(parseTextWithUrls('https://example.com/doc')).toEqual([
			{
				type: 'url',
				value: 'https://example.com/doc',
				href: 'https://example.com/doc',
			},
		])
	})

	it('parses an http URL as a link segment', () => {
		expect(parseTextWithUrls('http://example.com')).toEqual([
			{
				type: 'url',
				value: 'http://example.com',
				href: 'http://example.com',
			},
		])
	})

	it('parses www. URLs with https href', () => {
		expect(parseTextWithUrls('www.example.com/path')).toEqual([
			{
				type: 'url',
				value: 'www.example.com/path',
				href: 'https://www.example.com/path',
			},
		])
	})

	it('keeps surrounding plain text and linkifies only URLs (CA3)', () => {
		const text =
			'Revisar este doc: https://docs.example.com/a y también este www.example.com/b'
		expect(parseTextWithUrls(text)).toEqual([
			{ type: 'text', value: 'Revisar este doc: ' },
			{
				type: 'url',
				value: 'https://docs.example.com/a',
				href: 'https://docs.example.com/a',
			},
			{ type: 'text', value: ' y también este ' },
			{
				type: 'url',
				value: 'www.example.com/b',
				href: 'https://www.example.com/b',
			},
		])
	})

	it('keeps trailing punctuation outside the url', () => {
		expect(parseTextWithUrls('Ver https://example.com.')).toEqual([
			{ type: 'text', value: 'Ver ' },
			{
				type: 'url',
				value: 'https://example.com',
				href: 'https://example.com',
			},
			{ type: 'text', value: '.' },
		])
	})

	it('does not treat bare domains without www/http as urls', () => {
		expect(parseTextWithUrls('mira example.com por favor')).toEqual([
			{ type: 'text', value: 'mira example.com por favor' },
		])
	})
})
