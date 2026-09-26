FROM postgres:16

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    gcc \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY schemas ./schemas
COPY scripts ./scripts
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV DATABASE_URL=postgresql+psycopg://rcs_app:rcs_demo_password@127.0.0.1:5432/rcs_infra
ENV POSTGRES_DB=rcs_infra
ENV POSTGRES_USER=rcs_app
ENV POSTGRES_PASSWORD=rcs_demo_password
ENV PGDATA=/var/lib/postgresql/data
ENV CORS_ALLOWED_ORIGINS=http://localhost:5173,https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud
ENV ORCHESTRATE_MODE=mock
ENV VIDEO_STORAGE_BACKEND=local

EXPOSE 8080

CMD ["/entrypoint.sh"]
