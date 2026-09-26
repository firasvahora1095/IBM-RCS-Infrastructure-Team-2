FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    postgresql \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY schemas ./schemas
COPY scripts ./scripts
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Initialize PostgreSQL data directory
RUN PG_VERSION=$(ls /usr/lib/postgresql/) && \
    su -c "/usr/lib/postgresql/$PG_VERSION/bin/initdb -D /var/lib/postgresql/$PG_VERSION/main" postgres

ENV DATABASE_URL=postgresql+psycopg2://rcs_app:rcs_demo_password@localhost:5432/rcs_infra
ENV CORS_ALLOWED_ORIGINS=http://localhost:5173
ENV ORCHESTRATE_MODE=mock
ENV VIDEO_STORAGE_BACKEND=local

EXPOSE 8080

CMD ["/entrypoint.sh"]
