# Nil Picks y Repicking — SAP EWM

Aplicación offline: no usa servidor, no usa internet y no manda datos a ningún lado.
Todo queda en IndexedDB, dentro del navegador de la PC donde la abrís.

Sirve para dos cosas, y nada más:

1. **Medir** los Nil Picks y los Repickings de la operación, mes a mes.
2. **Sacar los cíclicos** que hay que contar para gestionar los ajustes.

## Cómo se usa

1. Descomprimí la carpeta completa en el disco (por ejemplo `C:\Inventario\NilPicks`).
2. Abrí `index.html` con Chrome o Edge. Conviene hacer un acceso directo en el escritorio.
3. Elegí el site arriba a la derecha. Queda guardado.
4. En **Importar**, cargá el reporte de picking y tocá *Procesar*.
5. En **Cíclicos** sacás la planilla, contás, cargás el resultado y el ajuste.
6. En **KPI mensual** está el número del mes.

## La regla

Se toman del reporte de picking las tareas con código de excepción. Hay dos, y
no son lo mismo — sale de los propios datos: en las 138 filas BIDF del reporte
de septiembre la cantidad real es **siempre 0**, y en las 15 BIDP está
**siempre entre 1 y la prevista**.

| Código | Qué pasó |
|---|---|
| **BIDF** | No sacó nada. Diferencia total. |
| **BIDP** | Sacó menos de lo pedido. Diferencia parcial, ya medida por SAP. |

## BIDF: la regla de la retoma

Para cada BIDF se busca, en el mismo archivo, otra tarea de **la misma línea**
(documento + posición + producto) confirmada después y **sin** código de
excepción. Esa es la prueba de que el material salió.

| Qué pasó | Clasificación | Qué hace la app |
|---|---|---|
| Retoma desde **la misma gaveta** | Repicking | **Cierra el caso solo.** No quedó diferencia que contar. |
| Retoma desde **otra gaveta** | Repicking | **Va a cíclico.** La gaveta original quedó con stock fantasma. |
| **Sin** retoma | Nil Pick | **Va a cíclico.** La gaveta decía que había stock y no estaba. |

## BIDP: diferencia parcial

Una toma parcial **siempre va a cíclico y nunca se cierra sola**, aunque el
resto de la cantidad se haya completado desde otra gaveta: que la línea se
termine en otro lado no dice nada sobre el faltante que quedó en ésta. Es la
diferencia importante con un BIDF, donde la retoma en la misma gaveta sí
prueba que no había diferencia.

El faltante llega **ya calculado** en la columna *Ctd.dif.dest.en UMB*, así que
el caso nace con la cantidad conocida y el ajuste viene propuesto en el conteo.
Si esa columna no viniera, se calcula como prevista menos real.

Una toma parcial va a su **propio caso**, aunque la misma línea haya tenido
también un BIDF: son dos problemas distintos y el KPI los cuenta aparte. Pero
las dos caen en el **mismo cíclico** si es la misma gaveta y el mismo producto,
porque el contador va una sola vez.

No hay más categorías.

> **Importante:** el reporte de picking tiene que venir **completo**. Si lo filtrás
> por código de excepción, la app se queda sin las tareas limpias, no puede ver
> ninguna retoma y todo cae en Nil Pick. Al importar, la app te avisa si el
> archivo no trae tareas sin excepción.

### Un caso es un problema, no una tarea

Los BIDF se agrupan por **pedido + producto + ubicación**. Si la misma línea
vuelve a fallar, el intento se suma al caso abierto en vez de generar uno nuevo.
Cada caso guarda la lista de intentos con su tarea, fecha, hora y usuario.

Volver a cargar el mismo archivo no duplica nada: cada tarea de almacén se
registra una sola vez.

Si un archivo posterior trae la retoma de un caso que estaba abierto, el caso se
reclasifica, y se cierra solo si la retoma fue en la misma gaveta. Por eso una
retoma del día siguiente no queda como Nil Pick para siempre.

## El circuito

```
A contar  →  Contado  →  Cerrado
```

- **A contar**: la gaveta está en la lista de cíclicos.
- **Contado**: cargaste resultado (Encontrado / No encontrado), stock del
  sistema y lo que había. La app calcula la diferencia.
- **Cerrado**: registraste el ajuste, o lo cerraste sin ajustar.

El repicking en la misma gaveta nace cerrado, sin pasar por la lista.

Si cargás un conteo o cerrás a mano, una importación posterior **no te pisa el
trabajo**.

## Cíclicos

Cada fila es **una gaveta y un producto**, no un pedido: si tres pedidos fallaron
sobre la misma gaveta y el mismo item, es **un** cíclico, no tres. Contás una vez
y se cierran los tres casos.

Tres salidas:

- **Planilla (Excel)**: ubicación, producto, descripción y las columnas vacías
  para anotar. Sin la cantidad del sistema, para contar a ciegas.
- **Detalle (Excel)**: con los casos, los documentos, el motivo, el resultado y
  el ajuste.
- **Imprimir planilla**: la tabla de pantalla en papel, sin las columnas que no
  se pueden anotar a mano.

El filtro de arriba (a contar / contados sin ajustar / abiertos / todos) manda
sobre lo que se exporta y lo que se imprime.

La **cantidad de la tarea** es lo que el pickeador tenía que sacar, **no** el
saldo de la gaveta: eso no viene en el reporte. Para que la diferencia sirva,
cargá el stock del sistema cuando cargás el conteo.

## KPI mensual

