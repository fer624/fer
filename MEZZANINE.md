# Almacén 0001 — gaveteros en el gemelo digital

Documenta la capa `A0001` de `gemelo-digital-cd.html` (botón **Mezzanine** del HUD).
Reemplaza al modelo inventado de las versiones V23–V24.

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

## 2. Lo que SÍ es provisional: el emplazamiento

El maestro trae las coordenadas X, Y y Z **en cero**. Las filas se arman por
orden de cuerpo dentro de cada pasillo, con estas reglas:

- Un cuerpo mide 0,90 × 0,72 × 1,85 m, con paso de 0,94 m.
- Los pasillos con columnas de una sola paridad son una fila simple.
- El pasillo 02 tiene columnas pares e impares: se arma como fila doble espalda
  contra espalda, pares mirando a un pasillo e impares al otro (lo que dice la
  Hoja2 del maestro).
- Pasillos y alturas se definen en la constante **`LAY0`**, al principio del
  bloque `const A0001`. **Corregir el emplazamiento contra el plano real es
  editar esas seis líneas y nada más.**

Hasta tener el plano con los cuerpos numerados, las posiciones en planta son una
hipótesis; la estructura, los códigos y los datos no.

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
