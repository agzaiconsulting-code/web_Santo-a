// src/components/Header.tsx
'use client'

import { useState, useEffect } from 'react'
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

  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

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

        {/* Hamburguesa (solo móvil, solo si hay links) */}
        {isSignedIn && (
          <button
            className="md:hidden ml-3 flex flex-col gap-1.5 p-1"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuOpen ? (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        )}

      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-border shadow-md z-40">
          <nav className="flex flex-col px-6 py-4 gap-1">
            {allLinks.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm py-2.5 border-b border-border/50 last:border-0 transition-colors duration-150 ${
                    isActive
                      ? 'text-navy font-medium'
                      : 'text-muted hover:text-navy'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
