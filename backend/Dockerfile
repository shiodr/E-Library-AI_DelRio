FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt constraints.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY main.py alembic.ini ./
COPY alembic ./alembic
RUN useradd --create-home library
USER library
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
