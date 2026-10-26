# CD Repuestos — almacenes 0001, 0010 y 0020 en el gemelo digital

Documenta la capa `A0001` de `gemelo-digital-cd.html` (botón **Mezzanine** del HUD).
Reemplaza al modelo inventado de las versiones V23–V24.
Emplazamiento calcado del Lay Out del CDR y verificado contra SAP.

## 1. De dónde sale

Del maestro de ubicaciones de SAP WM (`UBIS_0001.xlsx`, extracto del
**10-jul-2026**). La topología **no se inventa**: el bloque `D0001` embebido en
el HTML trae los 169 cuerpos, 1.396 cajones y 19.562 ubicaciones reales, más la
foto de stock de esa fecha (estado, llenado volumétrico, antigüedad, bloqueos y
tipo de ubicación). El código se reconstruye, no se genera:

```
0001  -  05   -  47   -  03   -  02    -  1
almacén  pasillo cuerpo  cajón  subdiv.   posición
```

| Zona | Pasillos | Cuerpos | Ubicaciones | Ocupación al 10-jul-2026 |
|---|---|---|---|---|
| Planta baja del mezzanine | 01, 02, 03 | 112 | 12.519 | 80 % |
| Altillo | 05, 06 | 41 | 5.481 | 12 % |
| Fuera del mezzanine | 04 | 16 | 1.562 | 98 % |
| **Total** | | **169** | **19.562** | **62 %** |

Los niveles 1 a 7 se dibujan como cajones; los niveles 8 y 9 (sólo en los
pasillos 01, 02 y 03, con código de 5 segmentos) se dibujan como cajas sobre el
gabinete, porque no son cajones del mueble.

## 2. Emplazamiento — calcado del plano maestro

Sale de la hoja **"Plano FASA con notas"** del Lay Out del CDR, y está
**verificado**: cada fila de gabinetes del plano trae la capacidad de cada
cuerpo como `compartimentos/cajones` (`25/7` = 175, `16/7` = 112, `9/7` = 63,
`6/6` = 36) más la caja `1/2` de arriba, y esa secuencia se cruzó contra la del
maestro de SAP para saber qué fila es qué pasillo:

| Fila del plano | Pasillo SAP | Coincidencia |
|---|---|---|
| `Pas 1 Gabin` superior | 01 pares | 27 de 28 |
| `Pas 1 Gabin` inferior | 02 impares | 27 de 28 |
| `Pas 2 Gabin` superior | 02 pares | 18 de 28 |
| `Pas 2 Gabin` inferior | 03 impares | 20 de 28 |
| `Pas 5 Gabin` | 05 impares | **28 de 28** |
| `Pas 6 Gabin` | 06 pares | **13 de 13** |

De ahí sale la regla que antes faltaba: **el pasillo de SAP es el corredor, y
par/impar son sus dos lados**. Dos filas van espalda contra espalda entre
corredor y corredor, que es exactamente lo que decía la Hoja2 del maestro
(`PASILLO: 0001-01 / 0001-02` y `PASILLO: 0001-02 / 0001-03`):

```
===== pasillo 01 =====
fila de cuerpos PARES   de 01      mira al 01
fila de cuerpos IMPARES de 02      mira al 02
===== pasillo 02 =====
fila de cuerpos PARES   de 02      mira al 02
fila de cuerpos IMPARES de 03      mira al 03
===== pasillo 03 =====
```

El altillo repite el esquema con el pasillo 06 (pares) y el 05 (impares)
espalda contra espalda. Los cuerpos van en **grupos de 7 con una calle
transversal** entre grupo y grupo, como los separa el plano en secciones
A, B, C, D / E, F, G, H.

Se ajusta en las constantes `FILAS`, `X0`, `PITCH` y `GAP` del bloque `A0001`.

**Lo que todavía no está calcado:** el pasillo 04, que está fuera del mezzanine
y en el plano no aparece en el mismo bloque, así que sigue en una posición
tentativa; y las medidas del gabinete (0,80 × 0,62 × 1,85 m), tomadas para que
28 cuerpos más tres calles entren en el ancho del mezzanine, no de una cota.

## 2b. El resto de la maqueta, también del plano

El plano no sólo ubica los gabinetes: dibuja todo el almacenaje. La maqueta se
construye entera desde ahí.

