import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Entrar',
}

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-navy font-bold mb-2">
            Casa Cervantes
          </h1>
          <p className="text-muted text-sm">
            Accede con tu cuenta para gestionar tus reservas
          </p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox:           'w-full',
              card:              'shadow-card border border-border rounded-xl bg-white',
              headerTitle:       'font-display text-navy',
              headerSubtitle:    'text-muted',
              formButtonPrimary: 'bg-navy hover:bg-navy-dark transition-colors',
              footerAction:      'hidden',
            },
          }}
        />
      </div>
    </div>
  )
}
