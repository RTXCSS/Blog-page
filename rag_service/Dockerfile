FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py processing.py ./
RUN useradd --create-home brain && mkdir -p /app/storage/chroma && chown -R brain:brain /app
USER brain
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
