FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN pip install --no-cache-dir \
    fastapi==0.110.1 \
    uvicorn==0.25.0 \
    httpx==0.28.1 \
    python-multipart==0.0.9 \
    pydantic==2.13.4
COPY server.py data.json ./
RUN mkdir -p /data
ENV DATA_FILE=/data/data.json
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
