# AWS Deployment Guide

## Architecture Overview

```
                                     ┌──────────────┐
                                     │   Route 53   │
                                     │   (DNS)      │
                                     └──────┬───────┘
                                            │
                                     ┌──────┴───────┐
                                     │  CloudFront  │
                                     │   (CDN)      │
                                     └──────┬───────┘
                                            │
                    ┌────────────────┬──────┴───────┬────────────────┐
                    │                │              │                │
             ┌──────┴───────┐ ┌──────┴───────┐ ┌────┴─────┐  ┌──────┴───────┐
             │     S3       │ │   API Gateway │ │   ALB    │  │  CloudWatch  │
             │  (Frontend)  │ │   (API Docs)  │ │(Backend) │  │ (Monitoring) │
             └──────┬───────┘ └──────┬───────┘ └────┬─────┘  └──────────────┘
                    │                │              │
                    │                │         ┌────┴─────┐
                    │                │         │   ECS    │
                    │                │         │(Backend) │
                    │                │         └────┬─────┘
                    │                │              │
                    │                │         ┌────┴─────┐
                    │                │         │   RDS    │
                    │                │         │(Database)│
                    │                │         └──────────┘
```

## Components and Services

### 1. Frontend Hosting
- **S3 + CloudFront**
  - Static website hosting
  - Global CDN distribution
  - SSL/TLS encryption
  - Custom domain support

### 2. Backend Services
- **ECS (Elastic Container Service)**
  - Docker container management
  - Auto-scaling
  - Load balancing
  - Health monitoring

### 3. Database
- **RDS (PostgreSQL)**
  - Automated backups
  - Multi-AZ deployment
  - Encryption at rest
  - Performance insights

### 4. Additional Services
- **Route 53**: DNS management
- **CloudWatch**: Monitoring and logging
- **API Gateway**: API management
- **ACM**: SSL certificate management
- **Secrets Manager**: Credential management

## Deployment Process

### 1. Initial Setup

```bash
# Install AWS CLI
brew install awscli  # macOS
aws configure        # Set up credentials

# Install AWS CDK (if using Infrastructure as Code)
npm install -g aws-cdk
```

### 2. Infrastructure Setup

```typescript
// AWS CDK Infrastructure Code
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';

export class SheetGPTStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Frontend bucket
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
    });

    // CloudFront distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(/*...*/);

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'SheetGPTCluster', {
      vpc: vpc,
    });

    // RDS Instance
    const database = new rds.DatabaseInstance(/*...*/);
  }
}
```

### 3. Environment Configuration

```yaml
# config/production.yml
environment: production
aws:
  region: us-east-1
  profile: sheetgpt-prod

frontend:
  s3_bucket: sheetgpt-frontend
  cloudfront_distribution: XXXXXXXXXXXXX

backend:
  ecs_cluster: sheetgpt-cluster
  container_port: 8000
  desired_count: 2
  cpu: 256
  memory: 512

database:
  instance_type: db.t3.small
  multi_az: true
  backup_retention: 7
```

### 4. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build and push Docker image
        run: |
          docker build -t sheetgpt .
          aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin
          docker tag sheetgpt:latest ${{ secrets.ECR_REGISTRY }}/sheetgpt:latest
          docker push ${{ secrets.ECR_REGISTRY }}/sheetgpt:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster sheetgpt-cluster --service sheetgpt-service --force-new-deployment
```

## Security Configuration

### 1. IAM Roles and Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::sheetgpt-frontend/*"
    }
  ]
}
```

### 2. Network Security

- VPC configuration
- Security groups
- Network ACLs
- SSL/TLS encryption

### 3. Application Security

- JWT token validation
- API key management
- Rate limiting
- Input validation

## Monitoring and Logging

### 1. CloudWatch Configuration

```yaml
# monitoring/cloudwatch.yml
logs:
  retention_days: 30
  log_groups:
    - name: /ecs/sheetgpt
    - name: /rds/sheetgpt

metrics:
  namespaces:
    - AWS/ECS
    - AWS/RDS
    - AWS/S3
    - AWS/CloudFront

alarms:
  - name: HighCPUUtilization
    metric: CPUUtilization
    threshold: 80
    period: 300
    evaluation_periods: 2
```

### 2. Health Checks

```typescript
// health/checks.ts
export const healthConfig = {
  path: '/health',
  interval: 30,
  timeout: 5,
  healthy_threshold: 2,
  unhealthy_threshold: 3,
};
```

## Cost Optimization

### 1. Resource Sizing

| Service | Size | Monthly Cost (Est.) |
|---------|------|-------------------|
| ECS     | 2x t3.small | $30-40 |
| RDS     | db.t3.small | $25-30 |
| S3      | 50GB | $1-2 |
| CloudFront | 100GB | $10-15 |

### 2. Auto-scaling Configuration

```yaml
# scaling/auto-scaling.yml
ecs:
  min_capacity: 1
  max_capacity: 4
  target_cpu_utilization: 70
  scale_in_cooldown: 300
  scale_out_cooldown: 300

rds:
  instance_class: db.t3.small
  auto_pause: true
  min_capacity: 2
  max_capacity: 8
```

## Migration Steps

1. **Preparation**
   - Backup local database
   - Test application in staging
   - Update DNS records
   - Configure SSL certificates

2. **Database Migration**
   ```bash
   # Export local database
   pg_dump -Fc sheetgpt > sheetgpt.dump
   
   # Import to RDS
   pg_restore -h <rds-endpoint> -U postgres -d sheetgpt sheetgpt.dump
   ```

3. **Application Deployment**
   ```bash
   # Deploy frontend
   aws s3 sync build/ s3://sheetgpt-frontend
   
   # Deploy backend
   aws ecs deploy sheetgpt-cluster sheetgpt-service
   ```

4. **Verification**
   - Health check endpoints
   - Database connectivity
   - API functionality
   - Frontend loading
   - SSL certificates

## Rollback Plan

```bash
# Revert ECS deployment
aws ecs update-service --cluster sheetgpt-cluster --service sheetgpt-service --task-definition previous-task-def

# Revert frontend
aws s3 cp s3://sheetgpt-frontend-backup s3://sheetgpt-frontend --recursive

# Restore database
aws rds restore-db-instance-from-db-snapshot --db-snapshot-identifier backup-snapshot
```

## Future Considerations

1. **Scaling**
   - Multiple regions
   - Read replicas
   - Caching layer
   - Content delivery optimization

2. **Monitoring**
   - APM integration
   - Error tracking
   - User analytics
   - Performance monitoring

3. **Security**
   - WAF implementation
   - DDoS protection
   - Regular security audits
   - Compliance monitoring

4. **Cost Management**
   - Resource tagging
   - Budget alerts
   - Usage optimization
   - Reserved instances

## Maintenance

1. **Regular Tasks**
   - Database backups
   - Log rotation
   - Certificate renewal
   - Security updates

2. **Emergency Procedures**
   - Incident response
   - Backup restoration
   - Service recovery
   - Communication plan 