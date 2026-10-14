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

1. **Datos** → arrastrar el `Aging_ddmmaa.xlsx`. Lee las hojas `Stock`, `Depositos Virtuales` y `Resp. Alm.`.
2. **Datos** → arrastrar `Base Item Valorizados.xlsx` una sola vez: queda guardado en el navegador.
3. **Tablero** → el reporte. Clic en un area abre su detalle.
4. **Guardar corte** → agrega una columna al historico.

La configuracion (ubicaciones criticas, areas, maestro de costos e historico) vive en el
LocalStorage del navegador: es por equipo y por navegador, no se comparte entre personas.
Para moverla a otra maquina, exportar los CSV desde cada solapa.

### Diferencias con el Excel

- La fecha de corte es fija y se elige a mano. El Excel usa `TODAY()`, asi que al reabrir un
  archivo viejo recalcula todo y deja de coincidir con lo que se informo ese dia.
- Un SKU sin costo en el maestro se avisa en pantalla. En el Excel el `IFERROR` lo valoriza
  en $0 sin ningun cartel.
- Las areas con stock pero sin responsable cargado aparecen marcadas como "sin configurar".
  En el Excel directamente no salen en el reporte.
