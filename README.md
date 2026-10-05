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

Para actualizar alcanza con cargar el fotostock nuevo y guardar el corte. Se pueden
seleccionar varios fotostock juntos para cargar historial de semanas anteriores.

### Criterios de cálculo

- **Ocupada**: está en el maestro y aparece en el fotostock. **Vacía**: está en el maestro
  y no aparece. Se cuentan posiciones distintas, nunca líneas, porque hay ubicaciones
  multiproducto.
- **Virtual**: la ubicación trae stock pero no existe en el maestro. Son los tipos de
  almacén de tránsito e interinos de SAP. Quedan fuera del porcentaje de ocupación porque
  no tienen capacidad definida, y se informan aparte con su valor.
- **Valor**: sale de la columna `Total` del fotostock, que ya viene valorizada.
- **Fecha del corte**: la define el usuario. `Fecha EM` es la fecha de entrada de
  mercadería y se usa solo para calcular antigüedad.

### Dónde quedan los datos

El historial y las bases se guardan en el navegador de esa computadora. Nada se envía a
ningún servidor. El botón **Descargar respaldo** genera un archivo para mudar el historial
a otra máquina o compartirlo.

### Reporte en PDF

La pestaña **Reporte** arma el informe semanal o mensual. El botón **Exportar PDF** abre el
diálogo de impresión: elegir *Guardar como PDF*, tamaño A4.

> Nota: este repositorio publica a GitHub Pages al integrar en `main`. El archivo no
> contiene datos de la empresa (los datos nunca salen del navegador), pero la página
> quedaría accesible públicamente.
