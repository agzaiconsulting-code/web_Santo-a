import Image from 'next/image'
import Link from 'next/link'

const STATS = [
  { num: '7',    label: 'Familias'      },
  { num: '21+',  label: 'Personas'      },
  { num: '30 €', label: '/ noche'       },
  { num: '15',   label: 'Noches máx.'  },
]

// Foto temporal de la costa cantábrica (sustituir por foto real de la casa)
const HERO_IMAGE = '/images/hero.jpg.png'

export default function HomePage() {
  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center overflow-hidden">

        {/* Foto de fondo */}
        <div className="absolute inset-0 z-0">
          <Image
            src={HERO_IMAGE}
            alt="Casa Cervantes en Santoña"
            fill
            className="object-cover opacity-60 blur-[1.5px] scale-105"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,35,55,0.45)] via-[rgba(20,35,55,0.2)] to-[rgba(20,35,55,0.65)]" />
        </div>

        {/* Contenido centrado */}
        <div className="relative z-10 px-8 max-w-3xl mx-auto">
          <p className="text-[11px] text-blue-light/90 tracking-[0.22em] uppercase mb-5 font-light">
            Santoña · Cantabria · Calle Cervantes
          </p>

          <h1 className="font-display text-5xl md:text-[62px] font-bold text-white leading-tight mb-5">
            La casa de todos<br />
            en el{' '}
            <em className="text-gold not-italic">Cantábrico</em>
          </h1>

          <p className="text-black text-lg font-light leading-relaxed mb-10 max-w-md mx-auto">
            7 familias, una casa compartida en Santoña.<br />
            Reserva tus días de forma sencilla y transparente.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/calendario" className="btn-primary text-base px-9 py-3.5">
              Ver calendario →
            </Link>
            <Link
              href="/normas"
              className="text-white/90 border border-white/30 hover:border-white/60 px-9 py-3.5 rounded-lg text-base font-medium transition-colors duration-150 backdrop-blur-sm"
            >
              Normas de uso
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 text-white/35 text-xs tracking-[0.3em] uppercase">
          ↓
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-white border-t-[3px] border-gold shadow-card">
        <div className="max-w-4xl mx-auto px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ num, label }) => (
            <div key={label} className="text-center">
              <div className="font-display text-3xl font-bold text-navy">{num}</div>
              <div className="text-xs text-muted uppercase tracking-widest mt-1.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DESCRIPCIÓN ── */}
      <section className="max-w-2xl mx-auto px-8 py-20 text-center">
        <h2 className="font-display text-3xl text-navy font-bold mb-5">
          Una casa, siete familias
        </h2>
        <p className="text-muted text-base leading-relaxed mb-4">
          La Casa Cervantes es el punto de encuentro de nuestra familia extendida en Santoña.
          Con esta aplicación gestionamos las reservas de forma transparente y equitativa:
          cada familia consulta disponibilidad, reserva sus fechas y gestiona sus estancias.
        </p>
        <p className="text-muted text-base leading-relaxed">
          El precio es de{' '}
          <strong className="text-navy font-semibold">30 €/noche</strong>,
          con un máximo de 15 noches consecutivas y 30 noches por familia
          en el horizonte de 4 meses. Agosto está reservado para la familia
          a la que corresponde ese año en rotación.
        </p>
      </section>
    </div>
  )
}
