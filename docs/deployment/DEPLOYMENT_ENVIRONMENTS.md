# Deployment Environments Guide

This guide covers all deployment options for the SheetGPT application, including development, staging, and production environments.

> **PRODUCTION DEPLOYMENT COMPLETED**: SheetGPT is now fully deployed to production using a split architecture with the frontend on Netlify ([88gpts.com/sheetgpt](https://88gpts.com/sheetgpt)) and the backend on Digital Ocean App Platform ([api.88gpts.com](https://api.88gpts.com)). This separate domain approach provides enhanced scalability, security, and performance while maintaining seamless cross-domain authentication.

## Current Production Environment

The production environment uses the following architecture:

1. **Frontend**: Deployed on Netlify
   - URL: [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt)
   - Build System: Node.js with Vite
   - CDN: Netlify Edge Network
   - CI/CD: Automatic deployment from main branch
   - SSL: Managed by Netlify
   - Custom Domain: 88gpts.com

2. **Backend**: Deployed on Digital Ocean App Platform
   - URL: [api.88gpts.com](https://api.88gpts.com)
   - Container: Docker-based deployment
   - Database: Managed PostgreSQL with SSL
   - CI/CD: Automatic deployment from main branch
   - SSL: Managed by Digital Ocean
   - Custom Domain: api.88gpts.com

3. **Cross-Domain Communication**:
   - Authentication: JWT tokens with secure storage
   - CORS: Configured for cross-domain requests
   - API Requests: Frontend to backend with proper headers
   - Streaming: Server-sent events for Claude API integration
   - Security: HTTPS-only with secure headers

## Deployment Options

SheetGPT can be deployed to the following environments:

1. **Local Development** - Docker-based setup for development
2. **Digital Ocean Cloud** - Current production deployment infrastructure
3. **AWS Cloud** - Alternative production deployment to AWS infrastructure
4. **Self-Hosted Server** - Deployment to your own hardware
5. **Hybrid Setup** - Frontend in cloud, backend on-premises

## Local Development Environment

The local development environment uses Docker Compose to create a consistent and isolated development experience.

### Requirements
- Docker and Docker Compose
- Git
- Node.js 16+ (optional, for running scripts outside of containers)
- Python 3.9+ (optional, for running scripts outside of containers)

### Setup Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sheetgpt.git
   cd sheetgpt
   ```

2. Start the development environment:
   ```bash
   docker-compose up --build -d
   ```

3. Initialize the database:
   ```bash
   docker cp init_db.py sheetgpt-backend-1:/app/ && docker exec -it sheetgpt-backend-1 python /app/init_db.py
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### Environment Configuration

The development environment uses the `.env` files for configuration. You can customize these files for your local setup:

- `.env.development` - Frontend development configuration
- `.env` - Backend configuration

## AWS Cloud Deployment

For production deployment, SheetGPT can be deployed to AWS using various services.

### Requirements
- AWS Account
- AWS CLI configured
- Terraform (optional, for infrastructure as code)
- Docker

### Architecture

The AWS deployment uses the following services:

1. **Amazon ECR** - Container registry for Docker images
2. **Amazon ECS** - Container orchestration for running the application
3. **Amazon RDS** - PostgreSQL database
4. **Amazon S3** - Static assets and file storage
5. **Amazon CloudFront** - CDN for frontend assets
6. **Amazon Route 53** - DNS configuration
7. **Amazon VPC** - Network configuration
8. **AWS IAM** - Access management

### Deployment Steps

See the detailed [AWS Deployment Guide](AWS_DEPLOYMENT.md) for step-by-step instructions.

### Environment Configuration

AWS deployments use environment variables configured in the ECS task definitions:

```json
{
  "containerDefinitions": [
    {
      "name": "sheetgpt-backend",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/sheetgpt-backend:latest",
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql+asyncpg://username:password@database-host:5432/sheetgpt"
        },
        {
          "name": "SECRET_KEY",
          "value": "your-secret-key"
        }
      ]
    }
  ]
}
```

## Self-Hosted Server Deployment

SheetGPT can be deployed to your own hardware using Docker or directly installing dependencies.

### Requirements
- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose
- PostgreSQL database
- Nginx web server
- Let's Encrypt SSL certificate

### Setup Steps

1. Install Docker and Docker Compose:
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sheetgpt.git
   cd sheetgpt
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the application:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. Configure Nginx as reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

6. Set up SSL with Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Maintenance

For self-hosted deployments, regularly perform maintenance:

- Database backups
- System updates
- Security patches
- Log rotation
- Monitoring setup

## Hybrid Deployment

For organizations that require keeping sensitive data on-premises while benefiting from cloud services, a hybrid deployment is possible.

### Architecture

1. **Frontend**: Deployed to AWS S3 + CloudFront or similar cloud service
2. **Backend API**: Deployed on-premises with secure network configuration
3. **Database**: On-premises PostgreSQL instance with regular backups
4. **API Gateway**: Cloud-based gateway that routes requests to on-premises backend

### Configuration

The key to hybrid deployment is properly configuring CORS and authentication:

1. **CORS Configuration**: Frontend in cloud needs to access API on-premises
   ```python
   # Backend CORS configuration
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-cloud-domain.com"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Secure Communication**: Set up VPN or direct connect between cloud and on-premises
3. **Authentication**: Use JWT tokens with secure transmission

## Production Environment Configuration

The production environment uses the following configuration settings for optimal performance, security, and reliability.

### Production Backend Configuration (Digital Ocean)

| Setting | Value | Description |
|---------|-------|-------------|
| Instance Type | Basic | 1 vCPU, 1GB RAM, SSD storage |
| Scaling | Horizontal | Auto-scales from 1-3 instances based on load |
| Region | NYC1 | Digital Ocean New York data center |
| Database | PostgreSQL 15 | Managed DB with 1GB RAM, automatic backups |
| Deployment | Docker | Multi-stage Dockerfile with production optimizations |
| SSL | Auto-managed | Automatic certificate renewal with Let's Encrypt |
| DNS | Custom domain | api.88gpts.com with CNAME record |
| Monitoring | Basic | CPU, memory, request rate metrics |
| Logging | Structured JSON | Centralized logs with retention policy |
| Cron Jobs | Yes | Database backups, maintenance tasks |
| Health Checks | Every 30s | /health endpoint with comprehensive checks |

### Production Frontend Configuration (Netlify)

| Setting | Value | Description |
|---------|-------|-------------|
| Build Command | npm run build | Production optimization with tree-shaking |
| Publish Directory | dist | Output of Vite build process |
| Node Version | 18.x | LTS version for build stability |
| Asset Optimization | Enabled | Automatic minification and compression |
| Build Cache | Enabled | Faster builds with dependency caching |
| Preview Deployments | Enabled | PR previews with unique URLs |
| Custom Domain | 88gpts.com | With automatic HTTPS via Let's Encrypt |
| Redirects | Configured | Client-side routing support with _redirects |
| Headers | Security-focused | CSP, HSTS, and other security headers |
| Functions | Not used | Pure static hosting |
| Analytics | Enabled | Page views, performance metrics |

## Environment Variables

The following environment variables are configured in the production and development environments:

### Backend Environment Variables

| Variable | Development | Production | Required | Description |
|----------|-------------|------------|----------|-------------|
| `DATABASE_URL` | Local PostgreSQL | DO Managed DB | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Development key | Secure random value | Yes | Secret key for JWT tokens |
| `ALGORITHM` | HS256 | HS256 | No | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | 30 | No | JWT token expiration |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | 3 | No | Refresh token expiration |
| `ANTHROPIC_API_KEY` | Test key | Production key | Yes | Claude API key |
| `ENVIRONMENT` | "development" | "production" | Yes | Environment name |
| `CORS_ORIGINS` | "*" | "https://88gpts.com" | Yes | Allowed CORS origins |
| `GOOGLE_SHEETS_CREDENTIALS_PATH` | Local path | DO path | No | Google credentials path |
| `GOOGLE_SHEETS_TOKEN_PATH` | Local path | DO path | No | Google token path |
| `GOOGLE_DRIVE_ENABLE_FOLDERS` | true | true | No | Google Drive folder support |
| `LOG_LEVEL` | "DEBUG" | "INFO" | No | Application log level |
| `ENABLE_SWAGGER` | true | false | No | Enable API docs |
| `SSL_REQUIRED` | false | true | No | Require SSL for PostgreSQL |
| `RATE_LIMIT_PER_MINUTE` | 0 | 100 | No | API rate limit |
| `MAX_CONTENT_SIZE_MB` | 10 | 5 | No | Max upload size |
| `ENABLE_TELEMETRY` | false | true | No | Usage analytics |

### Frontend Environment Variables

| Variable | Development | Production | Required | Description |
|----------|-------------|------------|----------|-------------|
| `VITE_API_URL` | "/api" | "https://api.88gpts.com" | Yes | Backend API URL |
| `VITE_GOOGLE_CLIENT_ID` | Test ID | Production ID | No | Google OAuth client ID |
| `VITE_ENABLE_SERVICE_WORKER` | false | true | No | PWA service worker |
| `NODE_ENV` | "development" | "production" | Yes | Node environment |
| `VITE_AUTH_STORAGE_TYPE` | "session" | "local" | No | Auth token storage |
| `VITE_DEFAULT_PAGE_SIZE` | 100 | 50 | No | Default pagination size |
| `VITE_DEFAULT_TIMEOUT_MS` | 30000 | 15000 | No | API request timeout |
| `VITE_ENABLE_ANALYTICS` | false | true | No | Frontend analytics |
| `VITE_LOG_LEVEL` | "debug" | "error" | No | Console log level |
| `VITE_ENABLE_DEVTOOLS` | true | false | No | Development tools |
| `VITE_API_VERSION` | "v1" | "v1" | No | API version |

## Deployment Checklist

Before deploying to any environment, run through this checklist:

1. **Database Migration**:
   - Run `alembic upgrade head` to update database schema
   - Verify migrations run without errors

2. **Environment Variables**:
   - Check all required variables are set
   - Ensure sensitive values are properly secured
   - Verify URLs are correct for the environment

3. **Security**:
   - Ensure CORS is properly configured
   - Verify authentication is working
   - Check SSL certificates are valid
   - Review API access restrictions

4. **Testing**:
   - Run unit and integration tests
   - Perform manual testing on critical paths
   - Check Google Sheets integration if used

5. **Performance**:
   - Optimize static assets
   - Enable caching where appropriate
   - Configure autoscaling if needed

6. **Monitoring**:
   - Set up logging
   - Configure error reporting
   - Implement health checks
   - Set up performance monitoring

## Troubleshooting Deployment Issues

### Database Connection Issues
- Verify connection string is correct
- Check network connectivity between application and database
- Ensure database user has correct permissions
- Check database firewall rules

### Frontend/Backend Integration Issues
- Verify API URL is correctly set in frontend environment
- Check CORS configuration
- Monitor network requests in browser devtools
- Verify authentication flow is working

### Container Deployment Issues
- Check container logs
- Verify container has access to required resources
- Ensure volume mounts are correctly configured
- Check container network configuration

## References

- [Docker Documentation](https://docs.docker.com/)
- [AWS Deployment Guide](AWS_DEPLOYMENT.md)
- [CI/CD Pipeline Documentation](CI_CD_PIPELINE.md)