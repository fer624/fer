# fer

## almacen.html — Ocupación del almacén · CDR

Tablero de un solo archivo HTML que funciona **sin internet**. Se abre con doble clic en Chrome,
Edge o Firefox actualizados. No lleva librerías: lee los `.xlsx` de SAP con el descompresor que ya
trae el navegador. Colores corporativos de CEVA Logistics. Site: Finning CAT.

Habla de **una sola cosa: la ocupación de las ubicaciones físicas**. Lo que no está en el maestro
de ubicaciones no existe, así que tránsito, virtuales y los almacenes que no son del site se caen
solos, sin listas de excepciones escritas a mano.

### Los tres archivos

1. **Maestro de ubicaciones** — define la capacidad. Se carga cuando cambia y queda guardado.
   De él salen el total de posiciones, el pasillo, el nivel, el área y, por la columna
   `Tipo de Ubicación`, si cada posición es **monoproducto** o **multiproducto**.
2. **Fotostock** — el corte. Trae sólo las ocupadas; las vacías salen de restar contra el maestro.
   Se pueden elegir varios juntos para cargar semanas anteriores de un saque. La fecha se detecta
   del nombre (`FotoStock_2710` → 27/10) y se puede corregir.
3. **Maestro valorizado** — opcional, también queda guardado. Los fotostock nuevos no traen `V/U`
   ni `Total`, así que **sin este archivo la app funciona igual pero sin un solo dólar**.

Nada sale del navegador. **Descargar respaldo** genera un archivo para mudarlo a otra computadora.

### Las cinco pantallas

- **Ocupación** — el mosaico. La saturación monoproducto ocupa la tarjeta grande porque es la que
  manda; alrededor van ocupadas, vacías, el valor, el bloque de mono/multi/total, la ocupación por
  nivel y por tipo de almacén, y el mapa de pasillo por nivel. Entra entera en pantalla, sin barra
  de desplazamiento. Todo es filtrable: los selectores de arriba y el clic sobre cualquier barra o
  celda. La tabla de ubicaciones se abre con un botón y se exporta a Excel.
- **Valorizado** — dónde está la plata dentro de las posiciones: por tipo, por área, los materiales
  que concentran el valor y las posiciones más caras.
- **Tendencia** — la evolución de cada corte guardado, por semana o por mes.
- **Reporte** — una filmina A4 apaisada para imprimir o guardar como PDF.
- **Configuración** — carga de archivos, respaldo y los controles de calidad del corte.

### Criterios de cálculo

- **Ocupada**: está en el maestro y aparece en el fotostock. **Vacía**: está en el maestro y no
  aparece. Se cuentan posiciones distintas, nunca líneas, porque en multiproducto entran varias.
- **La saturación se mide sólo sobre monoproducto.** En multiproducto entran varios materiales y
  lo que no entra queda fuera del rack, así que no hay tope contra el cual medir. Las tres filas
  —mono, multi y total— cierran y las tres llevan porcentaje; sólo la de mono se lee como
  saturación. El umbral de referencia es el 90%.
- **Precio**, por orden: columna `Total` del fotostock, `V/U` por cantidad, o el maestro valorizado.
  Un material puede traer **varias filas** en el maestro valorizado —REMAN, FULL y PARTIAL de un
  repuesto reconstruido, o una por número de serie— con precios que se van al triple entre sí.
  Quedarse con cualquiera de ellas es tirar una moneda, así que se usa el **valor contable**: lo
  que el propio maestro declara de valor dividido por las unidades que declara de stock.
- **Códigos de material**: se usan tal cual vienen. `1006666` y `1006666.000` son distintos.
- **Pasillo y nivel**: SAP a veces escribe el nivel 4 como `4` y a veces como `04`. Se emparejan
  rellenando con cero y la app avisa cuántos hubo, para que se corrija en el origen.
- **Si cambia el maestro cambia el denominador**: la tendencia marca con una línea vertical la
  fecha en que pasó y la tabla dice cuántas posiciones usó cada corte. Un escalón ahí no es
  gestión, es cambio de base.

### Control cruzado

El maestro trae su propia marca de ubicación vacía. La app la compara contra el fotostock y avisa
si se separan: con los dos archivos del mismo corte tienen que coincidir casi al 100%.

---

> Nota: este repositorio publica a GitHub Pages al integrar en `main`. Los archivos no contienen
> datos de la empresa —nunca salen del navegador— pero la página quedaría accesible públicamente.

### ocupacion.html

La versión anterior, que además de ocupación traía tránsito, virtuales, consolidación y la lista de
conteo para el wall to wall. Queda en el repositorio hasta que se decida darla de baja.
