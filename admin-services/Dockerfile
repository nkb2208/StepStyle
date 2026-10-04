# syntax=docker/dockerfile:1

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN uv sync --frozen --no-dev --no-install-project
RUN uv sync --frozen --no-dev

FROM python:3.13-slim-bookworm AS runtime
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY src ./src
EXPOSE 4004
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:4004/health', timeout=3).status == 200 else 1)"
CMD ["uvicorn", "adminfeat.main:app", "--host", "0.0.0.0", "--port", "4004"]
