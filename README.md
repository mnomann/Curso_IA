# El Relojero Sin Hora

Minijuego souls-like de vista superior: una pelea contra el guardián de una torre cuyo reloj se detuvo. Hecho en **TypeScript** con canvas, sin librerías ni motores de juego, y compilado con **Vite**.

## Requisitos

- **Node.js 22.12 o superior** (`node --version` para revisarlo).
- La primera vez, desde esta carpeta: `npm install`

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Juega en tu computador. Abre la dirección que aparece (normalmente `http://localhost:5173`). Al guardar un archivo, el juego se recarga solo. Se apaga con **Ctrl + C**. |
| `npm run typecheck` | Revisa los tipos sin compilar: detecta errores de tipeo en el código y en el CONFIG. |
| `npm test` | Corre las pruebas: peleas automáticas, fases, victoria/muerte, la matemática de esquiva del anillo y el menú de opciones. |
| `npm run build` | Revisa los tipos y genera la versión publicable en `dist/`. Si hay un error de tipos, **no** se genera. |
| `npm run preview` | Sirve `dist/` para probar la versión publicable antes de subirla. |

Abrir `index.html` con doble clic no funciona: el juego necesita `npm run dev` (o Vercel). Si lo intentas, la página explica qué hacer.

## Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub (sin `node_modules/` ni `dist/`; el `.gitignore` ya los excluye).
2. En Vercel, **Add New → Project** e importa el repositorio.
3. Vercel detecta Vite solo: comando de build `npm run build`, carpeta de salida `dist`. No hay que configurar nada más.

Cada `git push` vuelve a publicar. Si el código tiene un error de tipos, el build falla y Vercel mantiene la versión anterior en línea, en vez de publicar un juego roto.

## Estructura

```
el-relojero-sin-hora/
├── index.html                 Canvas y pantallas HTML (menú, opciones, pausa, muerte, victoria)
├── package.json               Dependencias y comandos
├── tsconfig.json              TypeScript en modo estricto
├── vite.config.ts             Build y pruebas
├── ASSETS.md                  Tamaños, orientación y uso de cada asset
├── CREDITOS.md                Origen y licencia de cada asset
├── public/assets/             ⇦ AQUÍ VAN LOS ASSETS FINALES (se publican tal cual)
│   ├── fondos/  sprites/  sonidos/  musica/  fuentes/
├── src/
│   ├── main.ts                Punto de entrada: crea las piezas y las conecta
│   ├── estilos.css            Estilos de las pantallas HTML (paleta y tipografía comentadas al inicio)
│   ├── config/                ⇦ TODOS LOS NÚMEROS AJUSTABLES
│   │   ├── juego.ts           Resolución, física, pantallas, audio por defecto, fuente
│   │   ├── jugador.ts         Vida, estamina, ataque, rodada, curación
│   │   ├── manifiesto.ts      Lista de sprites y sonidos; se activan con listo: true
│   │   └── index.ts           Junta todo en CONFIG
│   ├── nucleo/                Motor del juego, independiente del jefe
│   │   ├── Juego.ts           Estado, bucle a paso fijo y servicios (golpear jugador, dañar jefe, fases)
│   │   ├── Entrada.ts         Teclado y búfer de acciones
│   │   ├── Renderizador.ts    Orden de dibujo, escalado y modo depuración (tecla H)
│   │   ├── Hud.ts             Barras, cargas de curación, nombre del jefe, anuncios
│   │   ├── Arena.ts           Límites y dibujo de la arena
│   │   ├── Pantallas.ts       Menús, aguja selectora, volumen, fondo del menú y pantallas de muerte/victoria
│   │   ├── GestorAssets.ts    Carga de sprites/sonidos con respaldo geométrico; música en bucle con Web Audio
│   │   ├── Preferencias.ts    Volumen elegido por el jugador, guardado en el navegador
│   │   ├── Particulas.ts      Chispas
│   │   └── utilidades.ts, dibujo.ts
│   ├── entidades/
│   │   ├── Jugador.ts         Movimiento, ataque, rodada, curación
│   │   └── Proyectil.ts       Clase base abstracta de proyectiles
│   └── jefes/
│       ├── Jefe.ts            Clase base abstracta del jefe
│       ├── Ataque.ts          Clase base abstracta de ataques (aviso → ejecución → recuperación)
│       ├── registro.ts        Jefes que aparecen en el menú
│       └── relojero/          El Relojero Sin Hora
│           ├── Relojero.ts    Máquina de estados, elección de ataques, dibujo del cuerpo
│           ├── config.ts      ⇦ Todos sus números
│           ├── analisis.ts    Chequeo numérico anillo/aguja vs. rodada
│           ├── dibujo.ts      Formas propias (cuñas, agujas, engranaje)
│           ├── ataques/       BarridoAguja, Campanada, LanzarEngranaje
│           └── proyectiles/   Anillo, Engranaje
├── tests/juego.test.ts        Pruebas (npm test)
└── herramientas/              No se publican: generan los sonidos y la música
    ├── capas_orquestales.mjs  Partes orquestales de los efectos
    ├── capas/                 Esas partes ya renderizadas
    ├── generar_sonidos.py     Mezcla y nivela los efectos (Python)
    ├── componer_musica.mjs    Partitura y render de la música de pelea
    └── probar-sonidos.html    Escuchar los efectos: con npm run dev, abre /herramientas/probar-sonidos.html
```

## Dónde ajustar números

Todo valor numérico está en `src/config/` y en `src/jefes/relojero/config.ts`, comentado. TypeScript revisa cada uso: si escribes `C.barido.aviso` en vez de `C.barrido.aviso`, el editor lo marca en rojo y `npm run build` se detiene con el error, en vez de que el aviso del ataque desaparezca sin explicación.

Pulsa **H** en el juego para ver estados, hitboxes y el análisis de esquiva del anillo con los valores actuales. Ese análisis también se imprime en la consola del navegador al cargar, y `npm test` compara la fórmula con la simulación real.

## Agregar assets

Ver `ASSETS.md`. En resumen: copias el archivo a `public/assets/...` y cambias `listo: false` por `listo: true` en `src/config/manifiesto.ts`.

## Editor recomendado

**VS Code** entiende TypeScript sin instalar nada: muestra los errores mientras escribes y autocompleta las claves del CONFIG y de los assets.
