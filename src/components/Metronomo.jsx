import { useEffect, useRef, useState } from 'react'

/* Planificador con anticipación (lookahead): en vez de disparar el
   clic en el momento con setTimeout (que se atrasa bajo carga), se
   programan los clics en el reloj del AudioContext con un pequeño
   margen de antelación. Es la técnica estándar para metrónomos web
   ("A Tale of Two Clocks", Chris Wilson). */
const INTERVALO_PROGRAMACION = 25 // ms entre revisiones del planificador
const ANTELACION = 0.1 // segundos de clics que se dejan ya agendados

export default function Metronomo({ bpm, compas }) {
  const numerador = Number((compas || '4/4').split('/')[0]) || 4

  const [activo, setActivo] = useState(false)
  const [ajuste, setAjuste] = useState(0)
  const [pulso, setPulso] = useState(-1)

  const bpmActual = Math.max(20, Math.min(300, Math.round((bpm + ajuste) * 10) / 10))
  const bpmRef = useRef(bpmActual)
  bpmRef.current = bpmActual

  const contextoRef = useRef(null)
  const siguienteTiempoRef = useRef(0)
  const siguientePulsoRef = useRef(0)
  const temporizadorRef = useRef(null)

  function detener() {
    clearTimeout(temporizadorRef.current)
    if (contextoRef.current) {
      contextoRef.current.close()
      contextoRef.current = null
    }
    setActivo(false)
    setPulso(-1)
  }

  // Cambiar de canción corta cualquier metrónomo que hubiera quedado sonando.
  useEffect(() => {
    setAjuste(0)
    detener()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, compas])

  useEffect(() => () => detener(), [])

  function sonar(tiempo, acentuado) {
    const ctx = contextoRef.current
    const osc = ctx.createOscillator()
    const ganancia = ctx.createGain()
    osc.frequency.value = acentuado ? 1500 : 950
    ganancia.gain.setValueAtTime(acentuado ? 0.5 : 0.28, tiempo)
    ganancia.gain.exponentialRampToValueAtTime(0.001, tiempo + 0.05)
    osc.connect(ganancia)
    ganancia.connect(ctx.destination)
    osc.start(tiempo)
    osc.stop(tiempo + 0.05)
  }

  function planificar() {
    const ctx = contextoRef.current
    while (siguienteTiempoRef.current < ctx.currentTime + ANTELACION) {
      const pulsoActual = siguientePulsoRef.current
      sonar(siguienteTiempoRef.current, pulsoActual === 0)

      const retrasoMs = Math.max(0, (siguienteTiempoRef.current - ctx.currentTime) * 1000)
      setTimeout(() => setPulso(pulsoActual), retrasoMs)

      siguienteTiempoRef.current += 60 / bpmRef.current
      siguientePulsoRef.current = (pulsoActual + 1) % numerador
    }
    temporizadorRef.current = setTimeout(planificar, INTERVALO_PROGRAMACION)
  }

  function iniciar() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    contextoRef.current = ctx
    siguienteTiempoRef.current = ctx.currentTime + 0.05
    siguientePulsoRef.current = 0
    setActivo(true)
    planificar()
  }

  return (
    <div className="panel-metronomo">
      <div className="metronomo-bpm">
        <button className="tecla" onClick={() => setAjuste((a) => a - 1)} aria-label="Bajar bpm">
          −
        </button>
        <div className="metronomo-cifra">
          <span className="metronomo-numero">{bpmActual}</span>
          <span className="metronomo-unidad">bpm · {compas || '4/4'}</span>
        </div>
        <button className="tecla" onClick={() => setAjuste((a) => a + 1)} aria-label="Subir bpm">
          +
        </button>
      </div>

      {ajuste !== 0 && (
        <button className="metronomo-restablecer" onClick={() => setAjuste(0)}>
          Volver a {bpm} bpm
        </button>
      )}

      <div className="metronomo-pulsos">
        {Array.from({ length: numerador }).map((_, i) => (
          <span
            key={i}
            className={
              'punto-pulso' +
              (i === 0 ? ' punto-acento' : '') +
              (i === pulso && activo ? ' punto-activo' : '')
            }
          />
        ))}
      </div>

      <button
        className={'boton-metronomo-play' + (activo ? ' activo' : '')}
        onClick={() => (activo ? detener() : iniciar())}
      >
        {activo ? '⏸ Detener' : '▶ Iniciar'}
      </button>
    </div>
  )
}
