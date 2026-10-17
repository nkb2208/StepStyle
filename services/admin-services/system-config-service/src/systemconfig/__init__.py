"""StepStyle System Configuration Service (FastAPI).

Admin-only microservice that owns the *store configuration* of the StepStyle
shop: store information, the enabled payment methods and the enabled shipping
carriers. It maps the three pre-existing MySQL tables of `stepstyle_db`:

* ``caidatcuahang``               — store settings (single row)
* ``caidatphuongthucthanhtoan``   — payment-method toggles
* ``caidatdoitacvanchuyen``       — shipping-carrier toggles

Authentication is stateless: RS256 access tokens issued by the StepStyle auth
service are verified locally against its JWKS endpoint (no per-request call).
"""

from __future__ import annotations

__version__ = "1.0.0"

__all__ = ["__version__", "main"]


def main() -> None:
    from systemconfig.main import main as run

    run()
