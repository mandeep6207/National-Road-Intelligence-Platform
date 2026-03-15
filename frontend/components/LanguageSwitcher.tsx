'use client'

import { Languages } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

type SwitcherVariant = 'light' | 'dark'

interface LanguageSwitcherProps {
	variant?: SwitcherVariant
	className?: string
}

function buttonClasses(variant: SwitcherVariant) {
	if (variant === 'dark') {
		return 'border border-white/30 bg-white/10 text-white hover:bg-white/20'
	}
	return 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
}

export default function LanguageSwitcher({ variant = 'light', className = '' }: LanguageSwitcherProps) {
	const { toggleLanguage, language } = useI18n()

	return (
		<button
			type="button"
			onClick={toggleLanguage}
			className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${buttonClasses(variant)} ${className}`.trim()}
			aria-label={language === 'en' ? 'Switch language to Hindi' : 'Switch language to English'}
			title={language === 'en' ? 'Switch language to Hindi' : 'Switch language to English'}
		>
			<Languages className="h-3.5 w-3.5" />
			<span>EN | हिन्दी</span>
		</button>
	)
}
