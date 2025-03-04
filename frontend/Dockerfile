# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install tailwind-scrollbar@3.0.5 --save-dev
RUN npm install react-markdown@10.0.0 --save
RUN npm install date-fns@4.1.0 --save
RUN npm install @heroicons/react@2.1.1 --save
RUN npm install @headlessui/react@1.7.17 --save
RUN npm install uuid@11.1.0 --save
RUN npm install @types/uuid@10.0.0 --save-dev
RUN npm install antd@5.0.0 --save
RUN npm install @ant-design/icons@5.0.0 --save

# Copy project files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server with host flag to allow external access
CMD ["npm", "run", "dev", "--", "--host"] 