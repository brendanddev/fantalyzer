FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /uvx /usr/local/bin/

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY services/scoring-engine/pyproject.toml .
RUN uv pip install --system --no-cache .

COPY shared/ /app/shared/
COPY services/scoring-engine/ /app/

CMD ["python", "main.py"]
