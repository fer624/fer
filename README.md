# fer

Herramientas operativas de inventario — CEVA Logistics.

## `w2w.html` — Wall to Wall 2026 · Tablero de Conteo

Tablero de lectura para el conteo físico total del depósito. Es una **auditoría
de cliente**: sólo se cuenta, no se mueve ni se ajusta nada. Abrí el archivo con
doble clic; funciona 100% offline y no envía datos a ningún servidor.

### Archivos que consume

Hacen falta **dos**:

| Archivo | Para qué |
|---|---|
| Bajada de Conteos de SAP | Trae todas las ubicaciones del alcance con su status, los pases y las diferencias |
| Maestro de Ítems Valorizados | Precio, para dar magnitud al resultado y poder priorizar |

El **Maestro de Ubicaciones es opcional** y está plegado al pie de la pantalla 7:
sólo agrega las coordenadas X/Y del mapa y permite comparar el alcance contra el
depósito completo.

Acepta `.xlsx .xls .xlsm .csv .txt`. Las columnas se detectan solas y se
confirman en un modal; el mapeo queda guardado para las cargas siguientes.
Como cada bajada es la base completa, conviene cargarla en modo **Reemplazar**;
si se acumula, las filas repetidas se descartan por ubicación, documento, material
y **tipo de stock**: el mismo material en `0F` y en `1F` son dos quants distintos
y una clave sin el tipo se comía una de las dos filas.

### Estructura del código de ubicación

Sin maestro, la zona, el pasillo, la columna y el nivel se leen del propio
código partiéndolo por el separador. Cuál parte es cuál depende del depósito, así
que se configura en la pantalla 7: muestra cuántos valores distintos tiene cada
parte —la que tiene pocos suele ser la zona, la que tiene muchos la posición— y
previsualiza el resultado antes de aplicar. La zona también puede tomarse del
`Tipo almacén` o del `Área almacenamiento`.

### El universo: lo define el cliente

El alcance del W2W son las **ubicaciones a las que el cliente le generó documento
de inventario**, no el maestro. El depósito completo es la intención, pero hay
exclusiones deliberadas (unidades medibles, expo) y el cliente las decide al
generar. Una ubicación con documento entra aunque no esté en el maestro: se
completa con el Tipo almacén y el Área almacenamiento de la propia bajada.

El maestro queda como fuente complementaria —zona, pasillo, columna, nivel,
coordenadas— y es **opcional**: sin él hay avance y resultado, falta el mapa.
La pantalla 1 muestra el **Alcance**: cuántas del maestro entraron, cuántas
quedaron afuera y cuántas se contaron sin datos del maestro.

En la pantalla 7 se puede volver al criterio anterior (físicas del maestro).

### Cómo decide los estados

El cliente genera los documentos antes del conteo y los va activando. La app
sigue esa secuencia por el status del documento:

| Status | Cuenta como |
|---|---|
| `INAC` · Inactiva | Pendiente |
| `ACTI` · Activa | Pendiente |
| `COUN` · Contada | Contada |
| `POST` · Contabilizada | Contada |

El status decide si la ubicación está contada o pendiente, pero el avance se
informa sólo por ubicación: **total, contadas y pendientes**. Un documento sin
cantidad contada no es un conteo, aunque el status diga otra cosa. La fase del
documento queda en el Excel para quien la necesite.

La pantalla 1 avisa de qué columnas está leyendo el status y qué valores
encontró, para que nunca pase inadvertido si no se está leyendo.

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
6. **Exactitud** — ILA e IRA sobre lo contado, con metas, desglose por zona,
   pasillo, tipo de almacén y contador.
7. **Archivos y Configuración** — carga, panel de referencias, Status Conteo,
   umbrales y control de calidad de datos.

### ILA e IRA

- **ILA** = ubicaciones correctas ÷ ubicaciones contadas. Una ubicación es
  correcta cuando no tiene ninguna diferencia.
- **IRA** = ítems correctos ÷ ítems contados. Un ítem es cada material dentro
  de una ubicación; una ubicación contada **vacía** no aporta ítems.

Se calculan sobre lo contado, no sobre el universo, así que suben y bajan a
medida que avanza el conteo.

Una diferencia que sólo es **tipo de stock** es un error de registro, no de
cantidad. Por defecto cuenta como error; en la pantalla 7 se puede excluir, y
entonces una ubicación cuyo único problema fue el tipo pasa a contar como
correcta.

### Referencias y pases

Cada referencia identifica un conteo: el **1° conteo** usa siempre la misma y el
**2°** otra. El panel **Referencias del archivo** de la pantalla 7 lista las que
trae la bajada —con sus registros, ubicaciones, documentos y fechas— y para cada
una se elige a qué conteo pertenece, o **No incluir en el W2W** si es de otro
inventario. Esa asignación es la que ordena los pases.

