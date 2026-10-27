#!/usr/bin/env python3
"""
Convierte el export de ubicaciones de SAP WM (LX03 / tabla LAGP) al CSV liviano
que consume layout3d.html.

Uso:
    python3 tools/sap_a_csv.py Maestro_Ubicaciones.XLSX datos/ubicaciones.csv
    python3 tools/sap_a_csv.py export.XLSX salida.csv --anonimizar

El archivo de entrada puede ser .XLSX (necesita openpyxl) o un .CSV con los
mismos encabezados. Las columnas se buscan por nombre, asi que sobran o faltan
columnas sin romper nada.

--anonimizar reemplaza los codigos de ubicacion por codigos equivalentes con
otro prefijo de almacen y descarta usuarios; sirve para publicar demos.
"""

import csv
import re
import sys
from collections import Counter

# Encabezados del export de SAP -> nombre corto en el CSV de salida.
MAPA = {
    "ubicacion": "Ubicación",
    "almacen": "Tipo almacén",
    "pasillo": "Pasillo",
    "columna": "Col.",
    "nivel": "Nivel",
    "subdiv": "Subdivis.ubicación",
    "tipo": "Tipo de ubicación",
    "area": "Área almacenamiento",
    "peso_max": "Peso máximo",
    "vol_max": "Volumen máximo",
    "vol_carga": "Volumen de carga",
    "ult_mov": "Fe.último movimiento",
    "vacia": "Ind.ubicación vacía",
    "completo": "Indicador completo",
    "bloq_e": "Bloq.entrada stock",
    "bloq_s": "Bloq.salida stock",
}

SALIDA = ["ubicacion", "almacen", "pasillo", "columna", "nivel", "subdiv", "pos",
          "tipo", "area", "peso_max", "vol_max", "vol_carga", "flags", "ult_mov"]

# "1.331" es 1331 mal formateado por el separador de miles; "39.324" es un
# decimal legitimo. Solo corregimos cuando el valor sin puntos ya existe como
# entero en la misma columna.
MILES = re.compile(r"^\d{1,3}(\.\d{3})+$")


def leer(ruta):
    if ruta.lower().endswith((".xlsx", ".xlsm", ".xltx")):
        try:
            import openpyxl
        except ImportError:
            sys.exit("Falta openpyxl: pip install openpyxl")
        wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
        ws = wb[wb.sheetnames[0]]
        for fila in ws.iter_rows(values_only=True):
            yield ["" if c is None else str(c).strip() for c in fila]
    else:
        with open(ruta, encoding="utf-8-sig", newline="") as f:
            for fila in csv.reader(f):
                yield [c.strip() for c in fila]


def indices(encabezado):
    """Primera aparicion de cada encabezado buscado (SAP repite nombres)."""
    pos = {}
    for i, h in enumerate(encabezado):
        if h not in pos:
            pos[h] = i
    faltan = [v for v in MAPA.values() if v not in pos]
    if faltan:
        print("AVISO: no se encontraron estas columnas: %s" % ", ".join(faltan),
              file=sys.stderr)
    return {k: pos.get(v) for k, v in MAPA.items()}


def numero(valor, enteros):
    if not valor:
        return ""
    if MILES.match(valor) and valor.replace(".", "") in enteros:
        return valor.replace(".", "")
    return valor


def fecha(valor):
    return valor[:10] if valor else ""


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    anonimizar = "--anonimizar" in sys.argv
    if len(args) != 2:
        sys.exit(__doc__)
    entrada, salida = args

    filas = list(leer(entrada))
    if not filas:
        sys.exit("El archivo esta vacio.")
    idx = indices(filas[0])
    datos = filas[1:]

    def val(fila, clave):
        i = idx.get(clave)
        return fila[i] if i is not None and i < len(fila) else ""

    # Valores enteros por columna, para resolver el separador de miles.
    enteros = {}
    for clave in ("peso_max", "vol_max"):
        enteros[clave] = {v for v in (val(f, clave) for f in datos) if v.isdigit()}

    escritas = 0
    sin_estructura = 0
    corregidos = Counter()
    almacenes = Counter()

    with open(salida, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(SALIDA)
        for fila in datos:
            ubic = val(fila, "ubicacion")
            if not ubic:
                continue
            segs = ubic.split("-")
            # SAP: almacen-pasillo-columna-nivel-subdivision[-posicion]
            pos = segs[5] if len(segs) >= 6 else ""
            pasillo = val(fila, "pasillo") or (segs[1] if len(segs) > 1 else "")
            columna = val(fila, "columna") or (segs[2] if len(segs) > 2 else "")
            nivel = val(fila, "nivel") or (segs[3] if len(segs) > 3 else "")
            subdiv = val(fila, "subdiv") or (segs[4] if len(segs) > 4 else "")
            if not (pasillo and columna.isdigit() and nivel):
                sin_estructura += 1

            flags = ""
            if val(fila, "vacia") == "X":
                flags += "v"
            if val(fila, "completo") == "X":
                flags += "f"
            if val(fila, "bloq_e") == "X":
                flags += "e"
            if val(fila, "bloq_s") == "X":
                flags += "s"

            peso = numero(val(fila, "peso_max"), enteros["peso_max"])
            vmax = numero(val(fila, "vol_max"), enteros["vol_max"])
            if peso != val(fila, "peso_max"):
                corregidos["peso_max"] += 1
            if vmax != val(fila, "vol_max"):
                corregidos["vol_max"] += 1

            almacen = val(fila, "almacen") or (segs[0] if segs else "")
            if anonimizar:
                ubic = "DEMO" + ubic[len(almacen):] if ubic.startswith(almacen) else ubic
                ubic = ubic.replace("DEMO", "9" + almacen[1:], 1)

            w.writerow([ubic, almacen, pasillo, columna, nivel, subdiv, pos,
                        val(fila, "tipo"), val(fila, "area"), peso, vmax,
                        val(fila, "vol_carga"), flags, fecha(val(fila, "ult_mov"))])
            almacenes[almacen] += 1
            escritas += 1

    print("Ubicaciones exportadas : %d" % escritas)
    print("Almacenes              : %s" % ", ".join(
        "%s(%d)" % kv for kv in sorted(almacenes.items())))
    print("Sin pasillo/col/nivel  : %d  (se dibujan en la zona 'Sin estructura')"
          % sin_estructura)
    if corregidos:
        print("Separador de miles corregido en: %s" % dict(corregidos))
    print("Archivo escrito        : %s" % salida)


if __name__ == "__main__":
    main()
