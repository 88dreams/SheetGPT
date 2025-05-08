# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package.json and yarn.lock first to the frontend subdirectory
COPY frontend/package.json ./frontend/
COPY frontend/yarn.lock ./frontend/
# NOTE: This assumes yarn.lock exists in your local SheetGPT/frontend/ directory.
# If it might be missing, the build could fail here. Ensure yarn.lock is committed.

# Change WORKDIR to where yarn install needs to run
WORKDIR /app/frontend
RUN yarn install --frozen-lockfile
RUN rm -rf node_modules/.vite # Clean Vite cache

# Go back to the parent WORKDIR before copying the rest of the source code
WORKDIR /app
# Copy the entire content of the local frontend directory into /app/frontend in the image
COPY frontend/ ./frontend/

# Set WORKDIR for the build command
WORKDIR /app/frontend
RUN yarn build # Runs 'tsc && vite build' from frontend/package.json

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