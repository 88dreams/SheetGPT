# Use Node.js 18 as specified in package.json engines field
FROM node:18-bullseye

# Set working directory to match the mount point subdir
WORKDIR /app

# Ensure corepack is enabled (for managing yarn version if needed)
# and yarn is available. Yarn is usually bundled with Node 18 images.
# This step also ensures that yarn's shims are in the path.
RUN corepack enable && corepack prepare yarn@stable --activate

# The Node base image should already set this, but to be explicit:
# Add Node's global bin directory and Yarn's shims to PATH
# /usr/local/bin is standard for Node global binaries.
# Corepack shims are also typically placed where they are found.
ENV PATH /usr/local/bin:${PATH}

# Copy package files
COPY package.json yarn.lock* ./
# If yarn.lock exists, copy it too. The wildcard handles its potential absence.

# Install dependencies using yarn (Re-enable --frozen-lockfile)
RUN yarn install --frozen-lockfile
# RUN yarn install

# Explicitly remove Vite cache after installation
RUN rm -rf node_modules/.vite

# Remove the npm verification step as yarn handles this.
# RUN echo "Verifying installed packages..." && \
#     npm list @tanstack/react-query @tanstack/query-core vite esbuild

# Copy project files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server with specific NODE_ENV
ENV NODE_ENV=development
# Use the explicit path to vite binary
CMD ["./node_modules/.bin/vite", "--host", "0.0.0.0"]