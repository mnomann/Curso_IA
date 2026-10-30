# Assets finales

Todo el arte y el sonido van en **`public/assets/`** (Vite publica esa carpeta tal cual). **Ningún archivo es obligatorio**: mientras un asset no esté listo, el juego dibuja las formas geométricas actuales o se queda en silencio.

## Cómo agregar uno

1. Copia el archivo a `public/assets/` en la ruta de la tabla (las carpetas ya existen).
2. Abre `src/config/manifiesto.ts` y cambia `listo: false` por `listo: true` en esa línea.
3. Con `npm run dev` corriendo, el juego se recarga solo. En la consola del navegador aparece cuántos assets se cargaron y avisa si alguno falló.

Si cambias el nombre de un archivo, cambia también su `ruta` en el manifiesto. Las rutas de la tabla son relativas a `public/assets/`.

## Lo que se queda geométrico a propósito

Los **avisos de ataque** (cuñas rojas del barrido, anillos de la campanada, línea punteada del engranaje, abanico del golpe del jugador, brillo de la esfera antes de cada pulso) no se reemplazan por sprites. Son información de juego y tienen que leerse igual con cualquier arte. Si quieres cambiarlos, se hace en el código del ataque, no aquí.

## Sprites

Formato PNG con fondo transparente. Los tamaños recomendados son el doble del tamaño en pantalla, para que se vean nítidos en pantallas de alta densidad. Vista desde arriba.

| Clave | Archivo | Tamaño recomendado | Orientación y notas |
|---|---|---|---|
| `arena.suelo` | `sprites/arena/suelo.jpg` | 1776 × 1136 | Suelo interior completo (se dibuja a 888 × 568). JPG porque no necesita transparencia y pesa mucho menos. Los muros siguen siendo geométricos. |
| `jugador.cuerpo` | `sprites/jugador/cuerpo.png` | 256 × 256 | Mirando a la **derecha**; el juego lo rota hacia donde mira. El **centro del cuerpo** debe estar en el centro de la imagen; la espada puede sobresalir. El lado en pantalla se ajusta en `sprite.tamano` (src/config/jugador.ts). Sin sombra (la pone el juego). |
| `relojero.esfera` | `sprites/jefes/relojero/esfera.png` | 256 × 256 | Círculo que llena toda la imagen, con sus 12 marcas. Las marcas geométricas solo aparecen encima cuando parpadea por daño. |
| `relojero.esferaFase2` | `sprites/jefes/relojero/esfera-fase2.png` | 256 × 256 | Versión dañada para la fase 2 (marcas en las mismas posiciones que la normal). Si falta, se usa la normal con un tinte rojo. |
| `relojero.agujaLarga` | `sprites/jefes/relojero/aguja-larga.png` | 350 × 28 | Horizontal, apuntando a la **derecha**; el pivote es el **borde izquierdo al centro**. Se **estira** a lo largo (de ~47 px en reposo a 175 px en el barrido): conviene un diseño simple que aguante estirarse. |
| `relojero.agujaCorta` | `sprites/jefes/relojero/aguja-corta.png` | 220 × 22 | Igual que la larga (se estira de ~32 a 108 px en fase 2). |
| `relojero.engranaje` | `sprites/jefes/relojero/engranaje.png` | 64 × 64 | Rueda dentada centrada; el juego la hace girar. Se dibuja a 30 px. |
| `relojero.llave` | `sprites/jefes/relojero/llave.png` | 64 × 64 | Llave de dar cuerda, centrada; gira sobre el jefe tras la campanada. |
| `ui.fondoMenu` | `fondos/menu.jpg` | 1920 × 1280 (horizontal 3:2) | Ilustración del menú de inicio y de Opciones. Se recorta para cubrir la pantalla; el tercio izquierdo queda oscurecido por el juego para el título y las opciones. Ver la sección siguiente. |
| `ui.frasco` | `sprites/ui/frasco.png` | 48 × 48 | Carga de curación disponible. Se dibuja a 18 px. |
| `ui.frascoVacio` | `sprites/ui/frasco-vacio.png` | 48 × 48 | Carga gastada. Si falta, se usa el frasco lleno semitransparente. |

**Colores del jugador:** `sprites/jugador/variantes/` tiene la capa en azul oscuro (original), azul brillante, marfil y verde esmeralda. `cuerpo.png` es una copia de `marfil.png`, la que mejor se distingue sobre el suelo, dentro de las cuñas rojas y junto a los anillos. Para cambiarla, copia otra variante encima de `cuerpo.png` o cambia la ruta en el manifiesto. Las variantes se publican junto al juego (pesan poco); si quieres un despliegue más liviano, borra las que no uses.

## Ilustración del menú

Mientras no exista `fondos/menu.jpg`, el menú usa el suelo de la torre en penumbra con la esfera del jefe apagada a la derecha. Para la ilustración final, este prompt está pensado para que calce con el arte que ya tiene el juego (pégalo en inglés):

```
Wide landscape illustration, 3:2 aspect ratio, for the title screen of a dark fantasy game.
Interior of an old stone clock tower at night. On the right two-thirds of the image, a giant
stopped clock face dominates the scene: cream parchment dial, thick brass bezel with rivets,
twelve thick dark trapezoid hour markers and NO numbers, two black iron hands frozen in place,
the long hand with a red tip. Behind it, huge brass gears and mechanisms half lost in shadow.
Cold moonlight enters through a high window, dust floating in the light beams. Slate-grey stone
floor with small brass inlays. At the bottom right, very small compared to the clock, a lone
hooded knight in an ivory cloak seen from behind, sword lowered, looking up at the clock.
The left third of the image is dark and empty (deep shadow, almost black, no objects), so a
title can be placed there.
Style: painterly digital illustration, clean dark outlines, soft cel shading, muted brass and
parchment palette, deep warm brown-black shadows, low-key lighting; the only saturated color
is the red tip of the clock hand.
No text, no letters, no numbers, no roman numerals, no logo, no signature, no watermark, no frame.
```

