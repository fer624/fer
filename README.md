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

**La diferencia se mide contra el teórico del primer conteo.** Cuando una
diferencia se contabiliza, SAP actualiza el stock: el teórico del pase siguiente
ya trae el ajuste y su resta da cero. Si se mirara sólo el último pase, un
hallazgo confirmado por el recuento desaparecería del resultado. Por eso la
diferencia de la auditoría es **contado final − teórico del primer conteo**, y
una ubicación cuyo último pase cuadra pero que arrastra una diferencia detectada
cierra como **cerrada con diferencia, confirmada por recuento**.

Si en tu operación no se contabiliza entre pases, la pantalla 5 permite volver a
medir por la diferencia del último pase.

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

**Los importes van en dinero, no en unidades.** Entre materiales distintos las
unidades no se pueden sumar: un tornillo y un motor no son comparables. Por eso
el faltante, el sobrante y el porcentaje que netea se calculan valorizados, con
las unidades como dato secundario. En la tabla por material, donde la unidad sí
tiene sentido, se muestran las dos cosas.

Si faltan precios en el maestro de ítems, la pantalla avisa qué porcentaje de la
diferencia bruta quedó sin valorizar y lista los materiales afectados. Sin
archivo de precios el tablero cae a unidades y lo dice explícitamente.

### Pantallas

1. **Avance del W2W** — cobertura, cierre, embudo de pases, ritmo y proyección.
2. **Resultado** — ubicaciones e ítems con diferencia, faltante y sobrante en
   dinero y en unidades, y el resultado por material. El bloque de neteo sólo
   aparece cuando hay materiales que realmente se cancelan entre ubicaciones.
3. **Recuentos y Diferencias** — una fila por ubicación y material con los tres
   recuentos al lado: teórico, contado y diferencia de cada pase, el resultado
   de la auditoría y el espejo. Clic en la fila para el detalle completo.
4. **Mapa del Depósito** — estado por ubicación y concentración de diferencias.
5. **Productividad** — por contador: ubicaciones contadas, ocupadas y vacías,
   documentos, ítems, ritmo por hora y franja horaria trabajada. Los nombres de
   los contadores se cargan a mano o se pegan desde Excel.
6. **Archivos y Configuración** — carga, Status Conteo, umbrales y control de
   calidad de datos.

> El Resultado agrega **por material sobre todo el depósito**; los Recuentos
> listan **ubicación por ubicación** y respetan los filtros y el límite de filas
> en pantalla. Por eso las dos pantallas no muestran lo mismo: para encontrar un
> material en el listado, buscalo por su código o entrá con el clic desde el
> Resultado.

### Reporte de avance

El botón **🖨 Reporte** de la barra superior arma una hoja A4 horizontal con la
cobertura, el cierre, el embudo, el avance por zona y las cifras del resultado,
y abre el diálogo de impresión. Desde ahí se elige *Guardar como PDF* para
mandarlo por mail. No necesita ninguna librería extra.

### Configuración que conviene revisar antes de empezar

- **Status Conteo que equivalen a CONTADA** — se detectan solos y se pueden
  marcar a mano. Los códigos de SAP se resuelven por tabla: `COUN` y `POST`
  son contada, `INAC` y `ACTI` no. Si la bajada no trae Status Conteo se usa
  la columna **Status Inv**.

  Además, un documento de inventario sin ninguna cantidad informada se cuenta
  como **no contada**, no como cerrada sin diferencia: una ubicación con el
  documento activado pero que nadie contó todavía está pendiente.
- **Signo de la diferencia** — por defecto negativo = faltante.
- **Neteo entre propietarios** — por defecto no netea entre propietarios distintos.
- **Ventana del conteo** — se ajusta sola a las fechas del archivo hasta que
  guardes la configuración a mano; a partir de ahí manda lo que fijaste. Sirve
  para probar bajadas de otros años sin tocar nada.

### Volumen

Probado con 60.000 ubicaciones y 247.682 filas de conteo (31 MB de CSV): la
carga tarda unos 14 segundos, recargar la página 2,4 segundos y el navegador
usa unos 230 MB. Para trabajar cómodo conviene dejar el listado de diferencias
en 500 o 2.000 filas; con 10.000 la tabla tarda varios segundos en dibujarse.
El CSV y el Excel bajan todo igual, sin el límite de pantalla.

Los datos quedan guardados en el navegador (IndexedDB) del equipo donde se cargan.

## `operador.html` y `monitor.html`

Control de tiempos de espera en mostrador: `operador.html` registra las llegadas
y `monitor.html` es el tablero para la pantalla grande.
