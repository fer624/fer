# fer

Herramientas internas, sin dependencias ni backend. Se abren con doble clic.

| Archivo | Para que sirve |
|---|---|
| `aging.html` | Aging de ubicaciones criticas. Un unico archivo, funciona sin internet. |
| `operador.html` | Carga de turnos del mostrador |
| `monitor.html` | Tablero de espera para la TV del mostrador |

## aging.html

Reemplaza el calculo manual del libro `Aging_ddmmaa.xlsx`. Replica sus formulas:

| Concepto | Formula |
|---|---|
| Aging | `NETWORKDAYS(Fecha Aging; corte)` — lun a vie, cuenta ambos extremos, **sin feriados** |
| Valorizado | `Precio x Cantidad` |
| Fuera de aging | `Aging >= Target` |
| Dias maximos | maximo de aging entre todas las lineas del area |

`Fecha EM` no se usa para nada. Si la base no trae la columna `Fecha Aging`, se rechaza
en vez de calcular con otra cosa.

### Las pantallas

**Panorama** — la principal. Arranca separando el stock en dos secciones, cada una con su
subtotal, porque no todas las ubicaciones significan lo mismo:

| Seccion | Que es | Como se lee |
|---|---|---|
| **Stock retenido** | mercaderia parada por un problema: reclamos, daños, mermas, garantias | el stock en si es el tema |
| **Transito operativo** | mercaderia de paso hacia recepcion o despacho | que haya stock es normal; lo que importa es que no se frene |

El tipo se **deriva del target**, que ya codifica la diferencia: hasta 7 dias es transito,
mas es retencion. Manda lo mas especifico que haya cargado: **ubicacion > area > target**.

El corte se hace **por ubicacion**, no por area, porque dentro de un area puede haber de las
dos: `0900-SLOTTING` tiene target 1 y es transito, mientras el resto de 0900 tiene 90 y es
retencion. Un area con ubicaciones de los dos tipos aparece en las dos secciones, con las
que le corresponden a cada una.

Se fija en la solapa **Ubicaciones**, con un desplegable por fila o marcando en bloque todo
lo que haya quedado filtrado. La eleccion queda guardada y se exporta en el CSV.

Dentro de cada seccion hay un bloque por area, y dentro **una barra por ubicacion**,
ordenadas de mayor a menor. Todas las barras comparten la misma escala, asi se comparan
entre areas distintas; cada barra va partida por banda de atraso, para ver de que esta
hecha la ubicacion y no solo cuanto pesa. Es una tabla con barras y no un grafico suelto:
con decenas de ubicaciones cada fila necesita su cifra al lado, y asi **se imprime entera**.

Un clic en una ubicacion la selecciona y el panel de la derecha muestra su detalle y sus
lineas mas caras; un clic en una linea abre su ficha, con la Fecha Aging editable ahi mismo.
Tres medidas, y la tercera importa: **por plata**, **por lineas** y **por severidad**
(cuantas veces se paso del target). Con plata gana siempre el area de mas volumen; por
severidad el orden se da vuelta y sube lo que esta peor en proporcion a su propio target.
Mas un interruptor para ver solo lo frenado o todo el stock.

**Lineas** — la tabla completa, con filtros: SKU, descripcion, cantidad, precio unitario,
valorizado, dias y target. Aca tambien se edita la `Fecha Aging` de cada linea.

**Evolucion** — la plata frenada corte a corte, con el delta contra el anterior.

**Datos**, **Ubicaciones** y **Maestro** — la configuracion.

### Como se usa

1. **Datos** → arrastrar el `Base_Aging_ddmmaa.XLSX` del lunes. Es el export crudo del WMS,
   con la columna `Fecha Aging` completada. Tambien acepta el libro completo
   `Aging_ddmmaa.xlsx`, del que ademas lee las hojas de configuracion.
2. **Datos** → arrastrar el export de **movimientos de HU** (opcional, pero evita completar
   la `Fecha Aging` a mano) y `Base Item Valorizados.xlsx`: queda guardado en el navegador (unos
   470 KB con los 22.398 materiales). Espera el `Material` en la columna A y el
   `Precio interno periodico` en la H. Los precios estan en USD.
3. **Panorama** → mirar, y **Reporte PDF** para imprimirlo o guardarlo.
4. **Guardar corte** → agrega un punto a la evolucion.

Las 199 ubicaciones criticas y las 9 areas vienen cargadas de fabrica, asi que no hace falta
el libro grande para arrancar.

La configuracion (ubicaciones, areas, maestro, ajustes de fecha e historico) vive en el
LocalStorage del navegador: es por equipo y por navegador, no se comparte entre personas.

### Las bandas de atraso

El mapa no agrupa por dias sino por **cuanto se paso cada linea del target de su area**,
porque los targets van de 2 a 90 dias: 22 dias en 8030 (target 2) es mucho peor que 77 en
0900 (target 90).

| Banda | Significa |
|---|---|
| Dentro del target | `aging < target`. Es contexto, va en gris. |
| Hasta 2x | se paso, pero poco |
| 2 a 5x | |
| Mas de 5x | |

Las tres bandas de atraso son una rampa de un solo hue de claro a oscuro, por ser una escala
ordenada y no categorias sueltas. Validada sobre blanco: lightness monotona, saltos visibles
y el extremo claro por encima de 2:1.

