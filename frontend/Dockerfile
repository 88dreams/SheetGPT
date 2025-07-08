# 1. Use the correct Node.js version that matches your project's requirement
FROM node:18-slim

# Set the working directory for the application
WORKDIR /app

# 2. Copy the root package.json and yarn.lock to leverage Docker's layer caching.
# This step requires the build context in Digital Ocean to be the repository root.
COPY package.json yarn.lock ./

# 3. Copy the frontend-specific code into its workspace directory
COPY frontend/ ./frontend/

# 4. Install all dependencies for the entire monorepo using yarn.
# --frozen-lockfile ensures that the exact versions from yarn.lock are used.
RUN yarn install --frozen-lockfile

# 5. Expose the port Vite runs on
EXPOSE 5173

# 6. Set the command to run the dev server for the frontend workspace.
# This correctly targets the 'dev' script inside the frontend's package.json.
CMD ["yarn", "workspace", "sheetgpt-frontend", "run", "dev"]