| | Cuerpos | Posiciones |
|---|---|---|
| Gabinetes planta baja (filas D11–D14) | 112 | 12.519 en SAP |
| Gabinetes altillo (filas H1–H2) | 56 | 2.638 en SAP + 15 cuerpos sin alta |
| Gabinetes pasillo 04 (fuera del mezzanine) | 16 | 1.562 en SAP |
| Estanterías planta baja (filas D0–D10) | 229 | 4.744 instaladas, sin maestro |
| Estanterías altillo (filas H3–H7) | 54 | 1.666 instaladas, sin maestro |
| Racks de pallets R01–R16 (8 pasillos) | 128 | 3.520 instaladas, sin maestro |
| **Total modelado** | **595** | |

Las celdas `N/M` del plano se leen igual en todos lados: **posiciones por nivel /
cantidad de niveles**. Un `4/8` de estantería son 4 posiciones en cada una de
8 bandejas; un `4/7` de rack son 4 pallets por nivel en 7 niveles.

Lo que tiene maestro en SAP se pinta con el dato real; lo que no, se dibuja en
gris y el panel lo informa aparte. Así la maqueta muestra de un vistazo **dónde
hay capacidad instalada que el sistema no conoce**: 283 cuerpos de estantería,
15 gabinetes del altillo y los 16 racks de pallets.

## 2c. Los dos almacenes del mezzanine

La Base Ubis V2 trae los 15 tipos de almacén del CD (33.311 ubicaciones). En el
mezzanine conviven dos, y la maqueta los carga a los dos:

| Almacén | Qué es | Cuerpos | Ubicaciones |
|---|---|---|---|
| 0001 | Gabinetes de cajones | 169 | 19.562 |
| 0020 | Estanterías | 249 | 5.837 |

El mapeo fila del plano ↔ maestro está **verificado número de cuerpo por número
de cuerpo**, no inferido. La regla es la misma en los dos almacenes: el pasillo
de SAP es el corredor, impares de un lado y pares del otro.

| Fila | Sección | Maestro |
|---|---|---|
| r17 / r20 | D0 / D1 | 0020 pasillo 01 impares / pares |
| r21 / r26 | D2 / D3 | 0020 pasillo 02 impares / pares |
| r27 / r30 | D4 / D5 | 0020 pasillo 03 impares / pares |
| r31 / r34 | D6 / D7 | 0020 pasillo 04 impares / pares |
| r35 / r39 | D8 / D9 | 0020 pasillo 05 impares / pares |
| r40 | D10 | 0020 pasillo 06 impares |
| r44 / r45 | D11 / D12 | 0001 pasillo 01 pares / 02 impares |
| r50 / r51 | D13 / D14 | 0001 pasillo 02 pares / 03 impares |
| r96 | H1 | 0001 pasillo 05 impares |
| r95 | H2 | 0001 pasillo 06 pares (cuerpos 2–30) **+ 0020 pasillo 07 pares (36–64)** |
| r83, r86, r87, r90, r91 | H3–H7 | sin maestro identificado |

Dos cosas que salieron de ahí:

1. **Los 15 "gabinetes sin alta" del altillo no faltaban.** Están en el almacén
   0020 pasillo 07. La fila H2 se reparte entre dos almacenes, y las capacidades
   coinciden 14 de 14 con el plano.
2. **El corredor "Pas 6 Estan" del 0020 y el "pasillo 01" del 0001 son el mismo
   pasillo físico**, numerado distinto en cada almacén. Por eso el pasillo 01 del
   0001 tiene gabinetes de un solo lado: enfrente tiene la estantería D10.

El orden de la foto de stock es el del maestro, no el del plano, así que cada
cuerpo guarda su offset canónico dentro de los arrays embebidos. Si eso se
desalinea, la ocupación se lee de otra ubicación y el síntoma es un pasillo con
un porcentaje absurdo.

## 2d. Racks de pallets — almacén 0010

El 0010 usa otra convención: numera los cuerpos **1 a 16 corridos**, alternando
impar y par entre los dos lados del pasillo (en el 0001 y el 0020 los números
corren de 1 a 63). Son 9 pasillos repartidos en las dos naves:

| Nave | Pasillos | Cuerpos | Ubicaciones | Ocupación |
|---|---|---|---|---|
| Nave 1 | 01–06 | 96 | 2.298 | 71 % |
| Nave 2 | 10–12 | 54 | 1.540 | 66 % |
| | | **150** | **3.838** | **69 %** |

