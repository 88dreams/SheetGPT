# Digital Ocean App Platform Deployment Guide

This guide covers deploying SheetGPT to Digital Ocean App Platform using a combined deployment approach where the frontend is built and served by the backend FastAPI application.

## Architecture Overview

Our deployment architecture:

1. **Single Docker Container** - Using a multi-stage build to:
   - Build the frontend React application (first stage)
   - Set up the Python backend (later stage)
   - Include the built frontend assets with the backend

2. **FastAPI Configuration** - Serves both the API and frontend:
   - API routes under `/api/*`
   - Frontend static assets under `/assets/*`
   - Frontend client-side routing via catch-all route

3. **Database** - PostgreSQL database managed by Digital Ocean

## Prerequisites

- Docker installed locally
- Digital Ocean account
- [Digital Ocean CLI](https://docs.digitalocean.com/reference/doctl/) installed and authenticated
- Git repository pushed to GitHub (for automatic builds)

## Local Preparation

### 1. Update Frontend Environment Configuration

Create a production environment file:

```bash
# frontend/.env.production
# Use relative URL since backend/frontend are served from same origin
VITE_API_URL=
NODE_ENV=production
```

### 2. Configure Multi-Stage Dockerfile

We've implemented a multi-stage Dockerfile with the following stages:

1. **frontend-builder** - Builds the React frontend
2. **backend-dev** - Development backend environment (used for local development)
3. **backend-prod** - Production backend with frontend assets included

```dockerfile
# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source files
COPY frontend/ ./

# Create production build
RUN npm run build

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
```

### 3. Configure FastAPI to Serve Frontend Assets

Our `src/main.py` has been updated to serve the frontend assets:

```python
# Check for frontend build directory and serve frontend if available
frontend_dist = Path("frontend/dist")
if frontend_dist.exists() and frontend_dist.is_dir():
    app_logger.info(f"Found frontend build at {frontend_dist.absolute()}")
    
    # Mount static files from frontend build
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="static")
    app_logger.info("Mounted frontend assets")
    
    @app.get("/", include_in_schema=False)
    async def serve_frontend():
        """Serve the frontend index.html"""
        app_logger.info("Serving frontend index.html")
        return FileResponse(frontend_dist / "index.html")
    
    # Handle all frontend routes to enable client-side routing
    @app.get("/{path:path}", include_in_schema=False)
    async def serve_frontend_paths(path: str):
        # If path starts with "api", let it fall through to the API routes
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        # Check if the path exists as a static file
        file_path = frontend_dist / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
            
        # Otherwise serve index.html for client-side routing
        app_logger.info(f"Serving index.html for client-side route: /{path}")
        return FileResponse(frontend_dist / "index.html")
```

### 4. Test Locally

Test the production build locally using docker-compose:

```bash
# Start the production service
docker-compose up app

# This will make the app available at http://localhost:8080
```

Verify that both the API and frontend are accessible:
- Frontend: http://localhost:8080
- API: http://localhost:8080/api

## Digital Ocean Deployment Steps

### 1. Create App Platform App

1. Log in to your Digital Ocean account
2. Navigate to App Platform
3. Click "Create App"
4. Select "GitHub" as your source
5. Select your repository
6. Configure the app:
   - Choose "Dockerfile" as the deployment method
   - Select the branch to deploy from (usually `main`)
   - Enable "Autodeploy on Push" if desired

### 2. Configure App Settings

1. **Docker Configuration**:
   - Dockerfile Path: `Dockerfile`
   - Build Target: `backend-prod` (this is important - specify the production stage)
   - Add the following build command if needed: 
     ```
     docker build --target backend-prod -t ${APP_IMAGE_NAME} .
     ```

2. **Resources**:
   - Set appropriate resource limits for your application (Basic or Professional plan recommended)

3. **Environment Variables**:
   - `ENVIRONMENT`: `production`
   - `SECRET_KEY`: [generate a secure random string]
   - `DATABASE_URL`: [provided by Digital Ocean when you create the database]
   - `CORS_ORIGINS`: [your app domain, e.g., `https://your-app.ondigitalocean.app`]
   - `ANTHROPIC_API_KEY`: [your Anthropic API key]

4. **Database**:
   - Add a PostgreSQL database component
   - Select the plan that fits your needs
   - The connection string will automatically be added as an environment variable

5. **HTTP Settings**:
   - Port: 8000
   - Routes: 
     - HTTP requests to `/` route to port 8000
   - Health Check:
     - Check Path: `/health`
     - Allow HTTP: Enabled

### 3. Deploy the App

1. Review the settings and click "Create Resources"
2. Wait for the deployment to complete
3. Once complete, your app will be available at the provided URL

### 4. Database Migration

After the app is deployed, you need to run the database migrations:

```bash
# Use Digital Ocean CLI to run a one-off console
doctl apps console <APP_ID>

# Once connected to the console, run the migrations
python -m alembic upgrade head
```

Alternatively, you can set up a pre-deployment job in your deployment settings to run the migrations automatically:

1. Go to "Settings" > "Functions"
2. Add a Pre-Deploy Job:
   - Command: `python -m alembic upgrade head`
   - This will run migrations before each deployment

## Monitoring and Maintenance

### Logs

Access logs through the Digital Ocean App Platform UI:
1. Navigate to your app
2. Click on "Logs"
3. Filter by component or log level

### Health Checks

The application includes a comprehensive health check endpoint at `/health` which provides:
- Database connection status
- System information
- Memory usage
- Disk space

### Scaling

To scale your application:
1. Navigate to your app in Digital Ocean
2. Click on "Settings" > "Resources"
3. Adjust the resources as needed:
   - CPU
   - Memory
   - Horizontal scaling (multiple instances)

### Database Backups

1. Navigate to your database in Digital Ocean
2. Click on "Settings" > "Backups"
3. Configure automatic backup schedule

## Troubleshooting

### Frontend Assets Not Found

Check the logs for any errors related to the frontend build:
- Verify that the `frontend/dist` directory is correctly copied to the container
- Check that the assets were mounted correctly
- Look for 404 errors in the logs for missing assets

```bash
# Check logs for frontend asset issues
doctl apps logs <APP_ID> --follow --tail 100
```

### Database Connection Issues

If the application can't connect to the database:
- Verify the database connection string format
- Check if the database is up and running
- Ensure the app has proper network access to the database
- Test the connection:

```bash
# Access the app console
doctl apps console <APP_ID>

# Test database connection
python -c "from src.utils.database import get_engine; from sqlalchemy import text; print('Connected:', get_engine().connect().execute(text('SELECT 1')).scalar() == 1)"
```

### Environment-Specific Bugs

Some issues may only appear in production:
- Check the logs for any errors
- Verify environment variables are correctly set
- Test specific API endpoints to isolate the issue

```bash
# Check environment variables
doctl apps spec get <APP_ID> | grep -A 10 envs
```

## Security Considerations

### CORS Configuration

Ensure CORS is properly configured for your production domain:
- Update `settings.CORS_ORIGINS` to include your app's URL
- Consider using a whitelist approach for allowed origins
- Set separate development and production CORS settings

### API Keys and Secrets

- Never store API keys or secrets directly in the code
- Use environment variables for all sensitive information
- Rotate keys periodically
- Set up secret management in Digital Ocean:
  1. Go to "Settings" > "Environment Variables"
  2. Mark sensitive values as "Encrypted"

### Rate Limiting

The application includes rate limiting middleware in production:
- Adjust rate limits as needed for your traffic patterns
- Monitor for abuse and adjust accordingly

### HTTP Headers

Security headers are automatically added in production:
- Content Security Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

## CI/CD Pipeline

For continuous integration and deployment:

1. Push changes to the configured branch (e.g., `main`)
2. Digital Ocean will automatically build and deploy the new version
3. Check the build logs for any errors

### Setting Up GitHub Actions Integration

For more advanced CI/CD:

1. Create a `.github/workflows/deploy.yml` file:

```yaml
name: Deploy to Digital Ocean

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
          
      - name: Deploy to Digital Ocean
        run: doctl apps create deployment ${{ secrets.DO_APP_ID }}
        
      - name: Wait for deployment
        run: |
          DEPLOYMENT_ID=$(doctl apps list-deployments ${{ secrets.DO_APP_ID }} --format ID --no-header | head -n 1)
          while [ "$(doctl apps get-deployment ${{ secrets.DO_APP_ID }} $DEPLOYMENT_ID --format Phase --no-header)" != "ACTIVE" ]; do
            echo "Waiting for deployment..."
            sleep 30
          done
```

2. Add GitHub secrets:
   - `DIGITALOCEAN_ACCESS_TOKEN`: Your Digital Ocean API token
   - `DO_APP_ID`: Your Digital Ocean App ID

## Database Management

### Running Database Scripts

Use the Digital Ocean console to run database scripts:

```bash
doctl apps console <APP_ID>
python src/scripts/db_management.py stats
```

### Database Migrations

To create and apply new migrations:

```bash
# Create a new migration
doctl apps console <APP_ID>
python src/scripts/alembic_wrapper.py revision --autogenerate -m "migration_name"

# Apply migrations
doctl apps console <APP_ID>
python src/scripts/alembic_wrapper.py upgrade head
```

## Rollback Procedure

If a deployment fails or causes issues:

1. Navigate to your app in Digital Ocean
2. Click on "Deployments"
3. Find the last working deployment
4. Click "..." and select "Rollback to this Deployment"

## Additional Resources

- [Digital Ocean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Alembic Migration Guide](https://alembic.sqlalchemy.org/en/latest/)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Digital Ocean CLI Reference](https://docs.digitalocean.com/reference/doctl/)