# CI/CD Pipeline for SheetGPT

This document explains the Continuous Integration and Continuous Deployment (CI/CD) pipeline set up for the SheetGPT project.

## Overview

The CI/CD pipeline automates the process of testing and (eventually) deploying the SheetGPT application. It helps ensure that code changes are properly tested before they are merged into the main branch and deployed to production.

## Pipeline Components

The pipeline consists of the following components:

1. **GitHub Actions**: The CI/CD platform that runs the pipeline
2. **Docker**: Used to create consistent environments for testing
3. **Jest**: The testing framework for frontend components
4. **Docker Compose**: Used to orchestrate the test environment

## Workflow

The CI/CD pipeline is triggered when:
- Code is pushed to the `main` branch
- A pull request is created targeting the `main` branch

### Steps in the Pipeline

1. **Environment Setup**:
   - The pipeline runs on an Ubuntu virtual machine
   - Docker and Docker Compose are set up
   - A Docker volume is created for persistent data

2. **Testing**:
   - The `run-tests.sh` script is executed
   - This script builds and runs the frontend tests in Docker
   - Tests are run in an isolated environment that matches production

3. **Results Verification**:
   - The pipeline checks if all tests passed
   - If any tests fail, the pipeline fails and provides feedback

## Local vs CI Environment

The CI environment is designed to match the local development environment as closely as possible. The same Docker containers and test scripts are used in both environments to ensure consistency.

## Future Enhancements

Planned enhancements to the CI/CD pipeline include:

1. **Automated Deployment**: Automatically deploy to staging/production when tests pass
2. **Performance Testing**: Add performance tests to ensure the application meets performance requirements
3. **Security Scanning**: Add security scanning to identify potential vulnerabilities
4. **Code Quality Checks**: Add code quality checks to ensure code meets quality standards

## Troubleshooting

If the CI/CD pipeline fails, check the following:

1. **Test Failures**: Look at the test output to identify which tests failed
2. **Environment Issues**: Check if there are any issues with the Docker environment
3. **Dependency Issues**: Ensure all dependencies are properly installed

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Jest Documentation](https://jestjs.io/docs/getting-started) 