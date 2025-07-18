# SheetGPT Documentation

Welcome to the SheetGPT documentation. This directory contains comprehensive documentation about all aspects of the SheetGPT project.

> **IMPORTANT**: The application is now in production! Visit [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt) for the frontend and [api.88gpts.com](https://api.88gpts.com) for the backend API.

## Documentation Structure

The documentation is organized into the following sections:

### Architecture

- [API Architecture](architecture/API_ARCHITECTURE.md) - Overview of the API design and structure
- [Technical Description](architecture/TECHNICAL_DESCRIPTION.md) - Detailed technical overview of the codebase
- [Sports API Endpoints](architecture/SPORTS_API_ENDPOINTS.md) - Documentation of the sports database API endpoints
- [API Examples](architecture/API_EXAMPLES.md) - Example API requests and responses
  - [Corporate Entity](features/CORPORATE_ENTITY.md) - Standalone corporate entities

### Features

- [Claude API Integration](features/CLAUDE_API_INTEGRATION.md) - Details about the Claude AI integration
- [Sport Field Feature](features/SPORT_FIELD_FEATURE.md) - Documentation for the sport field enhancement feature

### Maintenance

- [Database Maintenance](maintenance/DATABASE_MAINTENANCE.md) - Guide for database maintenance procedures
- [Alembic Guide](maintenance/ALEMBIC_GUIDE.md) - Guide for using Alembic with the project
- [Testing Guide](maintenance/TESTING_GUIDE.md) - Comprehensive guide to testing the application
- [Troubleshooting](maintenance/TROUBLESHOOTING.md) - Common issues and solutions

### Deployment

- [Digital Ocean Deployment](deployment/DIGITAL_OCEAN_DEPLOYMENT.md) - Guide for deploying the backend to Digital Ocean
- [Netlify Deployment](deployment/NETLIFY_DEPLOYMENT_STEPS.md) - Guide for deploying the frontend to Netlify
- [Production Preparation](deployment/PRODUCTION_PREPARATION.md) - Checklist for production readiness
- [AWS Deployment](deployment/AWS_DEPLOYMENT.md) - Alternative guide for AWS deployment
- [CI/CD Pipeline](deployment/CI_CD_PIPELINE.md) - Documentation of the continuous integration and deployment process

### Other

- [DEV_INTRO_TESTING.md](DEV_INTRO_TESTING.md) - Introduction to testing for new developers
- [NEW_AGENT.md](NEW_AGENT.md) - Guide for creating new AI agents
- [PROGRESS.md](PROGRESS.md) - Project progress and status updates

## Getting Started

If you're new to the project, we recommend starting with:

1. [README.md](../README.md) - Project overview and setup instructions
2. [Technical Description](architecture/TECHNICAL_DESCRIPTION.md) - Technical overview of the project
3. [API Architecture](architecture/API_ARCHITECTURE.md) - Understanding the API structure

## Production Environment

The application is now deployed and running in production:

- **Frontend**: [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt) - Hosted on Netlify
- **Backend API**: [api.88gpts.com](https://api.88gpts.com) - Hosted on Digital Ocean
- **Database**: PostgreSQL on Digital Ocean managed database

### Deployment Architecture

```sh
User → 88gpts.com/sheetgpt (Netlify) → Frontend Application
                  ↓
                  API Requests
                  ↓
User → api.88gpts.com (Digital Ocean) → Backend API → PostgreSQL Database
```

For details on the production architecture and deployment process, see:

- [Technical Description - Production Architecture](architecture/TECHNICAL_DESCRIPTION.md#production-architecture)
- [Digital Ocean Deployment](deployment/DIGITAL_OCEAN_DEPLOYMENT.md)
- [Netlify Deployment](deployment/NETLIFY_DEPLOYMENT_STEPS.md)

## Contributing to Documentation

When contributing to the documentation:

1. Place new files in the appropriate subdirectory based on content type
2. Update this index file when adding new documentation
3. Follow the existing naming convention (ALL_CAPS.md)
4. Include a clear title and table of contents for each document
5. Add links to related documentation for better navigation

## Documentation Standards

All documentation should:

1. Be clear, concise, and focused on a specific aspect of the project
2. Include code examples where relevant
3. Use proper markdown formatting for readability
4. Be kept up-to-date when the corresponding code changes
5. Link to relevant source code or other documentation when appropriate

Last updated: April 18, 2025
