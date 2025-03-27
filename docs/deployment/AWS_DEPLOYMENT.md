# AWS Deployment Guide

> **Note**: This guide outlines a reference architecture for deploying SheetGPT to AWS. The project currently uses Docker Compose for local development, but this guide provides a blueprint for future production deployment to AWS.

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
  - Static website hosting for React application
  - Global CDN distribution for low-latency access
  - SSL/TLS encryption for secure communication
  - Custom domain support with Route 53 integration

### 2. Backend Services
- **ECS (Elastic Container Service)**
  - Docker container management for FastAPI application
  - Auto-scaling based on CPU/memory utilization
  - Load balancing through Application Load Balancer
  - Health monitoring and automatic container replacement

### 3. Database
- **RDS (PostgreSQL)**
  - Managed PostgreSQL database for reliable data storage
  - Automated backups with point-in-time recovery
  - Multi-AZ deployment for high availability
  - Encryption at rest for data security

### 4. Additional Services
- **Route 53**: DNS management with health checks
- **CloudWatch**: Monitoring, logging, and alerting
- **API Gateway**: API management and documentation
- **ACM**: SSL certificate management
- **Secrets Manager**: Secure credential management

## Deployment Process

### 1. Initial Setup

```bash
# Install AWS CLI
brew install awscli  # macOS
apt-get install awscli  # Ubuntu/Debian
aws configure        # Set up credentials

# Install AWS CDK (if using Infrastructure as Code)
npm install -g aws-cdk
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

### 2. Infrastructure Setup

The AWS CDK can be used to define infrastructure as code:

```typescript
// AWS CDK Infrastructure Code
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class SheetGPTStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for networking
    const vpc = new ec2.Vpc(this, 'SheetGPTVpc', {
      maxAzs: 2,
      natGateways: 1
    });

    // Frontend bucket
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // CloudFront distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: websiteBucket
          },
          behaviors: [{ isDefaultBehavior: true }]
        }
      ]
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'SheetGPTCluster', {
      vpc: vpc
    });

    // RDS Instance
    const database = new rds.DatabaseInstance(this, 'SheetGPTDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      vpc,
      multiAz: true,
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      databaseName: 'sheetgpt',
      credentials: rds.Credentials.fromGeneratedSecret('postgres')
    });
  }
}
```

### 3. Environment Configuration

Create environment-specific configuration files:

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

Set up a GitHub Actions workflow for continuous deployment:

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
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build and push Docker image
        run: |
          docker build -t sheetgpt .
          aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
          docker tag sheetgpt:latest ${{ secrets.ECR_REGISTRY }}/sheetgpt:latest
          docker push ${{ secrets.ECR_REGISTRY }}/sheetgpt:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster sheetgpt-cluster --service sheetgpt-service --force-new-deployment

      - name: Build and deploy frontend
        run: |
          cd frontend
          npm install
          npm run build
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }} --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

## Security Configuration

### 1. IAM Roles and Policies

Create least-privilege IAM roles for services:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::sheetgpt-frontend/*"
    }
  ]
}
```

### 2. Network Security

Implement defense-in-depth security:

- VPC with public and private subnets
- Security groups with least-privilege access
- Network ACLs for additional protection
- SSL/TLS encryption for all traffic
- WAF for protection against common web exploits

### 3. Application Security

Ensure application-level security:

- JWT token validation with proper expiration
- API key management for external services
- Rate limiting to prevent abuse
- Input validation to prevent injection attacks
- CORS configuration for frontend access

## Monitoring and Logging

### 1. CloudWatch Configuration

Set up comprehensive monitoring:

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
    alarm_actions:
      - arn:aws:sns:us-east-1:123456789012:alerts
```

### 2. Health Checks

Implement robust health checks:

```typescript
// health/checks.ts
export const healthConfig = {
  path: '/api/v1/health',
  interval: 30,
  timeout: 5,
  healthy_threshold: 2,
  unhealthy_threshold: 3,
  success_codes: '200-299'
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

Implement cost-effective auto-scaling:

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
  auto_pause: true  # For dev/test environments
  min_capacity: 2
  max_capacity: 8
```

## Migration Steps

1. **Preparation**
   - Backup local database
   - Test application in staging environment
   - Update DNS records with appropriate TTL
   - Configure SSL certificates in ACM

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
   cd frontend
   npm run build
   aws s3 sync dist/ s3://sheetgpt-frontend --delete
   
   # Deploy backend
   aws ecs deploy sheetgpt-cluster sheetgpt-service
   ```

4. **Verification**
   - Check health check endpoints
   - Verify database connectivity
   - Test API functionality
   - Confirm frontend loading
   - Validate SSL certificates

## Rollback Plan

In case of deployment issues:

```bash
# Revert ECS deployment
aws ecs update-service --cluster sheetgpt-cluster --service sheetgpt-service --task-definition previous-task-def

# Revert frontend
aws s3 sync s3://sheetgpt-frontend-backup s3://sheetgpt-frontend --delete

# Restore database
aws rds restore-db-instance-from-db-snapshot --db-snapshot-identifier backup-snapshot
```

## Future Considerations

1. **Scaling**
   - Deploy to multiple regions for global availability
   - Implement read replicas for database scaling
   - Add ElastiCache for caching frequently accessed data
   - Optimize content delivery with CloudFront configurations

2. **Monitoring**
   - Implement Application Performance Monitoring (APM)
   - Set up error tracking with Sentry or similar
   - Add user analytics with Amplitude or Google Analytics
   - Implement performance monitoring with custom dashboards

3. **Security**
   - Implement AWS WAF for enhanced protection
   - Set up AWS Shield for DDoS protection
   - Schedule regular security audits
   - Implement compliance monitoring for regulatory requirements

4. **Cost Management**
   - Implement resource tagging for cost allocation
   - Set up budget alerts for cost control
   - Optimize resource usage based on metrics
   - Consider reserved instances for predictable workloads

## Maintenance

1. **Regular Tasks**
   - Verify database backups weekly
   - Implement log rotation and archiving
   - Renew SSL certificates before expiration
   - Apply security updates promptly

2. **Emergency Procedures**
   - Document incident response procedures
   - Test backup restoration quarterly
   - Implement service recovery automation
   - Establish communication plan for outages

## Current Status

> **Note**: This deployment guide is a reference for future AWS deployment. The project currently uses Docker Compose for local development as described in the [README.md](../README.md) file. When ready to deploy to AWS, this guide can be used as a starting point. 