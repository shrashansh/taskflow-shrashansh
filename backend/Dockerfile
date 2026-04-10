FROM python:3.12-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/build/deps -r requirements.txt

FROM python:3.12-slim AS runtime

RUN groupadd --system appuser && useradd --system --gid appuser appuser

COPY --from=builder /build/deps /usr/local

WORKDIR /app
COPY . .
ENV PYTHONPATH=/app

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["bash", "-c", "alembic upgrade head && python seeds/seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
