# fer

Herramientas internas, sin dependencias ni backend. Se abren con doble clic o se publican en GitHub Pages.

| Archivo | Para que sirve |
|---|---|
| `aging.html` | Monitoreo de aging en ubicaciones criticas |
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
2. **Datos** → arrastrar `Base Item Valorizados.xlsx` una sola vez: queda guardado en el
   navegador. Espera el SKU en la columna A y el costo en la H; si cambia, se remapea ahi mismo.
3. **Tablero** → el reporte. Clic en un area abre su detalle.
4. **Detalle** → la `Fecha Aging` de cada linea se puede editar. El ajuste queda guardado y
   se vuelve a aplicar cada semana sobre la misma linea; para volver a la del archivo, se
   borra el campo. Abajo hay un panel con todos los ajustes vigentes.
5. **Guardar corte** → agrega una columna al historico.

Las 199 ubicaciones criticas y las 9 areas vienen cargadas de fabrica, asi que no hace falta
el libro grande para arrancar. Se editan en la solapa **Ubicaciones criticas**, que tiene
ademas un boton para restaurar las originales.

La configuracion (ubicaciones, areas, maestro de costos e historico) vive en el LocalStorage
del navegador: es por equipo y por navegador, no se comparte entre personas. Para moverla a
otra maquina, exportar los CSV desde cada solapa.

### Diferencias con el Excel

- La fecha de corte es fija y se elige a mano. El Excel usa `TODAY()`, asi que al reabrir un
  archivo viejo recalcula todo y deja de coincidir con lo que se informo ese dia.
- Un SKU sin costo en el maestro se avisa en pantalla. En el Excel el `IFERROR` lo valoriza
  en $0 sin ningun cartel.
- Las areas con stock pero sin responsable cargado aparecen marcadas como "sin configurar".
  En el Excel directamente no salen en el reporte.
- Pisar la `Fecha Aging` de una linea no se pierde al pegar la base de la semana siguiente.

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
