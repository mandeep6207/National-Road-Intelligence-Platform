export type AppLanguage = 'en' | 'hi'

export type TranslationDictionary = Record<string, string>

const LANGUAGE_STORAGE_KEY = 'language'
const LEGACY_LANGUAGE_STORAGE_KEY = 'nrip_lang'

const dictionaryCache: Partial<Record<AppLanguage, TranslationDictionary>> = {}

function normalizeLanguage(value: string | null | undefined): AppLanguage {
	return value?.toLowerCase() === 'hi' ? 'hi' : 'en'
}

export function getStoredLanguage(): AppLanguage {
	if (typeof window === 'undefined') return 'en'
	const primary = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
	const legacy = window.localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY)
	return normalizeLanguage(primary || legacy)
}

export function persistLanguage(language: AppLanguage) {
	if (typeof window === 'undefined') return
	window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
	window.localStorage.setItem(LEGACY_LANGUAGE_STORAGE_KEY, language)
}

export async function loadLanguageDictionary(language: AppLanguage): Promise<TranslationDictionary> {
	if (dictionaryCache[language]) return dictionaryCache[language] as TranslationDictionary

	const localePath = `/locales/${language}.json`

	try {
		const response = await fetch(localePath, { cache: 'no-store' })
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} while loading ${localePath}`)
		}

		const data = (await response.json()) as TranslationDictionary
		dictionaryCache[language] = data
		return data
	} catch (error) {
		console.error(`[i18n] Failed to load ${localePath}`, error)

		if (language !== 'en') {
			console.warn('[i18n] Falling back to English translations')
			const english = await loadLanguageDictionary('en')
			dictionaryCache[language] = english
			return english
		}

		return {}
	}
}

export function createPhraseTranslationMap(
	sourceDictionary: TranslationDictionary,
	targetDictionary: TranslationDictionary
) {
	const phraseMap = new Map<string, string>()

	Object.keys(sourceDictionary).forEach((key) => {
		const sourcePhrase = sourceDictionary[key]
		const targetPhrase = targetDictionary[key]
		if (!sourcePhrase || !targetPhrase) return
		const source = sourcePhrase.trim()
		if (!source || source === targetPhrase.trim()) return
		phraseMap.set(source, targetPhrase.trim())
	})

	return phraseMap
}

export function translateTextByPhrase(text: string, phraseMap: Map<string, string>) {
	if (!text.trim()) return text

	const leadingWhitespace = text.match(/^\s*/)?.[0] || ''
	const trailingWhitespace = text.match(/\s*$/)?.[0] || ''
	const core = text.trim()
	const translated = phraseMap.get(core)
	if (!translated) return text
	return `${leadingWhitespace}${translated}${trailingWhitespace}`
}
