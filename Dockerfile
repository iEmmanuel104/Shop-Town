# Use an official Node.js runtime as a parent image
FROM node:16-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application files to the container
COPY . .

# Build the TypeScript files
RUN npm run build

# Expose the port that the app will run on
EXPOSE 8082

# Start the app
CMD ["npm", "start"]
