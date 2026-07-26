import { useEffect, useState } from 'react'
import Indice from './components/Indice'
import Cancion from './components/Cancion'
import { buscarCancion } from './lib/songs'

function rutaActual() {
  return decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))
}

export default function App() {
  const [ruta, setRuta] = useState(rutaActual)
  const [claro, setClaro] = useState(
    () => localStorage.getItem('tema') === 'claro'
  )

  useEffect(() => {
    const alCambiar = () => {
      setRuta(rutaActual())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.tema = claro ? 'claro' : 'oscuro'
    localStorage.setItem('tema', claro ? 'claro' : 'oscuro')
  }, [claro])

  const cancion = ruta ? buscarCancion(ruta) : null

  if (ruta && !cancion) {
    return (
      <main className="vacio">
        <p className="vacio-titulo">Esa canción no está en el cancionero.</p>
        <a className="enlace-volver" href="#/">
          Volver al índice
        </a>
      </main>
    )
  }

  return cancion ? (
    <Cancion cancion={cancion} claro={claro} alternarTema={() => setClaro(!claro)} />
  ) : (
    <Indice claro={claro} alternarTema={() => setClaro(!claro)} />
  )
}
