# Stage 1: Build the frontend
FROM node:18-bullseye AS frontend-builder

WORKDIR /app

COPY frontend/package.json ./frontend/
COPY frontend/yarn.lock ./frontend/

WORKDIR /app/frontend
RUN rm -rf node_modules
RUN yarn install --frozen-lockfile
RUN rm -rf node_modules/.vite

WORKDIR /app
COPY frontend/ ./frontend/

WORKDIR /app/frontend
RUN yarn build

# Stage 2: Development backend (without built frontend)
FROM python:3.9-slim AS backend-dev

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p data/exports

# Expose port
EXPOSE 8000

# Use environment variable for development
ENV ENVIRONMENT=development

# Start the application with hot reload for development
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 3: Production backend with frontend assets
FROM python:3.9-slim AS backend-prod

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY templates/ ./templates/

# Create necessary directories
RUN mkdir -p data/exports

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 8000

# Set environment variable for production
ENV ENVIRONMENT=production

# Start the application without hot reload for production
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]