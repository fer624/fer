# fer

## ocupacion.html — Análisis de ocupación del almacén

Aplicación de un solo archivo HTML que funciona **sin internet**. Se abre con doble clic
en cualquier navegador moderno (Chrome, Edge o Firefox actualizados). No lleva librerías:
lee los `.xlsx` de SAP con el descompresor que ya trae el navegador.

### Cómo se usa

1. **Maestro de ubicaciones** (`Base_Ubis`): define el total de posiciones. Se carga una vez
   y queda guardado.
2. **Fotostock**: trae solo las ubicaciones ocupadas. Es el que se actualiza en cada corte.
   La fecha se detecta del nombre del archivo (`FotoStock_2809` → 28/09) y se puede corregir.
3. **Maestro valorizado** (opcional): agrega la familia de material. También queda guardado.
4. **Diccionario de ubicaciones** (`Info_ubicaciones`, muy recomendable): traduce los códigos de SAP
   y define qué ubicaciones son de tránsito. También queda guardado.

Para actualizar alcanza con cargar el fotostock nuevo y guardar el corte. Se pueden
seleccionar varios fotostock juntos para cargar historial de semanas anteriores.

### Qué muestra

- **Resumen**: ocupación con semáforo, **valor total del stock en el depósito** (posiciones + tránsito),
  consolidación posible, antigüedad y calidad del maestro, con comparativo contra el corte anterior.
- **Tendencia**: evolución semanal y mensual de ocupación, posiciones y valor.
- **Valorizado**: valor por tipo y por área, mapa de calor, ubicaciones y materiales más caros,
  **clasificación ABC** y corte por familia de material.
- **Consolidación**: materiales repartidos en varias posiciones, con el detalle de dónde está cada uno
  y cuántas posiciones se liberarían unificando.
- **Tránsito**: ubicaciones que tienen stock sin ser capacidad de almacenamiento. Se entra a cada una
  y se ve su contenido con el valor de cada línea, y el valor agrupado según para qué se usa
  (exportación a sucursal, pickeado pendiente de control, garantías, mermas, etc.).
- **Calidad**: inconsistencias del maestro, bloqueos y antigüedad del stock.
- **Detalle**: todas las posiciones, filtrables y exportables.
- **Reporte**: filmina de una hoja apaisada con los indicadores principales.

### Criterios de cálculo

- **Ocupada**: está en el maestro y aparece en el fotostock. **Vacía**: está en el maestro
  y no aparece. Se cuentan posiciones distintas, nunca líneas, porque hay ubicaciones
  multiproducto.
- **Tránsito (virtual)**: la ubicación tiene stock pero no es capacidad de almacenamiento. Queda fuera
  del porcentaje de ocupación y se informa aparte con su valor. Con el **diccionario** cargado, la
  clasificación la define ese archivo, que es la fuente con autoridad; sin él, se deduce por ausencia
  en el maestro, y eso deja contando como capacidad algunas ubicaciones que en realidad son playas de
  exportación, back order o control de picking.
- **Valor total**: es todo lo que está dentro del depósito, posiciones físicas más tránsito. La
  ocupación en cambio sólo puede medirse sobre lo físico, porque el tránsito no tiene capacidad
  definida contra la cual calcular un porcentaje. Sale de la columna `Total` del fotostock, que ya
  viene valorizada.
- **Consolidación**: el ahorro de posiciones es un techo teórico. Supone que todo el material entra en
  una sola posición, cosa que depende de la capacidad de cada ubicación, dato que el maestro no trae.
- **Fecha del corte**: la define el usuario. `Fecha EM` es la fecha de entrada de
  mercadería y se usa solo para calcular antigüedad.

### Dónde quedan los datos

El historial y las bases se guardan en el navegador de esa computadora. Nada se envía a
ningún servidor. El botón **Descargar respaldo** genera un archivo para mudar el historial
a otra máquina o compartirlo.

### Reporte en PDF

La pestaña **Reporte** arma una **filmina de una sola hoja apaisada** con los indicadores principales
y sus semáforos, para ver la situación del almacén de un vistazo. El botón **Exportar PDF** abre el
diálogo de impresión: elegir *Guardar como PDF*, orientación horizontal, tamaño A4.

### Identidad visual

Colores corporativos de CEVA Logistics tomados del logo: azul marino `#051039` y rojo `#FF0000`.
El rojo se reserva para el logo y el estado crítico, así no compite con los semáforos. Los colores
de los gráficos se derivaron del azul de marca y se verificaron para que se distingan entre sí,
también con visión de color reducida, en modo claro y oscuro.

> Nota: este repositorio publica a GitHub Pages al integrar en `main`. El archivo no
> contiene datos de la empresa (los datos nunca salen del navegador), pero la página
> quedaría accesible públicamente.