Si el texto de la referencia declara el número (`1ER CONTEO …`) se precarga
solo, pero la asignación manual manda. Una referencia sin asignar deja el pase
a merced del orden y la app lo avisa con criticidad alta.

Dentro de un mismo conteo el desempate es por **número de documento**, no por
fecha ni hora: la bajada de SAP puede traer un único valor de relleno en
`FeRecuentInvent` y en `Hora de recuento` —en la base del W2W vienen `46331` y
`23:59:59` en las 34.281 filas— y ordenar por ahí invierte los pases al azar.

### Valor de la diferencia

Los importes salen **únicamente del maestro de ítems valorizados**: precio del
maestro × cantidad de la diferencia. El `Valor de diferencia` de SAP queda como
dato informativo en el detalle del ítem y **no entra en ningún total**, porque
viene en otra moneda y mezclarlo daba números distintos para el mismo ítem.

El resultado muestra **valor faltante, sobrante, neto, absoluto y absoluto
compensado**. Un material con diferencia y sin precio en el maestro queda
**fuera de todos esos importes**: la pantalla 2 lo dice arriba, hay un KPI con
la cuenta, una incidencia de calidad de criticidad alta y la lista completa al
pie, exportable a CSV para ir a buscar los precios.

### Tipo de stock · 1F y 0F

El documento pide un ítem en una ubicación con un tipo de stock y a veces se
carga con otro: la cantidad física está bien, pero SAP informa **faltante en un
tipo y sobrante en el otro**. No hay stock que buscar; hay que corregir la carga.

La app lo detecta dentro de la **misma ubicación** y el **mismo material**,
cruzando tipos distintos, y compensa hasta la cantidad que coincide:

| Caso | Cómo queda |
|---|---|
| Faltante 10 en `0F` + sobrante 10 en `1F` | Diferencia por tipo de stock, cantidad correcta |
| Faltante 10 en `0F` + sobrante 7 en `1F` | 7 por tipo de stock + 3 de faltante real |
| Faltante 10 en `0F`, sin contrapartida | Faltante real |

Dónde se ve: un bloque propio en la pantalla 2 —ubicaciones afectadas, ítems,
unidades y cuánto del valor absoluto es sólo tipo de stock—, la columna **Tipo
stk** y la marca `tipo stk` / `parc. tipo stk` en los Recuentos, un filtro para
excluirlas o aislarlas, el detalle del ítem con la contrapartida, y una
incidencia de calidad de criticidad media con los cruces más frecuentes.

### Ocupadas y vacías

Una ubicación contada es vacía si lo dice el indicador de SAP (`Ubicación
vacía` o `Status Ubi`), y si no viene, cuando el conteo no registró ningún
material. Hay un filtro de ocupación en la barra superior.

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

- **Referencias → a qué conteo pertenece cada una** — es lo primero que conviene
  cargar: de ahí sale el orden de los pases.
- **Status Conteo que equivalen a CONTADA** — se detectan solos y se pueden
  marcar a mano. Los códigos de SAP se resuelven por tabla: `COUN` y `POST`
  son contada, `INAC` y `ACTI` no. Si la bajada no trae Status Conteo se usa
  la columna **Status Inv**.

  Además, un documento de inventario sin ninguna cantidad informada se cuenta
  como **no contada**, no como cerrada sin diferencia: una ubicación con el
  documento activado pero que nadie contó todavía está pendiente.
- **Signo de la diferencia** — por defecto negativo = faltante.
- **Neteo entre propietarios** — por defecto no netea entre propietarios distintos.
- **Diferencia por tipo de stock en el ILA / IRA** — por defecto cuenta como
  error de registro.
- **Ventana del conteo** — se ajusta sola a las fechas del archivo hasta que
  guardes la configuración a mano; a partir de ahí manda lo que fijaste. Sirve
  para probar bajadas de otros años sin tocar nada.

### Volumen

Probado con 60.000 ubicaciones y 247.682 filas de conteo (31 MB de CSV): la
carga tarda unos 16 segundos, recargar la página entre 2 y 4 segundos y el
navegador retiene unos 275 MB. Para trabajar cómodo conviene dejar el listado de diferencias
en 500 o 2.000 filas; con 10.000 la tabla tarda varios segundos en dibujarse.
El CSV y el Excel bajan todo igual, sin el límite de pantalla.

Los datos quedan guardados en el navegador (IndexedDB) del equipo donde se cargan.

## `operador.html` y `monitor.html`

Control de tiempos de espera en mostrador: `operador.html` registra las llegadas
y `monitor.html` es el tablero para la pantalla grande.
