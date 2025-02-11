# Use the official Node.js image as a base
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (to optimize caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set working directory inside src (since server.js is inside src)
WORKDIR /app/src

# Expose the application's port
EXPOSE 5000

# Use nodemon for development, node for production
CMD ["npm", "run", "dev"]
