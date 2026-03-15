'use client'

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import {
	createPhraseTranslationMap,
	getStoredLanguage,
	loadLanguageDictionary,
	persistLanguage,
	translateTextByPhrase,
	type AppLanguage,
	type TranslationDictionary,
} from '@/lib/i18n'

interface I18nContextValue {
	language: AppLanguage
	setLanguage: (language: AppLanguage) => void
	toggleLanguage: () => void
	t: (key: string, fallback?: string) => string
	ready: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

function shouldIgnoreTextNode(node: Text) {
	const parent = node.parentElement
	if (!parent) return true
	const tag = parent.tagName
	if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') return true
	if (parent.closest('[data-i18n]')) return true
	if (parent.isContentEditable) return true
	return !node.nodeValue?.trim()
}

export default function I18nProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const [language, setLanguageState] = useState<AppLanguage>('en')
	const [ready, setReady] = useState(false)
	const [englishDictionary, setEnglishDictionary] = useState<TranslationDictionary>({})
	const [activeDictionary, setActiveDictionary] = useState<TranslationDictionary>({})
	const phraseMapRef = useRef<Map<string, string>>(new Map())
	const originalTextRef = useRef<WeakMap<Text, string>>(new WeakMap())

	const setLanguage = useCallback((nextLanguage: AppLanguage) => {
		persistLanguage(nextLanguage)
		setLanguageState(nextLanguage)
	}, [])

	const toggleLanguage = useCallback(() => {
		setLanguage(language === 'en' ? 'hi' : 'en')
	}, [language, setLanguage])

	const applyTranslations = useCallback((rootNode: Node = document.body) => {
		const phraseMap = phraseMapRef.current
		const english = englishDictionary
		const active = activeDictionary

		if (!rootNode) return

		const applyElementTranslation = (element: HTMLElement) => {
			const key = element.dataset.i18n
			if (key) {
				const text = (language === 'en' ? english[key] : active[key]) || english[key] || active[key]
				if (text && element.textContent !== text) {
					element.textContent = text
				}
			}

			const placeholderKey = element.dataset.i18nPlaceholder
			if (placeholderKey && 'placeholder' in element) {
				const text = (language === 'en' ? english[placeholderKey] : active[placeholderKey]) || english[placeholderKey] || active[placeholderKey]
				if (text) {
					const input = element as HTMLInputElement | HTMLTextAreaElement
					if (input.placeholder !== text) {
						input.placeholder = text
					}
				}
			}

			const titleKey = element.dataset.i18nTitle
			if (titleKey) {
				const text = (language === 'en' ? english[titleKey] : active[titleKey]) || english[titleKey] || active[titleKey]
				if (text && element.title !== text) {
					element.title = text
				}
			}
		}

		if (rootNode instanceof Element) {
			if (rootNode instanceof HTMLElement) {
				applyElementTranslation(rootNode)
			}

			rootNode.querySelectorAll<HTMLElement>('[data-i18n], [data-i18n-placeholder], [data-i18n-title]').forEach((element) => {
				applyElementTranslation(element)
			})
		}

		const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT)
		const textNodes: Text[] = []

		let current = walker.nextNode()
		while (current) {
			textNodes.push(current as Text)
			current = walker.nextNode()
		}

		textNodes.forEach((textNode) => {
			if (shouldIgnoreTextNode(textNode)) return

			if (!originalTextRef.current.has(textNode)) {
				originalTextRef.current.set(textNode, textNode.nodeValue || '')
			}

			const originalValue = originalTextRef.current.get(textNode) || ''
			const nextValue = language === 'en'
				? originalValue
				: translateTextByPhrase(originalValue, phraseMap)

			if (textNode.nodeValue !== nextValue) {
				textNode.nodeValue = nextValue
			}
		})
	}, [activeDictionary, englishDictionary, language])

	useEffect(() => {
		setLanguageState(getStoredLanguage())
	}, [pathname])

	useEffect(() => {
		let cancelled = false

		const run = async () => {
			try {
				const [english, target] = await Promise.all([
					loadLanguageDictionary('en'),
					loadLanguageDictionary(language),
				])

				if (cancelled) return

				const safeEnglish = english || {}
				const safeTarget = target || safeEnglish

				setEnglishDictionary(safeEnglish)
				setActiveDictionary(safeTarget)
				phraseMapRef.current = createPhraseTranslationMap(english, target)
				persistLanguage(language)
				document.documentElement.lang = language
				setReady(true)
			} catch (error) {
				console.error('[i18n] Failed to initialize language runtime. Falling back to English.', error)
				if (cancelled) return
				setLanguageState('en')
				persistLanguage('en')
				setReady(true)
			}
		}

		run()
		return () => {
			cancelled = true
		}
	}, [language])

	useEffect(() => {
		if (!ready) return
		applyTranslations(document.body)
	}, [applyTranslations, pathname, ready])

	useEffect(() => {
		if (!ready) return

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach((node) => applyTranslations(node))
				}
				if (mutation.type === 'characterData' && mutation.target.parentElement) {
					applyTranslations(mutation.target.parentElement)
				}
			})
		})

		observer.observe(document.body, {
			subtree: true,
			childList: true,
			characterData: true,
		})

		return () => observer.disconnect()
	}, [applyTranslations, ready])

	const contextValue = useMemo<I18nContextValue>(() => ({
		language,
		setLanguage,
		toggleLanguage,
		t: (key: string, fallback?: string) => {
			return (language === 'en' ? englishDictionary[key] : activeDictionary[key])
				|| englishDictionary[key]
				|| activeDictionary[key]
				|| fallback
				|| key
		},
		ready,
	}), [activeDictionary, englishDictionary, language, ready, setLanguage, toggleLanguage])

	return (
		<I18nContext.Provider value={contextValue}>
			{children}
			<div className="pointer-events-auto fixed bottom-[20px] right-[20px] z-[1000]">
				<button
					type="button"
					onClick={toggleLanguage}
					className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
					aria-label={language === 'en' ? 'Switch language to Hindi' : 'Switch language to English'}
					title={language === 'en' ? 'Switch language to Hindi' : 'Switch language to English'}
				>
					<span>{language === 'en' ? 'EN | हिन्दी' : 'हिन्दी | EN'}</span>
				</button>
			</div>
		</I18nContext.Provider>
	)
}

export function useI18n() {
	const context = useContext(I18nContext)
	if (!context) {
		throw new Error('useI18n must be used inside I18nProvider')
	}
	return context
}
