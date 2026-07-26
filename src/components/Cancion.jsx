import { useEffect, useMemo, useState } from 'react'
import { seccionAHtml, tonoTranspuesto } from '../lib/songs'
import Metronomo from './Metronomo'

const TAMANOS = [15, 17, 19, 22, 26, 30]

export default function Cancion({ cancion, claro, alternarTema }) {
  const [semitonos, setSemitonos] = useState(0)
  const [bemoles, setBemoles] = useState(false)
  const [tamano, setTamano] = useState(2)
  const [escenario, setEscenario] = useState(false)
  const [verVideo, setVerVideo] = useState(false)
  const [metronomoAbierto, setMetronomoAbierto] = useState(false)
  const [consolaVisible, setConsolaVisible] = useState(true)

  // Cada canción se abre en su tono original
  useEffect(() => {
    setSemitonos(0)
    setVerVideo(false)
    setMetronomoAbierto(false)
  }, [cancion.slug])

  const secciones = useMemo(
    () =>
      cancion.secciones.map((s) => ({
        nombre: s.nombre,
        html: seccionAHtml(s, cancion.tono, semitonos, bemoles),
      })),
    [cancion, semitonos, bemoles]
  )

  const tonoActual = tonoTranspuesto(cancion.tono, semitonos, bemoles)

  return (
    <div
      className={
        'pagina pagina-cancion' +
        (escenario ? ' escenario' : '') +
        (consolaVisible ? '' : ' consola-oculta')
      }
    >
      {!escenario && (
        <nav className="barra-superior">
          <a className="enlace-volver" href="#/">
            ← Cancionero
          </a>
          <button className="boton-tema" onClick={alternarTema}>
            {claro ? 'Modo templo' : 'Modo día'}
          </button>
        </nav>
      )}

      <header className="cabecera-cancion">
        <h1 className="titulo-cancion">{cancion.titulo}</h1>
        <p className="meta-cancion">
          {cancion.autor && <span>{cancion.autor}</span>}
          {cancion.tono && (
            <span>
              Tono original <strong className="mono">{cancion.tono}</strong>
            </span>
          )}
          {cancion.tempo && <span className="mono">{cancion.tempo} bpm</span>}
          {cancion.duracion && <span className="mono">{cancion.duracion}</span>}
        </p>
        {cancion.nota && <p className="nota-cancion">{cancion.nota}</p>}
      </header>

      {cancion.youtube && !escenario && (
        <div className="bloque-video">
          {verVideo ? (
            <div className="marco-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${cancion.youtube}`}
                title={`Video de ${cancion.titulo}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button className="boton-video" onClick={() => setVerVideo(true)}>
              ▶ Escuchar la canción
            </button>
          )}
          {cancion.spotify && (
            <a
              className="enlace-spotify"
              href={cancion.spotify}
              target="_blank"
              rel="noreferrer"
            >
              Abrir en Spotify
            </a>
          )}
        </div>
      )}

      <div className="hoja" style={{ '--tamano-letra': `${TAMANOS[tamano]}px` }}>
        {secciones.map((s, i) => (
          <section className="seccion" key={i}>
            {s.nombre && <h2 className="nombre-seccion">{s.nombre}</h2>}
            <div
              className="chord-sheet-wrap"
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          </section>
        ))}
      </div>

      {consolaVisible && metronomoAbierto && cancion.tempo && (
        <Metronomo bpm={Number(cancion.tempo)} compas={cancion.compas} />
      )}

      <div className={'fila-asa-consola' + (consolaVisible ? '' : ' fila-asa-consola-oculta')}>
        <button
          className={'asa-consola' + (consolaVisible ? '' : ' asa-consola-oculta')}
          onClick={() => setConsolaVisible(!consolaVisible)}
          aria-label={consolaVisible ? 'Ocultar barra inferior' : 'Mostrar barra inferior'}
        >
          {consolaVisible ? '▾' : '▴'}
        </button>
      </div>

      {consolaVisible && (
        <div className="consola">
          <div className="grupo-capo">
            <button
              className="tecla"
              onClick={() => setSemitonos(semitonos - 1)}
              aria-label="Bajar un semitono"
            >
              −
            </button>
            <button
              className="pastilla-tono"
              onClick={() => setBemoles(!bemoles)}
              title="Cambiar entre sostenidos y bemoles"
            >
              <span className="tono-grande">{tonoActual || '—'}</span>
              <span className="tono-desvio">
                {semitonos === 0
                  ? 'tono original'
                  : `${semitonos > 0 ? '+' : ''}${semitonos} semitono${
                      Math.abs(semitonos) === 1 ? '' : 's'
                    }`}
              </span>
            </button>
            <button
              className="tecla"
              onClick={() => setSemitonos(semitonos + 1)}
              aria-label="Subir un semitono"
            >
              +
            </button>
          </div>

          <div className="grupo-derecha">
            {cancion.tempo && (
              <button
                className={'tecla tecla-ancha' + (metronomoAbierto ? ' tecla-activa' : '')}
                onClick={() => setMetronomoAbierto(!metronomoAbierto)}
              >
                ♩ {cancion.tempo}
              </button>
            )}
            {semitonos !== 0 && (
              <button className="tecla tecla-ancha" onClick={() => setSemitonos(0)}>
                Volver al tono
              </button>
            )}
            <button
              className="tecla"
              onClick={() => setTamano(Math.max(0, tamano - 1))}
              aria-label="Letra más chica"
              disabled={tamano === 0}
            >
              A−
            </button>
            <button
              className="tecla"
              onClick={() => setTamano(Math.min(TAMANOS.length - 1, tamano + 1))}
              aria-label="Letra más grande"
              disabled={tamano === TAMANOS.length - 1}
            >
              A+
            </button>
            <button
              className={'tecla tecla-ancha' + (escenario ? ' tecla-activa' : '')}
              onClick={() => setEscenario(!escenario)}
            >
              {escenario ? 'Salir' : 'Atril'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
