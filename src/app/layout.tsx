import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { Header } from '@/components/Header'
import { getSupabaseUser } from '@/lib/getUser'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Casa Cervantes — Santoña',
    template: '%s — Casa Cervantes',
  },
  description: 'Gestión de reservas de la casa familiar en Calle Cervantes, Santoña, Cantabria.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  let isAdmin = false
  if (userId) {
    const dbUser = await getSupabaseUser(userId)
    isAdmin = dbUser?.role === 'admin'
  }

  return (
    <ClerkProvider>
      <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
        <body className="font-sans bg-stone min-h-screen">
          <Header isAdmin={isAdmin} />
          <main className="pt-16">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
