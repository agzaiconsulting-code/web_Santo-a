// src/components/Header.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'

const NAV_PUBLIC: { href: string; label: string }[] = []

const NAV_PRIVATE = [
  { href: '/calendario', label: 'Calendario'   },
  { href: '/reservas',   label: 'Mis reservas' },
  { href: '/normas',     label: 'Normas'       },
  { href: '/fotos',      label: 'Fotos'        },
]

const NAV_ADMIN = [
  { href: '/admin', label: 'Admin' },
]

export function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname       = usePathname()
  const { isSignedIn } = useUser()

  const allLinks = isSignedIn
    ? [...(isAdmin ? NAV_ADMIN : []), ...NAV_PRIVATE, ...NAV_PUBLIC]
    : NAV_PUBLIC

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-sm border-b border-border shadow-[0_1px_12px_rgba(29,53,87,0.06)]">
      <div className="max-w-7xl mx-auto px-8 md:px-12 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="font-display text-xl font-bold text-navy tracking-wide hover:opacity-75 transition-opacity"
        >
          Casa Cervantes
        </Link>

        {/* Navegación */}
        <nav className="hidden md:flex items-center gap-7">
          {allLinks.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors duration-150 ${
                  isActive
                    ? 'text-navy font-medium border-b-2 border-gold pb-0.5'
                    : 'text-muted hover:text-navy'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Auth */}
        <div className="flex items-center">
          {isSignedIn ? (
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'w-9 h-9' } }}
            />
          ) : (
            <SignInButton mode="redirect">
              <button className="bg-navy text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-navy-dark transition-colors duration-150 tracking-wide">
                Entrar
              </button>
            </SignInButton>
          )}
        </div>

      </div>
    </header>
  )
}
