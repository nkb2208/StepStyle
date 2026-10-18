FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt pyproject.toml README.md ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY src/ ./src/
RUN pip install --no-deps -e .

EXPOSE 4006

CMD ["python", "-m", "reporting.main"]
