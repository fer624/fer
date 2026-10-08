# fer

## ocupacion.html — Ocupación Almacén CDR

Tablero de un solo archivo HTML que funciona **sin internet**. Se abre con doble clic en Chrome,
Edge o Firefox actualizados. No lleva librerías: lee los `.xlsx` de SAP con el descompresor que ya
trae el navegador. Colores corporativos de CEVA Logistics. Site: Finning CAT.

### Cómo se usa

1. **Maestro de ubicaciones** (`Base_Ubis`): define la capacidad. Se carga una vez y queda guardado.
2. **Fotostock**: trae solo las ubicaciones ocupadas. Es el que se actualiza en cada corte.
   La fecha se detecta del nombre (`FotoStock_2809` → 28/09) y se puede corregir.
3. **Maestro valorizado** (`Base_Item_Valorizados`): aporta precio y familia. Queda guardado.
4. **Diccionario de ubicaciones** (`Info_ubicaciones`): traduce los códigos y define qué es tránsito.
   Queda guardado.

Para actualizar alcanza con cargar el fotostock nuevo. Se pueden seleccionar varios juntos para
cargar historial de semanas anteriores.

### Pantalla principal

Responde una sola pregunta: **cuán lleno está el almacén**. Separa en dos bloques:

- **Almacenamiento físico**: ocupación con semáforo, ocupadas, vacías, total de posiciones,
  ítems distintos y líneas. Gráficos por tipo de almacén, pasillo, área y nivel, más un mapa de
  calor de pasillo por nivel.
- **Ubicaciones virtuales y de tránsito**: cuántas hay, cuántas tienen stock e ítems distintos.
  No se les calcula ocupación porque no tienen capacidad.

Es **interactiva**: filtros de tipo, área, pasillo, nivel y estado en la barra superior, y clic
sobre cualquier barra o celda para filtrar todo el tablero. Los filtros activos se ven como chips y
se quitan de a uno o todos juntos. No hay barras de desplazamiento: todo entra en pantalla.

Los gráficos van en azul marino, sin semáforo de colores. El umbral se marca con una línea de
referencia al 90%, y el estado aparece como palabra sobria en la tabla.

El resto del análisis está detrás, en pestañas: Tránsito, Valorizado, Consolidación, Tendencia,
Calidad, Detalle y Reporte.

### La tabla de tipos manda

Dentro del archivo hay una tabla (`TIPOS`) con los 26 tipos de almacén propios. Define tres cosas de
una sola vez, y es el lugar donde tocar si cambia algo:

- **Qué es nuestro**: el tipo que no figura ahí no se procesa. Así salen `0041`, `0120` y `0233`.
- **Mono o multi**: `0001`, `0010`, `0015`, `0016`, `0020`, `0025` y `0100` son monoproducto; el
  resto, multiproducto.
- **La clase**: `F` física (capacidad, incluido el Back Order), `T` tránsito (está en el depósito
  ocupando lugar pero no en una posición) y `V` virtual (contable: mermas, daños, garantías, ajustes).

El **tipo manda sobre la ubicación**. Si el diccionario marca una ubicación suelta como virtual pero
su tipo es físico, vale el tipo: son posiciones de ocasión especial donde la mercadería queda fuera
del rack.

### Criterios de cálculo

- **Ocupada**: está en el maestro y aparece en el fotostock. **Vacía**: está en el maestro y no
  aparece. Se cuentan posiciones distintas, nunca líneas, porque hay ubicaciones multiproducto.
- **La saturación se mide sólo en monoproducto.** En multiproducto entran varios materiales y lo que
  no entra queda fuera del rack, así que no hay tope contra el cual medir. Se cuentan y se informan,
  pero sin semáforo. Las tres filas —mono, multi y total— cierran y las tres llevan porcentaje; sólo
  la de monoproducto se lee como saturación.
- **Ubicaciones de terceros**: la tabla de tipos ya saca los almacenes ajenos. Para ubicaciones
  sueltas dentro de un tipo propio hay una lista de excepciones (`AJENAS`) y un filtro de texto
  editable en Datos.
- **Precio**, por orden: columna `Total` del fotostock, `V/U` por cantidad, o `Precio interno
  periódico` del maestro valorizado por cantidad. `V/U` y `Total` no son estándar de SAP, así que es
  normal que un export no las traiga.
- **Códigos de material**: se usan tal cual vienen. En esta base `1006666` y `1006666.000` son
  materiales distintos.
- **Rótulos del site**: el tipo 0122 es un rack cantilever para cuchillas, y cuatro de sus
  ubicaciones son sobredimensionados que no entran en ningún rack. Están en `NOTAS` dentro del
  código, hasta que se incorporen a `Info_ubicaciones`.
- **Fecha del corte**: la define el usuario. `Fecha EM` es fecha de entrada de mercadería y sirve
  solo para antigüedad.

### Dónde quedan los datos

El historial y las bases se guardan en el navegador de esa computadora. Nada se envía a ningún
servidor. **Descargar respaldo** genera un archivo para mudarlo a otra máquina.

### Reporte

La pestaña **Reporte** arma una filmina de una hoja apaisada que sigue los mismos criterios que la
pantalla: el titular es la saturación monoproducto, hay un bloque con mono, multi y total que cierra,
y tránsito y virtual van separados. Las barras van en azul marino con una marca al 90%, sin semáforo.
**Exportar PDF** abre el diálogo de impresión: elegir *Guardar como PDF*, horizontal, A4.

> Nota: este repositorio publica a GitHub Pages al integrar en `main`. El archivo no contiene datos
> de la empresa (nunca salen del navegador), pero la página quedaría accesible públicamente.
