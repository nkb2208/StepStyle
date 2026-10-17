# syntax=docker/dockerfile:1

FROM python:3.13-slim-bookworm AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/src

WORKDIR /app

# Runtime dependencies first so the layer is cached across source edits.
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY src ./src
# The shared schema dump is mounted by docker-compose into MySQL; it is copied
# here so the image is self-describing for `docker run` debugging.
COPY StepStyle-v2.sql migrations ./

EXPOSE 4004

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:4004/health', timeout=3).status == 200 else 1)"

CMD ["uvicorn", "systemconfig.main:app", "--host", "0.0.0.0", "--port", "4004"]
