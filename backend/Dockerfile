FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY schemas ./schemas
COPY scripts ./scripts

EXPOSE 8080

# Run seed first (skips existing rows), then start the API
CMD ["sh", "-c", "python -m scripts.seed_demo && uvicorn app.main:app --host 0.0.0.0 --port 8080"]
