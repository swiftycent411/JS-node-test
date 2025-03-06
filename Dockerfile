# Use the official Node.js image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Set the command to start the app
CMD ["node", "server.js"]