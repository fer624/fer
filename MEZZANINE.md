# Almacén 0001 — gaveteros en el gemelo digital

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
