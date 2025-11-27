# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Accept build arguments
ARG REACT_APP_AZURE_CLIENT_ID
ARG REACT_APP_AZURE_TENANT_ID
ARG REACT_APP_REDIRECT_URI
ARG REACT_APP_API_URL

# Set environment variables from build args
ENV REACT_APP_AZURE_CLIENT_ID=$REACT_APP_AZURE_CLIENT_ID
ENV REACT_APP_AZURE_TENANT_ID=$REACT_APP_AZURE_TENANT_ID
ENV REACT_APP_REDIRECT_URI=$REACT_APP_REDIRECT_URI
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
