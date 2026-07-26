import { ChordProParser, HtmlDivFormatter } from 'chordsheetjs'

// Vite lee todos los .txt de src/songs/ durante el build y los incrusta
// como texto en el bundle. No hay peticiones de red por canción.
const archivos = import.meta.glob('../songs/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const RE_META = /^\{(\w+):\s*([^}]*)\}[ \t]*$/gm
const RE_SECCION = /^==\s*(.+?)\s*==$/m

/* ------------------------------------------------------------------
   Acordes: se aceptan las dos notaciones, la inglesa (C D E F G A B)
   y la latina o de solfeo (Do Re Mi Fa Sol La Si).

   El solfeo trae un problema propio del español: La, Mi, Si, Sol, Do
   y Re tambien son palabras. Por eso las canciones NO se le entregan
   crudas a la libreria (que ahi adivina, y a veces mal), sino que aca
   se decide linea por linea que es acorde y que es letra, y se
   convierte a formato ChordPro antes de parsear.

   Las raices latinas van primero en la alternancia para que "Do" no
   se lea como un "D" seguido de basura. La capitalizacion importa:
   "Sol" es un acorde, "sol" es una palabra.
   ------------------------------------------------------------------ */

const RAIZ = '(?:Do|Re|Mi|Fa|Sol|La|Si|[A-G])'

const RE_ACORDE = new RegExp(
  '^' +
    RAIZ +
    '[#b]?' +
    '(?:maj|min|ma|m|M|dim|aug|°|\\+)?' +
    '[0-9]*' +
    '(?:sus|add)?' +
    '[0-9]*' +
    '(?:\\([^)]*\\))?' +
    '(?:/' +
    RAIZ +
    '[#b]?)?$'
)

// Separadores que se usan al escribir progresiones: Sol - Do | Re
const RE_SEPARADOR = /^[-|/:,]+$/

function esAcorde(token) {
  return RE_ACORDE.test(token)
}

/* Convierte tabs a espacios usando parrilla de 8, que es lo que casi
   todos los editores muestran. Sin esto, un tab cuenta como un solo
   caracter y los acordes copiados desde Word quedan corridos. */
function expandirTabs(linea) {
  let salida = ''
  for (const car of linea) {
    if (car === '\t') {
      salida += ' '.repeat(8 - (salida.length % 8))
    } else {
      salida += car
    }
  }
  return salida
}

/** Una linea es de acordes si todos sus tokens son acordes o separadores. */
function esLineaDeAcordes(linea) {
  const tokens = linea.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return false
  return tokens.every((t) => esAcorde(t) || RE_SEPARADOR.test(t))
}

/** Inserta los acordes de una linea dentro de la letra, por columna. */
function fundirLineas(lineaAcordes, lineaLetra) {
  const acordes = [...lineaAcordes.matchAll(/\S+/g)]
  // Si la letra es mas corta que la ultima columna de acorde, se
  // estira con espacios para que ningun acorde quede colgando al final.
  const ultima = acordes.length ? acordes[acordes.length - 1].index : 0
  let letra = lineaLetra.padEnd(ultima, ' ')
  let salida = ''
  let cursor = 0
  const NBSP = '\u00a0'

  for (const encontrado of acordes) {
    const columna = encontrado.index
    const ficha = esAcorde(encontrado[0]) ? `[${encontrado[0]}]` : encontrado[0]

    salida += letra.slice(cursor, columna)

    // Si el acorde cae sobre un espacio (un silencio de la voz), se
    // ancla a un espacio duro para que quede flotando en esa posicion
    // en vez de saltar a la siguiente silaba con letra.
    if (letra[columna] === ' ' || columna >= letra.length) {
      salida += ficha + NBSP
      cursor = columna + 1
    } else {
      salida += ficha
      cursor = columna
    }
  }

  return salida + letra.slice(cursor)
}

/** Convierte una seccion escrita con acordes encima de la letra a ChordPro. */
function aChordPro(texto) {
  // Los corchetes en la letra se cambian por parentesis: en ChordPro
  // delimitan acordes y romperian el parseo.
  const lineas = texto
    .replace(/[[\]]/g, (c) => (c === '[' ? '(' : ')'))
    .split('\n')
    .map(expandirTabs)
  const salida = []

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]

    if (!linea.trim()) {
      salida.push('')
      continue
    }

    if (esLineaDeAcordes(linea)) {
      const siguiente = lineas[i + 1]
      const hayLetraDebajo =
        siguiente !== undefined && siguiente.trim() && !esLineaDeAcordes(siguiente)

      if (hayLetraDebajo) {
        salida.push(fundirLineas(linea, siguiente))
        i++ // la letra ya quedo consumida
      } else {
        // Progresion sin letra: intro, puente, final instrumental
        salida.push(linea.replace(/\S+/g, (t) => (esAcorde(t) ? `[${t}]` : t)))
      }
    } else {
      // Letra suelta, sin acordes encima. Va tal cual: aca esta la
      // diferencia con dejar que la libreria adivine.
      salida.push(linea)
    }
  }

  return salida.join('\n')
}

/* Extrae los 11 caracteres del ID aunque hayan pegado la URL completa
   o el ?si=... que YouTube agrega al compartir. */
