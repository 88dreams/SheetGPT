# Digital Ocean App Platform Deployment Guide

This guide provides step-by-step instructions for deploying SheetGPT to Digital Ocean App Platform, configuring CI/CD, and maintaining the application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Process](#deployment-process)
6. [Setting Up CI/CD](#setting-up-ci-cd)
7. [Branch Preview Environments](#branch-preview-environments)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backups and Disaster Recovery](#backups-and-disaster-recovery)
10. [Troubleshooting](#troubleshooting)
11. [Cost Optimization](#cost-optimization)

## Prerequisites

Before you begin, ensure you have:

- [ ] Digital Ocean account ([Sign up here](https://cloud.digitalocean.com/registrations/new))
- [ ] GitHub repository with your SheetGPT codebase
- [ ] Domain name for your application
- [ ] SheetGPT codebase with Docker configuration

## Initial Setup

### 1. Create a Digital Ocean Account and Project

1. Sign up for Digital Ocean if you haven't already
2. Create a new project: **Projects** → **New Project**
3. Name your project (e.g., "SheetGPT Production")

### 2. Set Up App Platform Application

1. In your project, navigate to **Apps** → **Create App**
2. Select **GitHub** as your source
3. Grant Digital Ocean access to your repository
4. Select your SheetGPT repository
5. Choose the branch to deploy (typically `main`)

### 3. Configure Service Architecture

In the Digital Ocean App creation workflow:

1. **Detect Services**: DO will automatically detect services from your docker-compose.yml
2. Edit each service component:
   - **Backend Service**:
     - Edit Settings → Choose "Service" type
     - Instance Size: Basic ($12/mo) for testing, Scale as needed
     - HTTP Port: 8000 (FastAPI default)
     - HTTP Request Routes: `/api/*`
   - **Frontend Service**:
     - Edit Settings → Choose "Static Site" type
     - Build Command: `cd frontend && npm install && npm run build`
     - Output Directory: `frontend/dist` (for Vite)
     - HTTP Request Routes: `/*`

### 4. Domain Configuration

1. Add your domain to the app:
   - Go to **Settings** → **Domains**
   - Click **Add Domain**
   - Enter your domain name
   - Select domain type (Apex or www)
2. Configure DNS with provided values:
   - Update DNS records at your domain registrar
   - Add CNAME or A records as instructed
3. Verify domain connection (may take 24-48 hours to propagate)

## Database Configuration

### 1. Create Managed Database

1. From DO dashboard, navigate to **Databases**
2. Click **Create Database Cluster**
3. Select **PostgreSQL**
4. Choose plan:
   - Basic plan ($15/mo) for testing
   - Standard plan for production
5. Select region (same as your App)
6. Add a name (e.g., "sheetgpt-db")
7. Click **Create Database Cluster**

### 2. Connect Database to App

1. In your App dashboard, go to **Settings** → **Components**
2. Select your backend service
3. Go to **Resources** tab
4. Click **Add Resource** → **Database**
5. Select your database cluster
6. Create new database or use default
7. Set environment variable name (e.g., `DATABASE_URL`)

### 3. Initial Database Migration

Run migrations from local environment or through console:

```bash
# Option 1: Connect from local machine
doctl apps create-deployment <app-id> --wait

# Option 2: Connect to Console and run migrations
# Use the Web Console in Digital Ocean dashboard
# Then run:
cd /app
python src/scripts/alembic_wrapper.py upgrade
```

## Environment Configuration

### 1. Set Environment Variables

1. In App dashboard, go to **Settings** → **Components**
2. Select your backend service
3. Go to **Environment Variables** tab
4. Add variables:
   - `DATABASE_URL`: Set automatically from DB connection
   - `SECRET_KEY`: Generate with `openssl rand -hex 32`
   - `CLAUDE_API_KEY`: Your Anthropic API key
   - `ENVIRONMENT`: `production`
   - `GOOGLE_CLIENT_ID`: For Google Sheets integration
   - `GOOGLE_CLIENT_SECRET`: For Google Sheets integration
   - Other service-specific variables

### 2. Configure Secrets

For sensitive information:

1. Navigate to **Settings** → **Components**
2. Select your service
3. Go to **Environment Variables** tab
4. Add variable and check "Encrypt" option
5. Save changes

## Deployment Process

### Manual Deployment

1. Push changes to your configured branch (e.g., `main`)
2. Digital Ocean automatically detects changes and starts deployment
3. Monitor deployment progress in the App dashboard

### Force Deployment

To force a new deployment without code changes:

1. Go to your App dashboard
2. Click **More** → **Deploy**
3. Select the latest commit
4. Click **Deploy**

### Rollback

To roll back to a previous version:

1. Go to your App dashboard
2. Navigate to **Deployments**
3. Find the deployment you want to roll back to
4. Click the three dots menu → **Rollback to this Deployment**

## Setting Up CI/CD

### GitHub Actions Integration

Create `.github/workflows/digital-ocean.yml`:

```yaml
name: Digital Ocean App Platform Deployment
on:
  push:
    branches:
      - main  # Deploy production on main branch push
  pull_request:
    types: [opened, synchronize, reopened]  # Create preview for PRs

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install frontend dependencies
        run: cd frontend && npm ci
      - name: Run frontend tests
        run: cd frontend && npm test
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install backend dependencies
        run: pip install -r requirements.txt
      - name: Run backend tests
        run: pytest

  deploy:
    needs: test
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Digital Ocean Deploy
        uses: digitalocean/app_action@v1.1.5
        with:
          app_name: sheetgpt
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```

### Setting Up Digital Ocean Access Token

1. Create a Digital Ocean access token:
   - Go to **API** → **Tokens/Keys**
   - Click **Generate New Token**
   - Give it a name (e.g., "GitHub Actions")
   - Set appropriate permissions (Admin recommended)
   - Copy the token value
2. Add token to GitHub secrets:
   - In your GitHub repo, go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `DIGITALOCEAN_ACCESS_TOKEN`
   - Value: Paste your token
   - Click **Add secret**

## Branch Preview Environments

### Setting Up Preview Environments

1. In Digital Ocean dashboard, go to your app
2. Navigate to **Settings** → **Components**
3. In your main component, enable **Automatically create preview deployments**
4. Set branch pattern: `feature/*,dev/*`

### Using Preview Environments

1. Create a feature branch: `git checkout -b feature/new-feature`
2. Make changes and push: `git push origin feature/new-feature`
3. App Platform automatically creates a preview environment
4. Access preview: Go to App dashboard → **Deployments** → select preview deployment
5. Share preview URL with team for testing

## Monitoring and Logging

### View Logs

1. Go to your App dashboard
2. Navigate to **Components** and select your component
3. Click the **Logs** tab
4. Filter logs by:
   - Log type (Build, Deploy, Run)
   - Time period
   - Search term

### Set Up Monitoring

1. Go to **Monitoring** tab in your App dashboard
2. View metrics for:
   - CPU Usage
   - Memory Usage
   - Bandwidth
   - Request Count
3. Set up alerts:
   - Click **Create Alert Policy**
   - Configure thresholds and notification channels

## Backups and Disaster Recovery

### Database Backups

1. Go to your database dashboard
2. Navigate to **Settings** → **Backups**
3. Configure backup schedule:
   - Backup frequency
   - Retention period
4. Manual backup:
   - Click **Actions** → **Create Backup**

### Restore Database

1. Go to your database dashboard
2. Navigate to **Backups**
3. Find the backup you want to restore
4. Click **More** → **Restore**
5. Follow the prompts to restore data

### Export Data

To export production data to local environment:

```bash
# Get database connection info
doctl databases connection <database-id> --format ConnectionString

# Export database with pg_dump
pg_dump -d <connection_string> > backup.sql

# Import to local database
psql -d postgresql://localhost:5432/sheetgpt < backup.sql
```

## Troubleshooting

### Common Issues and Solutions

1. **Deployment Failures**:
   - Check build logs for errors
   - Verify Dockerfile configuration
   - Check environment variables

2. **Database Connection Issues**:
   - Verify connection string format
   - Check firewall settings
   - Ensure database user has correct permissions

3. **Domain Configuration Problems**:
   - Verify DNS records are set correctly
   - Check SSL/TLS certificate status
   - Wait for DNS propagation (up to 48 hours)

4. **Performance Issues**:
   - Check resource allocation
   - Monitor database performance
   - Consider scaling up resources

### Getting Support

1. Digital Ocean Support:
   - Navigate to **Support** → **Create Ticket**
   - Provide app ID and specific issue details

2. Community Resources:
   - [Digital Ocean Community](https://www.digitalocean.com/community)
   - [App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)

## Cost Optimization

### Resource Management

1. **Right-sizing**:
   - Start with minimum viable resources
   - Scale based on actual usage patterns
   - Monitor resource utilization regularly

2. **Dev/Test Environments**:
   - Turn off dev/test environments when not in use
   - Schedule automatic shutdowns during non-work hours

3. **Database Optimization**:
   - Choose appropriate database plan
   - Monitor database metrics
   - Optimize queries for performance

### Estimated Costs

| Component | Plan | Monthly Cost |
|-----------|------|--------------|
| Backend Service | Basic | $12/month |
| Frontend Static Site | Basic | $0/month (included) |
| PostgreSQL Database | Basic | $15/month |
| **Total Minimum** | | **$27/month** |

Scale up as needed based on traffic and performance requirements.

## Local-to-Production Workflow

### Development Workflow

1. Develop locally:
   ```bash
   docker-compose up
   ```

2. Create feature branch:
   ```bash
   git checkout -b feature/new-feature
   ```

3. Commit and push changes:
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   git push origin feature/new-feature
   ```

4. Create pull request in GitHub

5. Automatic preview environment is created

6. Test in preview environment

7. Merge to main branch for production deployment

### Database Migration Workflow

1. Create migration locally:
   ```bash
   docker-compose run --rm backend python src/scripts/alembic_wrapper.py revision --autogenerate -m "add_new_table"
   ```

2. Test migration locally:
   ```bash
   docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade
   ```

3. Commit and push migration file:
   ```bash
   git add alembic/versions/
   git commit -m "feat: Add migration for new table"
   git push origin feature/database-updates
   ```

4. After PR is merged, migrations run automatically in production

### Maintenance Tasks

1. Check logs regularly
2. Monitor resource usage
3. Review and optimize database performance
4. Test backup and restore procedures
5. Update dependencies regularly
6. Practice disaster recovery scenarios