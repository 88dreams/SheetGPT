# Use Node.js 18 as specified in package.json engines field
FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Yarn is likely pre-installed or installed in a base layer, remove explicit install
# RUN npm install -g yarn

# Copy package files
COPY package.json yarn.lock* ./
# If yarn.lock exists, copy it too. The wildcard handles its potential absence.

# Install dependencies using yarn
RUN yarn install --frozen-lockfile

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