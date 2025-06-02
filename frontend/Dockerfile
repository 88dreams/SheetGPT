# Use Node.js 18 as specified in package.json engines field
FROM node:18-bullseye

# Set working directory for the entire application build
WORKDIR /app

# Ensure corepack is enabled
RUN corepack enable && corepack prepare yarn@stable --activate

# The Node base image should already set this, but to be explicit:
# Add Node's global bin directory and Yarn's shims to PATH
ENV PATH /usr/local/bin:${PATH}

# Copy root package.json, yarn.lock, and .dockerignore to ensure this layer's cache breaks
COPY package.json yarn.lock* .dockerignore ./

# Copy the frontend workspace files
COPY frontend/ ./frontend/

# Now, run yarn install from the root of the workspace.
# Yarn will install dependencies for all workspaces (i.e., frontend).
RUN yarn install --frozen-lockfilef

# Explicitly remove Vite cache after installation (path relative to WORKDIR /app)
RUN rm -rf frontend/node_modules/.vite

# Expose Vite dev server port
EXPOSE 5173

# Start dev server with specific NODE_ENV
ENV NODE_ENV=development
# Use yarn workspace to run the dev script from the frontend package
CMD ["yarn", "workspace", "sheetgpt-frontend", "run", "dev", "--host", "0.0.0.0"]