Revisa antes de usarla:
- **Que no tenga texto ni números.** Las IA suelen inventar letras (como el "VΛ" del suelo actual).
- **Que el tercio izquierdo esté oscuro y vacío.** Si no, el título se pierde.
- **Que el caballero sea de capa clara**, como el sprite del jugador.

Guárdala como `public/assets/fondos/menu.jpg` (JPG con calidad 85 basta) y cambia `listo: false` por `listo: true` en la línea `ui.fondoMenu` del manifiesto.

## Sonidos

Formato MP3 (funciona en todos los navegadores). Efectos cortos, sin silencio al inicio: si el archivo empieza con 200 ms de silencio, el sonido llega tarde respecto del aviso.

**Los 14 efectos actuales se generan por código** y están pensados como parte de la música de pelea: usan sus mismos instrumentos (campana tubular, pizzicato, timbales, metales, coro) y su tonalidad (re), con capas sintéticas solo donde la orquesta no sirve (silbido de la espada, rodada, resortes). La campana es exclusiva de la campanada, para que nunca se confunda con los golpes del jugador. Para escucharlos sin pelear, con `npm run dev` corriendo abre `/herramientas/probar-sonidos.html`.

Para cambiar uno: las partes orquestales están en `herramientas/capas_orquestales.mjs` (se renderizan a `herramientas/capas/` con `npm run audio:capas -- ruta/GeneralUser-GS.sf2`; el banco GeneralUser GS se descarga aparte desde https://www.schristiancollins.com/generaluser) y la mezcla final en `herramientas/generar_sonidos.py` (`python herramientas/generar_sonidos.py`, necesita numpy, scipy y ffmpeg), que también nivela el volumen percibido de cada uno. Si reemplazas uno por un archivo propio, basta con sobrescribir el MP3 con el mismo nombre.

| Clave | Archivo | Cuándo suena |
|---|---|---|
| `jugador.ataque` | `sonidos/jugador/ataque.mp3` | Al empezar un golpe |
| `jugador.impacto` | `sonidos/jugador/impacto.mp3` | Cuando el golpe daña al jefe |
| `jugador.rodada` | `sonidos/jugador/rodada.mp3` | Al rodar |
| `jugador.curacion` | `sonidos/jugador/curacion.mp3` | Cuando la cura se aplica (al final, no al pulsar E) |
| `jugador.herido` | `sonidos/jugador/herido.mp3` | Al recibir daño |
| `jugador.muerte` | `sonidos/jugador/muerte.mp3` | Al morir |
| `relojero.avisoBarrido` | `sonidos/jefes/relojero/aviso-barrido.mp3` | Al aparecer la cuña roja (700 ms antes del barrido) |
| `relojero.barrido` | `sonidos/jefes/relojero/barrido.mp3` | Cuando la aguja empieza a barrer |
| `relojero.campanada` | `sonidos/jefes/relojero/campanada.mp3` | En cada pulso del anillo |
| `relojero.engranajeFijado` | `sonidos/jefes/relojero/engranaje-fijado.mp3` | Cuando la línea punteada se fija (600 ms antes del disparo) |
| `relojero.engranajeDisparo` | `sonidos/jefes/relojero/engranaje-disparo.mp3` | Al salir el engranaje |
| `relojero.fase2` | `sonidos/jefes/relojero/fase2.mp3` | Al pasar a fase 2 |
| `relojero.muerte` | `sonidos/jefes/relojero/muerte.mp3` | Al derrotarlo |
| `ui.victoria` | `sonidos/ui/victoria.mp3` | En la pantalla de victoria |
| `musica.menu` | `musica/menu.mp3` | En bucle en el menú |
| `musica.relojero` | `musica/relojero.mp3` | En bucle durante la pelea |

Los volúmenes por defecto están en `src/config/juego.ts` (`audio`); el jugador los ajusta en **Opciones** (menú principal o pausa) y quedan guardados en su navegador. Para nivelar un archivo puntual, agrega `volumen: 0.6` en su línea del manifiesto.

**Música de pelea:** `musica/relojero.mp3` está compuesta por código (`herramientas/componer_musica.mjs`, se ejecuta con `npm run audio:musica -- ruta/GeneralUser-GS.sf2 salida.wav`) y dura exactamente 64 s. Su entrada en el manifiesto tiene `bucle: 64`: el juego la reproduce con Web Audio y repite justo esos 64 s, sin el hueco que deja `<audio loop>` con MP3. Si la reemplazas por otra música en bucle, pon en `bucle` su duración exacta en segundos; si no es un bucle preparado, quita esa propiedad.

Nota: los navegadores bloquean el audio hasta el primer clic o tecla. La música del menú puede no sonar al abrir la página por primera vez; empieza en cuanto el jugador interactúa.

## Fuentes

Pon el archivo (`.woff2` de preferencia) en `public/assets/fuentes/` y sigue el comentario al inicio de `src/estilos.css`. Luego agrega el nombre de la fuente al inicio de `ui.fuente` en `src/config/juego.ts` para que el texto del canvas (barras, nombre del jefe, anuncios) también la use.
