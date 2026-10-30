# Créditos y licencias de los assets

Registro de dónde viene cada asset y bajo qué licencia. Si agregas algo descargado,
anota aquí la fuente, el autor, la licencia, el enlace y la fecha de descarga.

## Imágenes

| Asset | Origen | Licencia / notas |
|---|---|---|
| `public/assets/sprites/arena/suelo.jpg` | Generado con ChatGPT (imagen), procesado en el proyecto | Revisar los términos de uso de OpenAI vigentes al publicar |
| `public/assets/sprites/jugador/cuerpo.png` y `variantes/` | Generado con ChatGPT; recorte y recoloreado de la capa hechos en el proyecto | Ídem |
| `public/assets/sprites/jefes/relojero/esfera.png` | Generado con ChatGPT, recortado en el proyecto | Ídem |
| `public/assets/sprites/jefes/relojero/esfera-fase2.png` | Derivado de `esfera.png` en el proyecto (grietas, tinte y marcas por código) | Ídem |

## Sonidos

| Asset | Origen | Licencia / notas |
|---|---|---|
| Todos los efectos en `public/assets/sonidos/` | Mezcla de dos capas: (1) capas orquestales compuestas en `herramientas/capas_orquestales.mjs` y renderizadas con **GeneralUser GS** (el mismo banco que la música); (2) capas sintéticas hechas desde cero en `herramientas/generar_sonidos.py` (silbidos, resortes, chasquidos). Sin grabaciones de terceros ni IA. | Las capas orquestales siguen la licencia de GeneralUser GS (ver Música). Las sintéticas son propias del proyecto. |

## Música

| Asset | Origen | Licencia / notas |
|---|---|---|
| `public/assets/musica/relojero.mp3` | Compuesta por código en `herramientas/componer_musica.mjs` (partitura propia) y renderizada con el banco de sonidos **GeneralUser GS v2.0.3** de S. Christian Collins (https://www.schristiancollins.com/generaluser) mediante la librería spessasynth_core (Apache-2.0) | La licencia de GeneralUser GS permite usarlo "sin restricción" para crear música, privada o comercial. Su autor advierte que no puede garantizar al 100% el origen de algunas muestras, aunque declara no haber recibido reclamos desde el año 2000. Se publica solo la grabación, no el banco. |
| `public/assets/musica/menu.mp3` | Pendiente | Si usas FreePD (CC0) no hace falta atribución; si usas Incompetech (CC-BY 4.0), agrega aquí y en el juego: título, "Kevin MacLeod (incompetech.com)" y el enlace a la licencia |

## Tipografías

| Fuente | Uso | Licencia |
|---|---|---|
| **Cinzel** (The Cinzel Project Authors) | Título, opciones de los menús, nombre del jefe y anuncios en el canvas | SIL Open Font License 1.1: libre para usar, incluir y distribuir con el juego |
| **EB Garamond** (The EB Garamond Project Authors) | Textos de apoyo (lema, controles, volumen) | SIL Open Font License 1.1 |

Se incluyen en el build mediante los paquetes `@fontsource/cinzel` y `@fontsource/eb-garamond`: el juego no depende de servidores de fuentes externos.
