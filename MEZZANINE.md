# Mezzanine — ubicación y ocupación

Documenta la capa `MZ` de `gemelo-digital-cd.html` (botón **Mezzanine** del HUD).

## 1. Esquema de codificación

Las ubicaciones **no están escritas a mano**: se derivan de la misma geometría que
dibuja el mezzanine (`LAY.MEZZ`, `LAY.GAB_ROWS`, `LAY.GAB_BLOCKS`,
`LAY.MEZZ_OFFICE`), así que el código y el modelo no se pueden desincronizar.
Si cambia el layout, cambian las ubicaciones.

| Nivel | Formato | Ejemplo | Lectura |
|---|---|---|---|
| Gaveteros (bajo el deck) | `MZ-{bloque}{fila}-{casillero}-{nivel}{columna}` | `MZ-A07-03-2C` | zona MZ · bloque A · fila 07 · casillero 03 · nivel 2 · columna C |
| Bandejas (sobre el deck) | `MZ-D{fila}-{módulo}-L{nivel}` | `MZ-D03-21-L2` | zona MZ · fila D03 · módulo 21 · nivel L2 |

- **Bloques**: `A` (x −35,4 a −24,6) y `B` (x −21,0 a −10,0).
- **Filas de gaveteros**: 01 a 14, de z = −0,10 a z = 13,68 (paso 1,06 m).
- **Niveles de gavetero**: `1` arriba, `3` abajo. **Columnas**: `A`–`D` de izquierda a derecha (x creciente).
- **Niveles de bandeja**: `L1` abajo a `L4` arriba.
- La numeración de casillero es **física**: donde está la oficina del mezzanine
  (filas 10–14 del bloque A, casilleros 01–04) los números existen pero no hay
  posición. Así el número de casillero no se corre si mañana se saca la oficina.

Para cambiar el formato hay **una sola función** a tocar, `fmt()`, al principio
del bloque `const MZ=(function(){…})` en `gemelo-digital-cd.html`.

## 2. Inventario de posiciones

| | Casilleros / módulos | Ubicaciones | Hueco unitario | Volumen |
|---|---|---|---|---|
| Gaveteros bajo deck | 148 casilleros (4 col × 3 niveles) | **1.776** | 0,435 × 0,613 × 0,80 m | 379 m³ |
| Bandejas sobre deck | 5 filas × 41 módulos × 4 niveles | **820** | 0,62 × 0,66 × 0,85 m | 285 m³ |
| **Total** | | **2.596** | | **664 m³** |

Superficie del mezzanine: 27,4 × 15,2 m = 416 m².

## 3. Carga de ocupación real (CSV)

Hasta que se carga un archivo, la ocupación que se ve es **simulada** y el panel
lo avisa en ámbar. El ciclo previsto es: **Exportar CSV → completar en Excel →
Cargar CSV**.

Delimitador `,`, `;` o tabulación (se detecta solo), UTF‑8 con o sin BOM, y
admite coma decimal. Sólo `ubicacion` es obligatoria:

| Columna | Alias aceptados | Uso |
|---|---|---|
| `ubicacion` | ubicación, location, loc, posicion, bin | **obligatoria**, debe coincidir con el maestro |
| `sku` | codigo, parte, part, material, item, articulo | se muestra al seleccionar y es buscable |
| `descripcion` | desc, detalle, nombre | informativo |
| `cantidad` | cant, qty, stock, saldo, existencia | > 0 marca la posición como ocupada |
| `ocupacion` | ocup, fill, llenado, pct | 0–1 o 0–100; define el color del mapa de calor |
| `clase` | abc, categoria, rotacion | A/B/C; habilita el modo ABC |

Las ubicaciones del maestro que no estén en el archivo se muestran **vacías**, y
el panel informa cuántas quedaron sin dato y cuántos códigos no reconoció.

## 4. Colores

Escala secuencial de un solo tono para la ocupación, slots categóricos 1‑3 para
ABC, gris neutro para lo recesivo. Validados contra la superficie del panel
(`#1b232b`): banda de luminosidad, piso de croma, separación para daltonismo y
contraste.

## 5. Pendientes a verificar con el plano real

1. **Códigos**: el esquema de arriba es propio de este modelo. Si el WMS ya tiene
   codificadas las posiciones del mezzanine, hay que reemplazar `fmt()` por el
   formato real o mapear uno contra otro.
2. **Pasillos entre filas de gaveteros**: con el paso de 1,06 m de `GAB_ROWS` y
   casilleros de 0,85 m de fondo quedan **0,21 m** entre el frente de una fila y
   el fondo de la anterior (y 0,20 m entre casilleros contiguos). El único
   pasillo real es el central de 2,0 m entre los bloques A y B. Eso no es
   operable: o el plano tiene pasillos que el modelo no tomó, o los casilleros
   son de doble cara. Hasta aclararlo, las 1.776 posiciones de gavetero son un
   **techo teórico**, no una capacidad utilizable.