### El reporte PDF

El boton **Reporte PDF** imprime el Panorama tal como esta en pantalla, con lo que tengas
elegido en los interruptores. Sale apaisado, con un encabezado propio (corte, plata frenada,
lineas, areas en rojo), sin el menu ni el panel lateral, y cada bloque de area entero en una
sola hoja.

**Las celdas muy chicas** se agrandan hasta un minimo y, cuando hay varias, se les reserva una
franja al pie: repartidas junto con las grandes quedarian en tiras de pocos pixeles y
desaparecerian de la vista. La cifra que se lee adentro y en el globo siempre es la real.

### De donde sale la Fecha Aging

No hace falta completarla a mano. Si la columna viene vacia, se deriva asi, en orden:

| Orden | Fuente | Cuando aplica |
|---|---|---|
| 1 | **Ajuste a mano** | si pisaste la fecha desde la herramienta |
| 2 | **Columna `Fecha Aging`** | si el archivo la trae cargada |
| 3 | **Ultimo movimiento de su HU** | si la linea tiene HU y cargaste el export de movimientos |
| 4 | **`Fecha EM`** | stock sin HU: no se movio desde que entro al almacen |

La regla sale de los datos. Sobre la base del 13-oct, de 463 lineas:

- **422 tienen HU** y en ninguna coincide `Fecha Aging` con `Fecha EM`: son bultos armados
  para despacho, que entraron al almacen mucho antes de llegar a la ubicacion.
- **41 no tienen HU** y en 40 las dos fechas coinciden: es stock que no se movio.

En la zona de carga hay un boton **Copiar las HU** que pone en el portapapeles la lista de
HU distintas del stock (162 para las 422 lineas de la base del 13-oct), lista para pegar en
EWM. Asi no hay que sacarla del Excel ni se escapa ninguna. Si el navegador no deja escribir
el portapapeles, la baja en CSV.

Verificado borrando la columna `Fecha Aging` del archivo: con el export de movimientos de
HU y dos ajustes a mano, las seis areas reproducen el KPI al centavo. Cada linea muestra de
donde salio su fecha, y esa columna va tambien en el CSV.

### Los ajustes de fecha

La `Fecha Aging` de cada linea se puede pisar desde la tabla de Lineas o desde el panel del
mapa. El ajuste se guarda y se vuelve a aplicar sobre la misma linea cada vez que se sube una
base nueva.

El export del WMS no trae un numero de linea: `Unidad manipulacion` e `Identificacion stock`
vienen vacias. La linea se reconoce entonces por ubicacion + producto + la `Fecha Aging` del
archivo + tipo de stock + cantidad. Con la base del 13-oct quedan 45 grupos de lineas
indistinguibles entre si; un ajuste sobre una se aplica a todo el grupo y la pantalla lo
avisa ("N gemelas").

Si en una base posterior se corrige la `Fecha Aging` de una linea ajustada, su clave cambia y
el ajuste queda marcado como "no coincide": ya no hace falta.

### Los precios repetidos

En el maestro hay 107 materiales con mas de un precio, uno por clase de valoracion:
`D8_STD.AA` tiene 48 precios distintos, de USD 0,01 a USD 787.014,57. El `XLOOKUP` del Excel
se queda con el primero y la herramienta hace lo mismo, para no cambiar los numeros; la
diferencia es que marca esas lineas como "precio dudoso" y deja ver el rango.

Al cargar un maestro con menos de la mitad de los SKU que el guardado, pregunta si reemplazar
o fusionar, para no perder precios con un archivo parcial o mal mapeado.

### La marca

Los colores salen del logo de CEVA: navy `#001038` y rojo `#f80000`.

El **navy** es el color de la interfaz: barra lateral, botones, encabezados. El **rojo**
queda reservado para la marca (el acento del menu) y nunca toca un dato, porque en los
graficos el rojo ya significa severidad y mezclarlo arruinaria la lectura. La rampa de
bandas no se toco.

El encabezado del PDF y la barra lateral llevan los logos de **Inventory Management** y
**CEVA Logistics**, y el site **Finning Cat**, embebidos en el HTML.

El panel de la derecha es mas ancho y arranca con una **rosca** del reparto por banda, con
el total de lineas en el centro: es parte-de-un-todo con cuatro tramos, el caso donde una
rosca efectivamente sirve.

### Offline

Es **un solo archivo de 450 KB que se abre con doble clic**. No necesita internet, ni instalar
nada, ni que ningun otro archivo este al lado: SheetJS (el que lee los `.xlsx`) va embebido
adentro. Verificado con toda la red bloqueada: cero llamadas salientes. Tampoco sube nada a
ningun lado.

### Diferencias con el Excel

- La fecha de corte es fija y se elige a mano. El Excel usa `TODAY()`, asi que al reabrir un
  archivo viejo recalcula todo y deja de coincidir con lo que se informo ese dia.
- Un SKU sin precio en el maestro se avisa en pantalla. En el Excel el `IFERROR` lo valoriza
  en $0 sin ningun cartel.
- Las areas con stock pero sin responsable cargado aparecen marcadas. En el Excel directamente
  no salen en el reporte.
- Pisar la `Fecha Aging` de una linea no se pierde al pegar la base de la semana siguiente.
