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

**Mapa** — la principal. Un treemap donde cada rectangulo es un area: el **tamano** es la
plata frenada y el **color**, cuanto se paso del target. Un clic entra a sus ubicaciones,
otro a las lineas, y se vuelve por las migas de arriba. El panel de la derecha describe
siempre donde estas parado, con la mezcla de atrasos y lo que mas pesa. Dos interruptores:
ver solo lo frenado o todo el stock, y medir por plata o por lineas.

**Lineas** — la tabla completa, con filtros. Aca se edita la `Fecha Aging` de cada linea.

**Evolucion** — la plata frenada corte a corte, con el delta contra el anterior.

**Datos**, **Ubicaciones** y **Maestro** — la configuracion.

### Como se usa

1. **Datos** → arrastrar el `Base_Aging_ddmmaa.XLSX` del lunes. Es el export crudo del WMS,
   con la columna `Fecha Aging` completada. Tambien acepta el libro completo
   `Aging_ddmmaa.xlsx`, del que ademas lee las hojas de configuracion.
2. **Datos** → arrastrar `Base Item Valorizados.xlsx`: queda guardado en el navegador (unos
   470 KB con los 22.398 materiales). Espera el `Material` en la columna A y el
   `Precio interno periodico` en la H. Los precios estan en USD.
3. **Mapa** → mirar y navegar.
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
y el extremo claro por encima de 2:1. El relleno de cada celda interpola sobre esa rampa
segun el promedio ponderado del nodo, y la franja de adentro muestra la mezcla exacta.

**Las celdas muy chicas** se agrandan hasta un minimo y, cuando hay varias, se les reserva una
franja al pie: repartidas junto con las grandes quedarian en tiras de pocos pixeles y
desaparecerian de la vista. La cifra que se lee adentro y en el globo siempre es la real.

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
