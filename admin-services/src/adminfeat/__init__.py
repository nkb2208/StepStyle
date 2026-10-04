"""StepStyle admin microservice (FastAPI)."""

from __future__ import annotations

__version__ = "1.0.0"

__all__ = ["__version__", "main"]


def main() -> None:
    from adminfeat.main import main as run

    run()
