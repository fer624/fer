# Layout 3D del depósito

`layout3d.html` dibuja el depósito en 3D a partir del maestro de ubicaciones de
SAP WM y lo pinta según ocupación, bloqueos o antigüedad de movimiento.
Es una sola página: se abre en el navegador, sin instalar nada y sin servidor.

## Cómo usarlo

Tres maneras, de la más rápida a la más cómoda:

1. **Abrir el export tal cual.** Botón *Abrir export de SAP* (o arrastrar el
   archivo sobre el plano) y elegir el `.XLSX` que baja de SAP. Tarda unos
   segundos en un archivo de ~35.000 ubicaciones. El archivo se procesa en el
   navegador: no se sube a ningún lado.
2. **Dejarlo fijo.** Convertir el export una vez y guardarlo como
   `datos/ubicaciones.csv`; la página lo carga sola al abrirse.
   ```
   python3 tools/sap_a_csv.py Maestro_Ubicaciones.XLSX datos/ubicaciones.csv
   ```
3. **Solo mirar cómo funciona.** Sin archivo propio se carga
   `datos/ubicaciones-demo.csv`, un depósito inventado con la misma estructura.

> `datos/ubicaciones.csv` y cualquier `.xlsx` están en `.gitignore`: el maestro
> real no se sube al repositorio. Si el repo es público, mantenelo así.

## De dónde sale la geometría

El maestro de SAP **no trae coordenadas**: los campos *Coordenada X / Y / Z*
vienen en cero en las 34.496 ubicaciones. Entonces el lugar físico se deduce
del propio código de ubicación:

```
0001 - 05 - 14 - 03 - 02 - 1
 │      │    │    │    │   └─ posición  -> reparte la PROFUNDIDAD del rack
 │      │    │    │    └───── subdivis. -> reparte el ANCHO de la columna
 │      │    │    └────────── nivel     -> ALTURA
 │      │    └─────────────── columna   -> avance a lo LARGO del pasillo
 │      └──────────────────── pasillo   -> una calle; los racks van a los lados
 └─────────────────────────── tipo de almacén
```

Dos reglas más, verificadas contra el maestro:

- **Columna par / impar = lado del pasillo.** En el export, el pasillo 01 solo
  tiene columnas pares, el 03, 04 y 05 solo impares y el 02 las dos. Cada par
  de columnas consecutivas comparte posición a lo largo de la calle y se dibuja
  enfrentada.
- **Columnas compactas.** La numeración salta (02, 04, 05, 06, 08…). Por
  defecto los huecos de numeración se ignoran para que el plano no quede lleno
  de espacios fantasma. Se puede desactivar con la tilde *Columnas compactas*
  para respetar el número tal cual.

Las medidas (ancho de columna, profundidad del rack, alto de nivel y ancho de
pasillo) son **supuestos editables** en el panel de la izquierda: hay que
cargar las del depósito real para que la escala sea fiel. Nada más depende de
ellas: cambiarlas sólo re-dibuja.

Las ubicaciones sin pasillo/columna/nivel usables (tipo `0220-MANGUERAS-CDR` o
`0032-01-PISO`, 83 en el export actual) se dibujan como una grilla aparte,
delante del depósito.

## Qué muestra cada modo de color

| Modo | Para qué sirve |
|---|---|
| Estado | Vacías, con stock, marcadas completas y bloqueadas de un vistazo |
| % de ocupación volumétrica | `Volumen de carga` sobre `Volumen máximo`: dónde sobra y dónde falta lugar |
| Días sin movimiento | Zonas dormidas — el insumo para reslotting y para priorizar recuentos |
| Área de almacenamiento | Cómo están repartidas GENE, ALTI, ACOP, FILT… |
| Familia de ubicación | Primera letra del tipo (G = gavetas, E = estantes, R = racks) |

Los KPI de arriba se recalculan con los filtros aplicados, así que sirven igual
para todo el depósito que para un pasillo suelto.

## Cosas del export que conviene saber

Salen de revisar el maestro de octubre (34.496 ubicaciones, 15 tipos de almacén):

- **Coordenadas X/Y/Z vacías** en el 100% de las ubicaciones. Si alguna vez se
  cargan en SAP, conviene usarlas en lugar de deducirlas.
- **1.253 volúmenes máximos con el separador de miles roto** (`1.331` en vez de
  `1331`). El conversor los corrige cuando el valor sin puntos ya existe como
  entero en la misma columna; si no, los deja como están.
- **5.498 ubicaciones con `Volumen máximo` en 0**: no se les puede calcular
  ocupación y quedan en gris.
- **Capacidad total y Capacidad restante vienen en 0** en todo el archivo, así
  que la ocupación se calcula por volumen, no por capacidad.
- **Formato de código mixto**: la mayoría de los almacenes usa 5 segmentos
  (sin posición) y el 0001, 0020, 0025 y 0210 mezclan 5 y 6.

## Lo que falta para que sea un gemelo digital

Hoy el visor muestra *el continente*: las ubicaciones y qué tan llenas están.
Para que muestre *el contenido* hacen falta dos archivos más:

1. **Stock por ubicación** (SKU, cantidad, lote, vencimiento). Habilita buscar
   un artículo y que se ilumine dónde está, y colorear por vencimiento o por
   clase ABC.
2. **Movimientos históricos** (picks por ubicación). Habilita el mapa de calor
   de recorridos y medir el impacto de un reslotting.

Y para que las distancias sean reales, el plano del depósito con las medidas
de pasillos, portones y dársenas.

## Estructura

```
layout3d.html             visor (HTML + JS, sin build)
lib/three/                three.js r160 y OrbitControls (copia local, licencia MIT)
lib/xlsx/                 SheetJS, para leer el .XLSX en el navegador
tools/sap_a_csv.py        export de SAP -> CSV liviano
tools/datos_demo.py       genera el depósito de muestra
datos/ubicaciones-demo.csv  datos inventados para probar
```

Las librerías están copiadas en el repo a propósito: así la página funciona en
una red interna sin salida a internet.
