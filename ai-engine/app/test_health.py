"""Self-check de /health (ponytail: sin pytest, solo asserts). No arranca el lifespan, así que
no carga el modelo: comprueba que la ruta responde a GET y a HEAD, que es lo que usa Render.
Ejecutar con: python -m app.test_health"""

from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    head = client.head("/health")
    assert head.status_code == 200, head.status_code
    assert head.content == b""
    print("health self-check: OK")


if __name__ == "__main__":
    main()
