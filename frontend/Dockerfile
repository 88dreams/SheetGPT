# Use Node.js 18 as specified in package.json engines field
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with fixed versions for critical packages
RUN npm install --legacy-peer-deps && \
    npm install @ant-design/cssinjs@1.16.2 antd@5.0.0 @ant-design/icons@5.0.0 --save-exact --legacy-peer-deps && \
    npm install --save-dev tailwind-scrollbar@3.0.5 --legacy-peer-deps

# Copy project files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev"]