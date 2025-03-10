# Use a lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies in production mode
RUN npm ci --only=production

# Copy all project files
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Set environment variable for Cloud Run
ENV PORT=8080

# Start the app
CMD ["node", "server.js"]