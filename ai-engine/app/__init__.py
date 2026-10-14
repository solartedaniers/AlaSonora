import os
from pathlib import Path

# birdnetlib importa matplotlib.pyplot al cargarse. Dejo su caché de fuentes dentro del proyecto para
# generarla en el build (python -m app.prepare_runtime) y no en cada arranque en frío de Render.
# Las variables de entorno, si existen, mandan sobre estos valores.
os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parent.parent / ".cache" / "matplotlib"))
# Sin pantalla: el backend Agg evita que matplotlib busque uno gráfico al importarse.
os.environ.setdefault("MPLBACKEND", "Agg")
