import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import I18nProvider from '@/components/I18nProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'National Road Intelligence Platform | Government of India',
  description: 'AI-Powered Road Infrastructure Management — Digital India Initiative',
  keywords: 'road maintenance, pothole detection, AI, Government of India, Digital India',
  icons: { icon: '/images/emblem.png' }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <I18nProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1A3A6B', color: '#fff', borderRadius: '8px' },
              duration: 4000
            }}
          />
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
