# fer

Herramientas operativas de inventario — CEVA Logistics.

## `w2w.html` — Wall to Wall 2026 · Tablero de Conteo

Tablero de lectura para el conteo físico total del depósito. Es una **auditoría
de cliente**: sólo se cuenta, no se mueve ni se ajusta nada. Abrí el archivo con
doble clic; funciona 100% offline y no envía datos a ningún servidor.

### Archivos que consume

| Archivo | Para qué |
|---|---|
| Maestro de Ubicaciones | Define el universo: las ubicaciones **físicas** a contar |
| Bajada de Conteos de SAP | Avance, pases y diferencias. Se puede acumular bajada tras bajada |
| Maestro de Ítems Valorizados | Precio, para dar magnitud al neto y poder priorizar |

Acepta `.xlsx .xls .xlsm .csv .txt`. Las columnas se detectan solas y se
confirman en un modal; el mapeo queda guardado para las cargas siguientes.

### Cómo decide los estados

El número de pase **no viene en el archivo**: se deriva ordenando los documentos
de inventario de cada ubicación por fecha, hora y número. De ahí sale el embudo:

```
PENDIENTE
   └─ 1° conteo ─┬─ sin diferencia ──────────────→ CERRADA OK
                 └─ con diferencia → EN 2° CONTEO
                       └─ 2° conteo ─┬─ sin diferencia ──→ CERRADA OK
                                     └─ con diferencia → EN 3° CONTEO
                                           └─ 3° conteo ──→ CERRADA CON DIFERENCIA
```

Por eso hay **dos métricas de avance** y no una:

- **Cobertura** — ubicaciones tocadas al menos una vez ÷ universo físico.
- **Cierre** — ubicaciones sin trabajo pendiente ÷ universo físico.

Una ubicación contada con diferencia está contada pero **no** está cerrada.

### El resultado: el neto por material

Si un material falta en una ubicación y sobra en otra, la diferencia **netea**:
el stock está en el depósito, está mal ubicado. El resultado de la auditoría es
el neto por material; el bruto sólo describe cuánto stock está mal ubicado.
Faltante y sobrante **nunca** se suman entre sí.

El neteo es por material (+ propietario, si en el archivo hay más de uno) y se
calcula siempre sobre **todo el depósito**: los filtros afectan el listado, no
el neto. El KPI que resume el W2W es *de la diferencia bruta, cuánto netea*.

### Pantallas

1. **Avance del W2W** — cobertura, cierre, embudo de pases, ritmo y proyección.
2. **Resultado Neto** — neto por material, % que netea, faltante y sobrante netos.
3. **Diferencias a Verificar** — ítems del pase vigente con su **espejo**: dónde
   aparece el mismo material con signo opuesto, para ir a verificar el conteo.
4. **Mapa del Depósito** — estado por ubicación y concentración de diferencias.
5. **Archivos y Configuración** — carga, Status Conteo, umbrales y control de
   calidad de datos.

### Configuración que conviene revisar antes de empezar

- **Status Conteo que equivalen a CONTADA** — se detectan solos, pero se pueden
  marcar a mano.
- **Signo de la diferencia** — por defecto negativo = faltante.
- **Neteo entre propietarios** — por defecto no netea entre propietarios distintos.
- **Ventana del conteo** — marca los conteos que caen fuera de fecha.

Los datos quedan guardados en el navegador (IndexedDB) del equipo donde se cargan.

## `operador.html` y `monitor.html`

Control de tiempos de espera en mostrador: `operador.html` registra las llegadas
y `monitor.html` es el tablero para la pantalla grande.
