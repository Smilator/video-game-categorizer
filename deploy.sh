#!/bin/bash

# Video Game Categorizer Deployment Script

set -e

echo "🚀 Starting Video Game Categorizer deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your IGDB API credentials:"
    echo "CLIENT_ID=your_igdb_client_id"
    echo "CLIENT_SECRET=your_igdb_client_secret"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed!"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed!"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build the application
echo "🔨 Building application..."
docker-compose build

# Start the application
echo "🚀 Starting application..."
docker-compose up -d

# Wait for the application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Check if the application is running
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Application deployed successfully!"
    echo "🌐 Access your application at: http://localhost:3001"
    echo ""
    echo "📊 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
    echo "🔄 To restart: docker-compose restart"
else
    echo "❌ Application failed to start!"
    echo "📋 Checking logs..."
    docker-compose logs
    exit 1
fi 