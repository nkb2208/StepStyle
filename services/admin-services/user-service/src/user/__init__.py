"""StepStyle User Service (FastAPI).

Admin microservice that manages users of the StepStyle platform.
Maps the ``nguoidung`` table of ``stepstyle_db``.

Authentication is stateless: RS256 access tokens issued by the StepStyle auth
service are verified locally against its JWKS endpoint (no per-request call).
"""

from __future__ import annotations

__version__ = "1.0.0"

__all__ = ["__version__", "main"]


def main() -> None:
    from user.main import main as run

    run()
