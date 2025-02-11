# Use an official Node.js LTS version as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (for caching layers)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project (including /src)
COPY . .

# Expose port 5000 for the application
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
