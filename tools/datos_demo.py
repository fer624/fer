#!/usr/bin/env python3
"""
Genera datos/ubicaciones-demo.csv: un deposito inventado con la misma
estructura que el maestro de SAP, para que layout3d.html se pueda abrir sin
cargar informacion real. No contiene datos de la empresa.

Uso: python3 tools/datos_demo.py datos/ubicaciones-demo.csv
"""

import csv
import random
import sys
from datetime import date, timedelta

random.seed(7)
HOY = date.today()

# pasillo -> (columnas, niveles, paridad del lado del pasillo, area)
PASILLOS = {
    "01": (26, 6, "par",   "GENE"),
    "02": (30, 8, "ambos", "GENE"),
    "03": (22, 6, "impar", "GENE"),
    "04": (14, 5, "impar", "ALTI"),
    "05": (18, 4, "par",   "ACOP"),
}
TIPOS = [("G002", 1331, 1), ("G004", 2156, 2), ("G005", 2156, 3),
         ("E003", 7514, 20), ("R022", 215000, 375)]


def main():
    salida = sys.argv[1] if len(sys.argv) > 1 else "datos/ubicaciones-demo.csv"
    filas = []
    for pas, (ncol, nniv, paridad, area) in PASILLOS.items():
        for bahia in range(1, ncol + 1):
            lados = {"par": [2], "impar": [1], "ambos": [1, 2]}[paridad]
            for lado in lados:
                col = (bahia - 1) * 2 + lado
                for niv in range(1, nniv + 1):
                    tipo, vmax, pmax = TIPOS[min(len(TIPOS) - 1, (niv - 1) // 2)]
                    nsub = random.choice([3, 4, 4, 5])
                    for sub in range(1, nsub + 1):
                        for pos in range(1, random.choice([3, 4, 5]) + 1):
                            vacia = random.random() < 0.3
                            carga = 0 if vacia else round(vmax * random.triangular(0.05, 1.15, 0.45), 3)
                            full = (not vacia) and carga > vmax * 0.95
                            flags = ("v" if vacia else "") + ("f" if full else "")
                            if random.random() < 0.01:
                                flags += random.choice(["e", "s"])
                            mov = "" if random.random() < 0.05 else str(
                                HOY - timedelta(days=int(random.triangular(0, 900, 40))))
                            filas.append([
                                "9001-%s-%02d-%02d-%02d-%d" % (pas, col, niv, sub, pos),
                                "9001", pas, "%02d" % col, "%02d" % niv, "%02d" % sub, str(pos),
                                tipo, area, pmax, vmax, carga, flags, mov])

    # Un par de ubicaciones sin estructura, como las que trae el maestro real.
    for nombre in ["9001-PISO-RECEPCION", "9001-PISO-DESPACHO", "9001-DEVOLUCIONES"]:
        filas.append([nombre, "9001", "", "", "", "", "", "", "DESP", 0, 0, 0, "v", str(HOY)])

    with open(salida, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["ubicacion", "almacen", "pasillo", "columna", "nivel", "subdiv",
                    "pos", "tipo", "area", "peso_max", "vol_max", "vol_carga",
                    "flags", "ult_mov"])
        w.writerows(filas)
    print("Ubicaciones de muestra: %d -> %s" % (len(filas), salida))


if __name__ == "__main__":
    main()
