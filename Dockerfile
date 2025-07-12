FROM node:18-alpine

WORKDIR /app

# Install system dependencies for OnStar (playwright needs these)
RUN apk add --no-cache \
    curl \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy configuration files
COPY config.json ./
COPY config_manager.js ./

# Copy application code
COPY server.js ./
COPY onstar.js ./
COPY deps/ ./deps/

# Create necessary directories
RUN mkdir -p /app/tokens /app/logs
RUN chmod 755 /app/tokens /app/logs

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Set environment variables
ENV NODE_ENV=production
ENV ONSTAR_TOKEN_LOCATION=/app/tokens/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Run the application
CMD ["node", "server.js"] 