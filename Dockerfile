# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install axios globally before copying
RUN npm install -g axios

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]
