# Cancionero

Cancionero web del grupo de alabanza. Cada canción es un archivo de texto con los
acordes escritos encima de la letra, igual que en una hoja de atril. El sitio los
lee, los muestra alineados y permite cambiar el tono con un botón.

No hay base de datos ni servidor: el repositorio es el cancionero.

## Levantarlo en el notebook

```bash
npm install
npm run dev
```

Queda en http://localhost:5173

## Agregar una canción

1. Copia `src/songs/_plantilla.txt` con el nombre de la canción en minúsculas y
   con guiones: `src/songs/gracia-sublime-es.txt`
2. Llena los datos de arriba y escribe la letra con sus acordes.
3. `git add`, `git commit`, `git push`. En menos de un minuto está publicada.

El nombre del archivo es la dirección de la canción, así que puedes mandarle al
grupo un link directo: `tucancionero.cl/#/gracia-sublime-es`

### Formato del archivo

```
{title: Gracia sublime es}
{key: G}
{youtube: dQw4w9WgXcQ}

== Estrofa 1 ==
G                              C
Quién rompe el poder del pecado, Su Amor es fuerte
```

Datos que reconoce: `title`, `key`, `author`, `youtube`, `spotify`, `tempo`,
`note`, `slug`. Solo `title` es obligatorio, pero sin `key` el capo no sabe desde
qué tono transponer.

En `youtube` va **solo el ID**, no la URL completa:
`https://www.youtube.com/watch?v=dQw4w9WgXcQ` → `dQw4w9WgXcQ`

Las secciones se abren con `== Nombre ==`. Una sección puede tener solo acordes y
ninguna letra, para intros y puentes instrumentales.

Los acordes se ubican por **columna de caracteres**, no por tabulaciones. Si
copias desde Word, revisa la alineación: los tabs no equivalen a una posición
fija y suelen quedar corridos.

### Notación de los acordes

Sirven las dos:

| | |
|---|---|
| Inglesa | `C D E F G A B` — `Am`, `F#m7`, `Csus4`, `G/B` |
| Latina (solfeo) | `Do Re Mi Fa Sol La Si` — `Lam`, `Fa#m7`, `Dosus4`, `Sol/Si` |

**La capitalización importa.** `Sol` es un acorde, `sol` es una palabra. En
español varias notas del solfeo son también palabras corrientes (`La`, `Mi`,
`Si`, `Do`, `Re`, `Sol`), así que el sitio distingue una línea de acordes de una
línea de letra exigiendo que *todos* los elementos de la línea sean acordes bien
escritos. Una línea como `La luz de mi vida` se trata como letra porque `luz` no
es un acorde.

El caso que sí puede confundirlo es una línea de letra formada solo por palabras
que además son notas, por ejemplo `La Si La`. Es raro, pero si ocurre se ve al
tiro y se arregla poniendo la letra pegada a su línea de acordes.

Puedes tener unas canciones en inglés y otras en solfeo. Mezclar las dos dentro
de una misma canción funciona, pero al transponer queda inconsistente: cada
acorde mantiene su propia notación.

## Publicarlo gratis

1. Sube el repositorio a GitHub.
2. En [vercel.com](https://vercel.com), _Add New → Project_, elige el repositorio.
   Detecta Vite solo; no hay que configurar nada.
3. Cada push a `main` republica el sitio.

Cuando compres el dominio en NIC Chile, se agrega en _Settings → Domains_ y se
apuntan los DNS. El código no cambia.

La navegación usa `#/` en la dirección justamente para que funcione en cualquier
hosting estático sin reglas de reescritura.

## Lo que hace la página

- **Índice** con buscador por título, autor o un trozo de la letra, y filtro por tono.
- **Capo** (− / +) que transpone la canción completa. El tono resultante se
  muestra grande. Al tocarlo alterna entre sostenidos y bemoles.
- **Tamaño de letra** (A− / A+) para leer desde el atril.
- **Modo atril**, que esconde todo menos la hoja y la agranda.
- **Modo templo / modo día**: oscuro para el escenario con luces bajas, claro
  para preparar en casa. Queda guardado en el navegador.
- **Video de YouTube** que solo carga cuando se aprieta, para no gastar datos.
- Al imprimir sale en blanco y negro, sin controles.

## Detalles técnicos

- Vite + React, sin backend.
- `chordsheetjs` hace el parseo y la transposición. Las canciones no se le
  entregan crudas: `src/lib/songs.js` decide primero, línea por línea, qué es
  acorde y qué es letra, y recién ahí convierte a formato ChordPro. Ese paso
  existe por el solfeo, donde dejar que la librería adivine hace que una línea
  como `Si mi Sol se apaga` se lea como acordes.
- La normalización de sufijos viene desactivada, así que un `Dosus4` se muestra
  tal cual y no como `Dosus`.
- `import.meta.glob` incrusta las canciones en el bundle durante el build, así
  que la búsqueda y el cambio de tono son instantáneos y funcionan sin conexión
  después de la primera carga.
- Las líneas largas se cortan en el celular sin separar el acorde de su sílaba,
  porque cada par acorde-sílaba es una columna flex.

## Ideas para después

- Lista del domingo: un archivo que agrupe canciones en orden con el tono
  elegido para ese servicio.
- Panel de edición web con Decap CMS, que hace el commit por detrás. Se agrega
  sin rehacer nada de esto.
- Diagramas de acordes para los que recién empiezan.