Los pasillos 01 a 03 son el área FILT (filtros) y el resto GENE. Los niveles van
de 5 a 11 según el pasillo, y la altura de nivel se calcula para que el rack más
alto no pase de 10,5 m dentro del galpón.

La geometría sale entera del maestro: cuerpos, niveles y posiciones por nivel.
Cada ubicación es un pallet, y el bulto que lleva encima crece con el llenado
volumétrico. La disposición —dos filas por pasillo, filas de pasillos contiguos
espalda contra espalda— es la del plano. Las cotas (paso de 2,20 m, fondo de
1,10 m, pasillo de 3,30 m) son de rack estándar, no del plano: se ajustan en la
constante `R10`.

**El reparto por nave es una hipótesis**: el maestro no dice en qué nave está
cada pasillo. Lo armé con los pasillos 01–06 en Nave 1 y 10–12 en Nave 2, que es
lo que sugiere el salto en la numeración (el 07, 08 y 09 son del almacén 0011) y
que los pasillos 10–12 tengan más niveles. Corregirlo es mover un pasillo de
lista en `R10.naves`.

**Cuidado con el orden de construcción.** La capa de racks tiene que correr
antes de la red de seguridad que cuelga los cuerpos huérfanos; si corre después,
los 150 cuerpos se crean dos veces y las ubicaciones se duplican.

## 3. Qué muestra

Seis modos de color sobre los frentes de los cajones:

| Modo | Qué pinta | Escala |
|---|---|---|
| Ocupación | % de compartimentos ocupados del cajón | secuencial azul |
| Llenado | volumen cargado sobre la capacidad | secuencial azul |
| Antigüedad | meses desde el último movimiento | secuencial naranja |
| Vacíos | cajones sin stock | destacado / recesivo |
| Bloqueos | bloqueo de entrada o salida | estado crítico |
| Tamaño | capacidad del gavetín (≤1,5 L / ≤2,5 L / >2,5 L) | categórico 1-3 |

Clic en un cajón abre la grilla de sus compartimentos, y clic en un
compartimento da su código, estado, llenado, antigüedad, tipo y capacidad.
Todas las escalas están validadas contra la superficie del panel (`#1b232b`):
banda de luminosidad, piso de croma, separación para daltonismo y contraste.

## 4. Subir una foto de stock

**Cargar stock** acepta un CSV con el delimitador que sea (`,`, `;` o
tabulación), UTF-8 con o sin BOM y coma decimal. Reconoce los encabezados
nativos del extracto de SAP, así que alcanza con guardar el reporte como CSV:

| Columna de SAP | Para qué se usa |
|---|---|
| `Ubicación` | **obligatoria**, se cruza contra el maestro |
| `Ind.ubicación vacía` | X = vacía |
| `Volumen de carga` + `Volumen máximo` | % de llenado |
| `Fe.último movimiento` | antigüedad (la fecha de corte se deduce del máximo del archivo) |
| `Bloq.salida stock` / `Bloq.entrada stock` | bloqueos |

También acepta `cantidad` u `ocupación` genéricas. Las ubicaciones que no estén
en el archivo se muestran vacías y el panel informa cuántas quedaron sin dato.
**Original** vuelve a la foto embebida. **Exportar CSV** baja las 19.562
ubicaciones con su estado actual.

## 5. Calidad de datos del maestro (a corregir en SAP)

- **233 códigos de 5 segmentos** en los niveles 08 y 09 de los pasillos 01, 02 y
  03. Rompen cualquier integración que parsee el código por posición.
- **El campo "Área de almacenamiento" no indica el piso**: el pasillo 06 está en
  el altillo pero figura como GENE igual que la planta baja. Sólo el 05 es ALTI.
- **1.557 ubicaciones con volumen máximo en 0** (1.179 ocupadas): el control de
  capacidad no actúa ahí.
- **89 ubicaciones sobrepasadas**, la peor al 3.420 % de su capacidad.
- 5 filas donde el código y los campos Pasillo/Columna/Nivel no coinciden.
- 300 sin tipo de ubicación, 171 sin área, 167 ocupadas con volumen de carga 0.
- El maestro son dos cargas masivas (2024-05-22 y 2025-10-27, 93 % de las
  modificaciones): tipos y capacidades son valores por defecto, no medidos.