function limpiarYoutube(valor) {
  if (!valor) return ''
  const v = valor.trim()
  // Formatos de URL: watch?v=ID, youtu.be/ID, live/ID, embed/ID
  const m = v.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{11})/)
  if (m) return m[1]
  // Si ya venia el ID, se corta cualquier ?si=... o &... sobrante
  return v.split(/[?&]/)[0]
}

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/* .trim() no distingue líneas: si la primera línea de una sección
   trae espacios de indentación antes del primer acorde, un .trim()
   normal se los come junto con el salto de línea del encabezado y el
   acorde termina pegado al margen. Esto solo descarta líneas
   completamente vacías en los bordes, sin tocar la indentación de la
   primera línea con contenido. */
function recortarSeccion(texto) {
  return texto.replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '')
}

function leerArchivo(ruta, crudo) {
  if (crudo.includes('\t')) {
    console.warn(
      `${ruta}: tiene tabs. El ancho de un tab no es fijo, así que el acorde ` +
        'puede caer en otra columna en la web que en tu editor. Cámbialos por espacios.'
    )
  }

  // Normaliza los finales de línea antes de tocar nada más: un \r
  // suelto antes de un \n no cuenta como espacio en blanco para el
  // recorte de secciones y queda como una línea "vacía" fantasma.
  const contenido = crudo.replace(/\r\n?/g, '\n')

  const meta = {}
  const cuerpo = contenido
    .replace(RE_META, (_, clave, valor) => {
      meta[clave] = valor.trim()
      return ''
    })
    // Las lineas que empiezan con # son notas para uno mismo
    .replace(/^#.*$/gm, '')
    .trim()

  const nombreArchivo = ruta.split('/').pop().replace(/\.txt$/, '')
  const titulo = meta.title || nombreArchivo

  const trozos = cuerpo.split(new RegExp(RE_SECCION.source, 'gm'))
  const secciones = []

  if (recortarSeccion(trozos[0])) {
    secciones.push({ nombre: null, texto: recortarSeccion(trozos[0]) })
  }
  for (let i = 1; i < trozos.length; i += 2) {
    const texto = recortarSeccion(trozos[i + 1] || '')
    if (texto) secciones.push({ nombre: trozos[i], texto })
  }

  return {
    slug: meta.slug || slugify(titulo),
    titulo,
    autor: meta.author || meta.artist || '',
    tono: meta.key || '',
    youtube: limpiarYoutube(meta.youtube),
    spotify: meta.spotify || '',
    tempo: meta.tempo || '',
    nota: meta.note || '',
    secciones,
    // Solo la letra, para el buscador
    indice: cuerpo
      .split('\n')
      .filter((l) => !esLineaDeAcordes(l))
      .join(' ')
      .toLowerCase(),
  }
}

export const canciones = Object.entries(archivos)
  // Un archivo que empieza con _ es una plantilla, no una cancion
  .filter(([ruta]) => !ruta.split('/').pop().startsWith('_'))
  .map(([ruta, contenido]) => leerArchivo(ruta, contenido))
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))

export function buscarCancion(slug) {
  return canciones.find((c) => c.slug === slug)
}

/* ---------------------------------------------------- tonos y capo */

const ESCALAS = {
  ingles: {
    sostenidos: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    bemoles: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  },
  latino: {
    sostenidos: [
      'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa',
      'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si',
    ],
    bemoles: [
      'Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa',
      'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si',
    ],
  },
}

const RE_TONO = new RegExp('^(' + RAIZ + ')([#b]?)(.*)$')

/** Nombre del tono resultante despues de mover el capo. */
export function tonoTranspuesto(tono, semitonos, usarBemoles) {
  if (!tono) return ''
  const partes = tono.match(RE_TONO)
  if (!partes) return tono

  const [, raiz, accidental, sufijo] = partes
  const notacion = raiz.length > 1 ? 'latino' : 'ingles'
  const escala = ESCALAS[notacion]
  const nota = raiz + accidental

  let base = escala.sostenidos.indexOf(nota)
  if (base < 0) base = escala.bemoles.indexOf(nota)
  if (base < 0) return tono

  const tabla = usarBemoles ? escala.bemoles : escala.sostenidos
  return tabla[(base + semitonos + 120) % 12] + sufijo
}

// normalizeChords en false para que un Dosus4 se muestre como
// "Dosus4" y no como "Dosus", que es lo que hace la libreria por
// defecto al normalizar los sufijos.
const formatter = new HtmlDivFormatter({ normalizeChords: false })

/**
 * Convierte una seccion a HTML con los acordes sobre la silaba.
 * El HTML proviene de archivos del propio repositorio, no de entrada externa.
 */
export function seccionAHtml(seccion, tono, semitonos, usarBemoles) {
  try {
    const encabezado = tono ? `{key: ${tono}}\n\n` : ''
    let song = new ChordProParser().parse(encabezado + aChordPro(seccion.texto))
    if (semitonos) song = song.transpose(semitonos)
    if (usarBemoles) song = song.useAccidental('b')
    return formatter.format(song)
  } catch (error) {
    console.error(`No se pudo leer la seccion "${seccion.nombre}":`, error)
    return `<pre class="crudo">${seccion.texto}</pre>`
  }
}
