FROM node:18-alpine

WORKDIR /app

# Install system dependencies for Playwright/OnStar
RUN apk add --no-cache \
    curl \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libstdc++ \
    libgcc \
    libx11 \
    libxcomposite \
    libxcursor \
    libxdamage \
    libxext \
    libxfixes \
    libxi \
    libxrandr \
    libxrender \
    libxtst \
    alsa-lib \
    cups-libs \
    fontconfig \
    xvfb

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Configure Playwright to use system Chromium
RUN npx playwright install-deps chromium

# Copy configuration files
COPY config.json ./
COPY config_manager.js ./

# Copy application code
COPY server.js ./
COPY onstar.js ./
COPY database.js ./
COPY session_manager.js ./
COPY deps/ ./deps/

# Create necessary directories
RUN mkdir -p /app/tokens /app/logs
RUN chmod 755 /app/tokens /app/logs

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Set environment variables
ENV NODE_ENV=production
ENV ONSTAR_TOKEN_LOCATION=/app/tokens/

# Playwright environment variables
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV DISPLAY=:99

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Run the application
CMD ["node", "server.js"] 