La tabla mes a mes trae, por mes: Nil Picks, Repicking, total BIDF, tareas,
gavetas mandadas a cíclico, contadas, ajustadas y unidades ajustadas. Las
tarjetas de arriba son del mes elegido y se comparan contra el mes anterior
(si no hay mes anterior cargado, no comparan: contra cero todo da +100% y no
dice nada).

El selector **Contar** cambia la unidad:

- **Casos**: un problema es uno, aunque la línea haya fallado tres veces.
- **Tareas BIDF**: una fila del reporte es una. Es lo que reconcilia contra SAP.

El mes de un caso es el de su **primer** intento, que es cuando empezó el
problema.

### Dónde se concentra

Abajo del todo hay cuatro rankings: **usuarios**, **tipos de almacén**,
**ubicaciones** y **productos**. Cada uno muestra el total y lo abre en Nil
Picks y Repicking, porque no es lo mismo un usuario que genera muchas
excepciones que después se recuperan solas que uno cuyas líneas terminan todas
en conteo.

Se pueden ver del mes elegido o de todo el histórico, y en top 10, top 20 o
completos. Al exportar el Excel del KPI, los cuatro rankings van **enteros**,
una hoja cada uno, sin importar el top elegido en pantalla.

El ranking de usuarios tiene una particularidad: contando **por tareas** usa el
usuario de cada intento, no el del último. Si la misma línea la pickearon tres
personas distintas, cada una se lleva su ocurrencia. Contando **por casos**, el
caso se le atribuye al último que lo intentó.

## Columnas que lee

Los encabezados se reconocen sin distinguir mayúsculas, acentos ni puntos, así
que aguanta variaciones del layout. Las columnas que sobran se ignoran.

- **Picking** (obligatorio): Documento, Código de excepción, Posición de
  documento, Tarea de almacén, Producto, Descripción de producto,
  Ctd.prev.proced.UMB, Ctd.real dest.UMB, Ubic.procedencia, Fecha confirmación,
  Hora de confirmación, Confirmado por, **Tipo almacén origen**. Si está, suma
  Tipo de stocks.

  De esas, las imprescindibles son Documento, Código de excepción y
  Ubic.procedencia: sin ellas no hay caso ni gaveta que contar. Las demás
  pueden faltar, y la app te avisa cuáles al importar: el ranking que sale de
  esa columna queda en "(sin dato)" y nada más. *Tipo almacén origen* es la que
  alimenta el ranking por tipo de almacén; se busca primero la del **origen**,
  porque la gaveta que falló es la de procedencia.
- **Pedidos** (opcional): Documento, Documento ERP, Documento original de ERP,
  Destinatario mcía., Descripción destinatario de mercancías. **No cambia la
  clasificación**: solo trae el ERP y el destinatario para poder avisar que un
  pedido quedó trabado. Si el ERP viene enmascarado como `***`, se usa el
  Documento original de ERP.

Fechas: toma `dd.mm.aaaa`, `dd/mm/aaaa`, `aaaa-mm-dd`, fecha real de Excel o
número de serie. Las horas de SAP vienen como celda con fecha base 1899 y se
muestran como HH:MM:SS. Cantidades: tolera `1.250,5` y `1,250.5`.

Hoy solo se toma el código **BIDF**. En los reportes también aparece **BIDP**
(en el export de septiembre 2026 son 15 tareas contra 138 BIDF): si alguna vez
lo querés seguir, se agrega a la constante `COD_EXCEPCION` de `app.js`.

### Filas que se saltean

Una tarea de almacén puede venir **partida en dos tramos**, y el tramo interno
llega sin documento y sin ubicación de procedencia. Esa fila no prueba nada:
sin gaveta no se puede saber si la línea salió de la misma o de otra. Lo mismo
con las filas en blanco del final del export.

Por eso se descarta toda fila sin documento, producto, ubicación o fecha de
confirmación, de los dos lados: no genera caso si es BIDF, y no cuenta como
retoma si es una toma limpia. Si se saltea alguna fila BIDF, la importación lo
dice en el resumen.

## Estructura

```
index.html   Pantalla
styles.css   Estilos
app.js       Lógica: lectura de Excel, clasificación, cíclicos, KPI
db.js        Persistencia en IndexedDB
assets.js    Logos embebidos en base64
lib/         SheetJS y Chart.js locales (por eso funciona sin internet)
datos-ejemplo/  Excel de prueba con el layout de SAP
```

La carpeta se llama `lib` y no `vendor` a propósito: Jekyll, que es lo que
publica este repositorio en GitHub Pages, excluye `vendor/` por defecto y la app
quedaría sin librerías si alguna vez se abre desde la web.

Los logos van dentro de `assets.js` para no depender de rutas ni de internet.
Para cambiar uno se reemplaza el base64 de esa clave.

## Sites

La lista está en la constante `SITES`, arriba de `app.js`:

```js
const SITES = [
  { id: 'finning', nombre: 'Finning CAT', detalle: 'Tortuguitas', logo: 'finning' },
  { id: 'otro',    nombre: 'Otro site',   detalle: '',            logo: '' },
];
```

Para sumar un site se agrega una línea. Si le ponés `logo`, tiene que coincidir
con una clave de `LOGOS` en `assets.js`; si no, se muestra el nombre en texto.

## Cosas para tener en cuenta

- Los datos viven en el perfil del navegador de esa PC. Si borrás los datos de
  navegación o usás otro navegador, arrancás de cero. Exportá el Excel de casos
  cada tanto como respaldo.
- Probado en Chrome y Edge, abriendo el archivo directo del disco.
- Las marcas son de sus titulares; los logos están embebidos para uso interno.
