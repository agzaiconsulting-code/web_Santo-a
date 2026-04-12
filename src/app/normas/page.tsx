import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Normas de uso',
}

const NORMAS = [
  {
    num: '01',
    title: 'Máximo 15 noches seguidas',
    body: 'No se puede reservar más de 15 noches consecutivas en la misma estancia.',
  },
  {
    num: '02',
    title: 'Máximo 30 noches por familia',
    body: 'Cada familia tiene un límite de 30 noches en la ventana de reserva de 4 meses, sumando todas las reservas de sus miembros.',
  },
  {
    num: '03',
    title: 'Pago por transferencia',
    body: 'El precio es de 30 €/noche. El pago se realiza mediante transferencia bancaria. La aplicación no gestiona pagos.',
  },
  {
    num: '04',
    title: 'Cancelaciones',
    body: 'Si se cancela una reserva no se devuelve el dinero, salvo que otra persona quiera esos mismos días o por causa de fuerza mayor.',
  },
  {
    num: '05',
    title: 'Agosto restringido',
    body: 'Solo puede reservar en agosto la familia a la que le corresponde ese año. El turno rota entre las 7 familias y lo asigna el administrador.',
  },
  {
    num: '06',
    title: 'Antelación máxima de 4 meses',
    body: 'No se pueden hacer reservas con más de 4 meses de antelación respecto a la fecha de entrada.',
  },
  {
    num: '07',
    title: 'Año natural',
    body: 'Solo se puede reservar dentro del año en curso. El 1 de enero se abre la posibilidad de reservar en el nuevo año.',
  },
]

export default function NormasPage() {
  return (
    <div className="max-w-2xl mx-auto px-8 py-16">
      {/* Cabecera */}
      <div className="mb-12">
        <p className="text-xs text-blue tracking-[0.18em] uppercase mb-3 font-medium">
          Casa Cervantes · Santoña
        </p>
        <h1 className="font-display text-4xl text-navy font-bold mb-4">
          Normas de uso
        </h1>
        <p className="text-muted text-base leading-relaxed">
          Para que la casa funcione bien para todos, seguimos estas reglas acordadas entre las 7 familias.
        </p>
      </div>

      {/* Lista */}
      <div className="space-y-5">
        {NORMAS.map(({ num, title, body }) => (
          <div
            key={num}
            className="flex gap-6 p-6 bg-white rounded-xl border border-border shadow-card hover:shadow-card-hover transition-shadow duration-200"
          >
            <div className="font-display text-3xl font-bold text-gold/35 leading-none pt-0.5 w-10 flex-shrink-0 select-none">
              {num}
            </div>
            <div>
              <h2 className="font-display text-lg text-navy font-semibold mb-1.5">
                {title}
              </h2>
              <p className="text-muted text-sm leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 p-5 bg-navy/5 rounded-xl border border-navy/10 text-center">
        <p className="text-sm text-muted">
          ¿Tienes dudas? Contacta con el administrador de la aplicación.
        </p>
      </div>
    </div>
  )
}
