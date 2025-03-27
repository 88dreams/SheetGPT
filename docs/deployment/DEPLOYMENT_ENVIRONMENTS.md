# Deployment Environments Guide

This guide covers all deployment options for the SheetGPT application, including development, staging, and production environments.

## Deployment Options

SheetGPT can be deployed to the following environments:

1. **Local Development** - Docker-based setup for development
2. **AWS Cloud** - Production deployment to AWS infrastructure
3. **Self-Hosted Server** - Deployment to your own hardware
4. **Hybrid Setup** - Frontend in cloud, backend on-premises

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

## Environment Variables

Regardless of deployment environment, the following environment variables are required:

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SECRET_KEY` | Secret key for JWT tokens | Yes |
| `ALGORITHM` | JWT algorithm (default: HS256) | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token expiration (default: 30) | No |
| `GOOGLE_SHEETS_CREDENTIALS_PATH` | Path to Google Sheets credentials | No |
| `GOOGLE_SHEETS_TOKEN_PATH` | Path to Google Sheets token | No |
| `GOOGLE_DRIVE_ENABLE_FOLDERS` | Enable Google Drive folders | No |
| `GOOGLE_DRIVE_DEFAULT_FOLDER` | Default Google Drive folder | No |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `VITE_ENABLE_SERVICE_WORKER` | Enable service worker | No |

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