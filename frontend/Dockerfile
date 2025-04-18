# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code@0.2.35

# Install serve for static file serving
RUN npm install -g serve@14.2.1

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

# Build the app for production
RUN npm run build

# Expose port
EXPOSE 5173

# Create startup script
RUN echo '#!/bin/sh\n\
echo "Starting static file server..."\n\
cd /app/dist\n\
serve -s -l 5173 --cors\n\
' > /app/start.sh && chmod +x /app/start.sh

# Run static file server
CMD ["/app/start.sh"]