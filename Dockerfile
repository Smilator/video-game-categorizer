# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vite.config.js ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY index.html ./

# Build the frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy backend package files
COPY server/package*.json ./server/

# Install backend dependencies
RUN cd server && npm ci --only=production

# Copy backend source code
COPY server/ ./server/

# Copy built frontend
COPY --from=builder /app/dist ./public

# Create data directory
RUN mkdir -p server/data

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["node", "server/server.js"] 