import { useMemo, useState } from 'react'
import { canciones } from '../lib/songs'

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function Indice({ claro, alternarTema }) {
  const [consulta, setConsulta] = useState('')
  const [tonoFiltro, setTonoFiltro] = useState('')

  const tonos = useMemo(
    () => [...new Set(canciones.map((c) => c.tono).filter(Boolean))].sort(),
    []
  )

  const resultados = useMemo(() => {
    const q = normalizar(consulta.trim())
    return canciones.filter((c) => {
      if (tonoFiltro && c.tono !== tonoFiltro) return false
      if (!q) return true
      return (
        normalizar(c.titulo).includes(q) ||
        normalizar(c.autor).includes(q) ||
        normalizar(c.indice).includes(q)
      )
    })
  }, [consulta, tonoFiltro])

  return (
    <div className="pagina">
      <header className="portada">
        <div className="portada-fila">
          <p className="eyebrow">Grupo de alabanza</p>
          <button className="boton-tema" onClick={alternarTema}>
            {claro ? 'Modo templo' : 'Modo día'}
          </button>
        </div>
        <div className="logo logo-cabecera" role="img" aria-label="VMF Magallanes" />
        <h1 className="portada-titulo">Cancionero</h1>
        <p className="portada-cuenta">
          <span className="cifra">{canciones.length}</span>{' '}
          {canciones.length === 1 ? 'canción' : 'canciones'} en el repertorio
        </p>
      </header>

      <div className="buscador">
        <input
          className="campo"
          type="search"
          placeholder="Buscar por título, autor o un trozo de la letra"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          aria-label="Buscar canción"
        />
        {tonos.length > 1 && (
          <div className="filtro-tonos" role="group" aria-label="Filtrar por tono">
            <button
              className={'chip' + (tonoFiltro === '' ? ' chip-activo' : '')}
              onClick={() => setTonoFiltro('')}
            >
              Todos
            </button>
            {tonos.map((t) => (
              <button
                key={t}
                className={'chip' + (tonoFiltro === t ? ' chip-activo' : '')}
                onClick={() => setTonoFiltro(tonoFiltro === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {resultados.length === 0 ? (
        <p className="sin-resultados">
          Nada calza con esa búsqueda. Prueba con menos palabras o quita el filtro de
          tono.
        </p>
      ) : (
        <ul className="lista">
          {resultados.map((c) => (
            <li key={c.slug}>
              <a className="fila" href={`#/${c.slug}`}>
                <span className="fila-texto">
                  <span className="fila-titulo">{c.titulo}</span>
                  {c.autor && <span className="fila-autor">{c.autor}</span>}
                </span>
                <span className="fila-datos">
                  {c.youtube && <span className="marca-audio" title="Tiene video">▶</span>}
                  {c.tono && <span className="fila-tono">{c.tono}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <footer className="pie">
        <span className="marca-pie" role="img" aria-label="VMF Magallanes" />
        Para agregar una canción, sube un archivo <code>.txt</code> a{' '}
        <code>src/songs/</code> y haz push.
      </footer>
    </div>
  )
}
