# CI/CD Pipeline for SheetGPT

This document provides a comprehensive guide to the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the SheetGPT project.

## Overview

The CI/CD pipeline automates the process of testing and (eventually) deploying the SheetGPT application. It helps ensure that code changes are properly tested before they are merged into the main branch and deployed to production.

The pipeline is configured to run on every push to the `main` branch and on pull requests targeting the `main` branch.

## Pipeline Components

The pipeline consists of the following components:

1. **GitHub Actions**: The CI/CD platform that runs the pipeline
2. **Docker**: Used to create consistent environments for testing
3. **Jest**: The testing framework for frontend components
4. **Docker Compose**: Used to orchestrate the test environment

## Workflow Configuration

The CI/CD pipeline is defined in `.github/workflows/ci-cd.yml` and consists of the following steps:

1. **Checkout Code**: Retrieves the latest code from the repository
2. **Set up Docker Buildx**: Prepares the Docker build environment
3. **Create Network Volume**: Sets up a Docker volume for networking
4. **Run Tests**: Executes the test suite using Docker Compose
5. **Check Test Results**: Verifies that all tests passed successfully

## Scheduled Testing

In addition to the CI/CD pipeline that runs on pushes and pull requests, we have a scheduled nightly test workflow defined in `.github/workflows/nightly-tests.yml`. This workflow:

1. **Runs automatically at midnight UTC every day**
2. **Can be triggered manually** using the GitHub Actions workflow_dispatch event
3. **Generates a test report** that is uploaded as an artifact
4. **Creates an issue automatically** if tests fail, to ensure visibility of test failures

The nightly tests help catch issues that might have been introduced during development but weren't caught by the regular CI/CD pipeline, such as:

- Integration issues between components
- Time-dependent bugs
- Performance regressions
- Issues that only appear after extended use

### Viewing Nightly Test Results

You can view the results of nightly tests in the GitHub Actions tab of the repository. The test reports are uploaded as artifacts and can be downloaded for detailed inspection.

If a nightly test fails, an issue will be automatically created in the repository with details about the failure, making it easy to track and address.

## Running Tests Locally

To run the same tests locally that are executed in the CI/CD pipeline:

```bash
# Ensure you have Docker and Docker Compose installed
chmod +x ./run-tests.sh
./run-tests.sh
```

This script will:
1. Build the frontend-test Docker image
2. Run the tests in a Docker container
3. Report the test results

## Test Environment

The test environment is defined in `frontend/Dockerfile.test` and uses:

- Node.js 20 (LTS version)
- npm for package management
- Jest for test execution

The Docker Compose configuration for testing is in `docker-compose.yml` under the `frontend-test` service.

## Test Coverage

The test suite covers:

- React components in the SportDataMapper module
- Custom hooks for data management
- Entity detection functionality
- UI components and interactions

## Local vs CI Environment

The CI environment is designed to match the local development environment as closely as possible. The same Docker containers and test scripts are used in both environments to ensure consistency.

## Troubleshooting

If the CI/CD pipeline fails, check the following:

1. **Test Failures**: Look at the test output to identify which tests failed
2. **Environment Differences**: Ensure your local Docker setup matches the CI environment
3. **Dependency Issues**: Verify that all dependencies are correctly installed in the Docker image
4. **Test Timing**: Some tests may be sensitive to timing issues in the CI environment

## Adding New Tests

When adding new tests:

1. Follow the existing patterns for component and hook testing
2. Ensure tests are isolated and don't depend on external services
3. Use mocks for external dependencies
4. Verify that tests pass both locally and in the CI environment

## Monitoring Workflow Runs

You can monitor workflow runs using the GitHub CLI:

```bash
# List recent workflow runs
gh run list

# View details of a specific run
gh run view [run-id]

# Watch a workflow run in real-time
gh run watch [run-id]
```

Or through the GitHub web interface under the "Actions" tab of the repository.

## Future Enhancements

Planned enhancements to the CI/CD pipeline include:

1. **Automated Deployment**: Automatically deploy to staging/production when tests pass
2. **Code Quality Checks**: Add linting and code formatting verification
3. **Performance Testing**: Add tests for application performance
4. **Security Scanning**: Add security scanning to identify potential vulnerabilities
5. **End-to-End Testing**: Add comprehensive end-to-end tests

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Jest Documentation](https://jestjs.io/docs/getting-started) 