# fer

Herramientas internas, sin dependencias ni backend. Se abren con doble clic o se publican en GitHub Pages.

| Archivo | Para que sirve |
|---|---|
| `aging.html` | Monitoreo de aging en ubicaciones criticas. Un unico archivo, funciona sin internet. |
| `operador.html` | Carga de turnos del mostrador |
| `monitor.html` | Tablero de espera para la TV del mostrador |

## aging.html

Reemplaza el calculo manual del libro `Aging_ddmmaa.xlsx`. Replica sus formulas:

| Concepto | Formula |
|---|---|
| Aging | `NETWORKDAYS(Fecha Aging; corte)` — lun a vie, cuenta ambos extremos, **sin feriados** |
| Valorizado | `Costo x Cantidad` |
| Fuera de aging | `Aging >= Target` |
| Dias Max. | maximo de aging entre todas las lineas del area |
| Semaforo | rojo cuando `Dias Max >= Target` |

### Como se usa

1. **Datos** → arrastrar el `Base_Aging_ddmmaa.XLSX` del lunes. Es el export crudo del WMS,
   con la columna `Fecha Aging` ya completada. Tambien acepta el libro completo
   `Aging_ddmmaa.xlsx`, del que ademas lee las hojas de configuracion.
2. **Datos** → arrastrar `Base Item Valorizados.xlsx`: queda guardado en el navegador (unos
   470 KB con los 22.398 materiales), asi que solo se vuelve a cargar cuando cambian los precios.
   Espera el `Material` en la columna A y el `Precio interno periodico` en la H; si cambia, se
   remapea ahi mismo. Los precios estan en USD.
3. **Panorama** → la vista para analizar: cuanto se pasa cada area de su target, donde
   esta concentrada la plata y como viene evolucionando. Todo es clicable y cae filtrado
   en el detalle.
4. **Tablero** → el mismo reporte de siempre, calcado del Excel, para imprimir y mandar.
   Clic en un area abre su detalle.
5. **Detalle** → la `Fecha Aging` de cada linea se puede editar. El ajuste queda guardado y
   se vuelve a aplicar cada semana sobre la misma linea; para volver a la del archivo, se
   borra el campo. Abajo hay un panel con todos los ajustes vigentes.
6. **Guardar corte** → agrega una columna al historico y un punto a la tendencia.

Las 199 ubicaciones criticas y las 9 areas vienen cargadas de fabrica, asi que no hace falta
el libro grande para arrancar. Se editan en la solapa **Ubicaciones criticas**, que tiene
ademas un boton para restaurar las originales.

La configuracion (ubicaciones, areas, maestro de costos e historico) vive en el LocalStorage
del navegador: es por equipo y por navegador, no se comparte entre personas. Para moverla a
otra maquina, exportar los CSV desde cada solapa.

### Las bandas de atraso

El Panorama no agrupa por dias sino por **cuanto se paso cada linea del target de su
area**, porque los targets van de 2 a 90 dias y en dias crudos no se pueden comparar:
22 dias en 8030 (target 2) es mucho peor que 77 en 0900 (target 90).

| Banda | Significa |
|---|---|
| Dentro del target | `aging < target`. Es contexto, va en gris. |
| Hasta 2x | se paso, pero poco |
| 2 a 5x | |
| Mas de 5x | |

Las tres bandas de atraso usan una sola rampa de un hue de claro a oscuro, porque son
una escala ordenada y no categorias sueltas. Validada sobre fondo blanco: lightness
monotona, saltos visibles y el extremo claro por encima de 2:1.

### Offline

Es **un solo archivo de 428 KB que se abre con doble clic**. No necesita internet, ni
instalar nada, ni que ningun otro archivo este al lado: SheetJS (el que lee los `.xlsx`)
va embebido adentro. Verificado con toda la red bloqueada: cero llamadas salientes.

Tampoco sube nada a ningun lado. Los archivos se procesan en el navegador y los datos
no salen de la maquina.

### Diferencias con el Excel

- La fecha de corte es fija y se elige a mano. El Excel usa `TODAY()`, asi que al reabrir un
  archivo viejo recalcula todo y deja de coincidir con lo que se informo ese dia.
- Un SKU sin costo en el maestro se avisa en pantalla. En el Excel el `IFERROR` lo valoriza
  en $0 sin ningun cartel.
- Las areas con stock pero sin responsable cargado aparecen marcadas como "sin configurar".
  En el Excel directamente no salen en el reporte.
- Pisar la `Fecha Aging` de una linea no se pierde al pegar la base de la semana siguiente.
- Avisa cuando una linea se valoriza con un precio dudoso (ver abajo).

### Sobre los precios repetidos

En el maestro hay 107 materiales que aparecen con mas de un precio, uno por clase de
valoracion: `D8_STD.AA`, por ejemplo, tiene 48 precios distintos que van de USD 0,01 a
USD 787.014,57. El `XLOOKUP` del Excel se queda con el primero y la herramienta hace lo
mismo, para no cambiar los numeros. La diferencia es que marca esas lineas como
"precio dudoso" y deja ver el rango, asi se puede corregir el costo a mano desde la solapa
**Maestro valorizado**. En la base del 13-oct ninguna linea cae en ese caso.

Al cargar un maestro que tenga menos de la mitad de los SKU que el guardado, pregunta si
reemplazar o fusionar, para no perder precios con un archivo parcial o mal mapeado.

### Sobre los ajustes de fecha

El export del WMS no trae un numero de linea: `Unidad manipulacion` e `Identificacion stock`
vienen vacias. La linea se reconoce entonces por ubicacion + producto + la `Fecha Aging` del
archivo + tipo de stock + cantidad. Con la base del 13-oct quedan 45 grupos de lineas
indistinguibles entre si; un ajuste sobre una de ellas se aplica a todo el grupo y la pantalla
lo avisa ("N gemelas").

Si en una base posterior se corrige la `Fecha Aging` de una linea ajustada, su clave cambia
y el ajuste queda marcado como "no coincide": ya no hace falta, porque el archivo trae el
dato bien. Esos ajustes se limpian de a uno o todos juntos.

`Fecha EM` no se usa para nada: no es la fecha desde la que se cuenta el aging. Si la base
no trae la columna `Fecha Aging`, la herramienta la rechaza en vez de calcular con otra cosa.
