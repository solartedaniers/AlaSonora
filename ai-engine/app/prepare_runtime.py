"""Paso de build (no de arranque): genera la caché de fuentes de Matplotlib en .cache/matplotlib
para que el primer arranque en frío no la construya. Ejecutar con: python -m app.prepare_runtime"""

import os
import time

import matplotlib.font_manager  # noqa: F401  (importarlo construye la caché si no existe)


def main() -> None:
    started = time.time()
    matplotlib.font_manager.fontManager  # noqa: B018  (fuerza la lectura de la caché)
    print(f"matplotlib cache ready in {os.environ['MPLCONFIGDIR']} ({time.time() - started:.1f}s)")


if __name__ == "__main__":
    main()
