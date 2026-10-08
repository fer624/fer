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
se quitan de a uno o todos juntos.

El resto del análisis está detrás, en pestañas: Tránsito, Valorizado, Consolidación, Tendencia,
Calidad, Detalle y Reporte.

### Criterios de cálculo

- **Ocupada**: está en el maestro y aparece en el fotostock. **Vacía**: está en el maestro y no
  aparece. Se cuentan posiciones distintas, nunca líneas, porque hay ubicaciones multiproducto.
- **Tránsito (virtual)**: la ubicación tiene stock pero no es capacidad de almacenamiento. Lo define
  el **diccionario**, que es la fuente con autoridad; sin él se deduce por ausencia en el maestro.
- **Ubicaciones de terceros**: aparecen en el fotostock porque se comparte el sistema pero no las
  opera CEVA (hoy, las que contienen `FSM`). Se descartan. El filtro es editable en Datos.
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

La pestaña **Reporte** arma una filmina de una hoja apaisada con los indicadores principales.
**Exportar PDF** abre el diálogo de impresión: elegir *Guardar como PDF*, horizontal, A4.

> Nota: este repositorio publica a GitHub Pages al integrar en `main`. El archivo no contiene datos
> de la empresa (nunca salen del navegador), pero la página quedaría accesible públicamente.
