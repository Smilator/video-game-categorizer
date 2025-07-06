# Video Game Categorizer - Deployment Guide

This guide covers deploying the Video Game Categorizer application to various hosting platforms.

## Prerequisites

1. **IGDB API Credentials**: You need a Twitch Developer account and IGDB API credentials
   - Go to https://dev.twitch.tv/console
   - Create a new application
   - Get your Client ID and Client Secret

2. **Environment Variables**: Create a `.env` file in the root directory:
   ```
   CLIENT_ID=your_igdb_client_id
   CLIENT_SECRET=your_igdb_client_secret
   ```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Local Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# The app will be available at http://localhost:3001
```

#### Cloud Deployment with Docker

**Railway (Recommended for beginners):**
1. Fork this repository to your GitHub account
2. Go to https://railway.app/
3. Connect your GitHub account
4. Create a new project from your forked repository
5. Add environment variables (CLIENT_ID, CLIENT_SECRET)
6. Deploy

**Render:**
1. Fork this repository to your GitHub account
2. Go to https://render.com/
3. Create a new Web Service
4. Connect your GitHub repository
5. Set build command: `docker build -t video-game-categorizer .`
6. Set start command: `docker run -p 3001:3001 video-game-categorizer`
7. Add environment variables
8. Deploy

**DigitalOcean App Platform:**
1. Fork this repository to your GitHub account
2. Go to https://cloud.digitalocean.com/apps
3. Create a new app from your repository
4. Configure environment variables
5. Deploy

### Option 2: Traditional Hosting

#### VPS Deployment (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repository
git clone https://github.com/yourusername/sito-videogiochi.git
cd sito-videogiochi

# Install dependencies
npm install
cd server && npm install

# Create environment file
cp .env.example .env
# Edit .env with your IGDB credentials

# Build frontend
npm run build

# Start the application with PM2
pm2 start server/server.js --name "video-game-categorizer"
pm2 startup
pm2 save

# Configure Nginx (optional, for domain routing)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/video-game-categorizer

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/video-game-categorizer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Heroku Deployment

1. Install Heroku CLI
2. Create a `Procfile` in the root directory:
   ```
   web: node server/server.js
   ```
3. Deploy:
   ```bash
   heroku create your-app-name
   heroku config:set CLIENT_ID=your_igdb_client_id
   heroku config:set CLIENT_SECRET=your_igdb_client_secret
   heroku config:set NODE_ENV=production
   git push heroku main
   ```

### Option 3: Serverless Deployment

#### Vercel Deployment

1. Fork this repository
2. Go to https://vercel.com/
3. Import your repository
4. Configure environment variables
5. Deploy

**Note**: Vercel is primarily for frontend applications. You'll need to deploy the backend separately or use a different approach.

## Database Considerations

The current implementation uses a JSON file-based database stored in `server/data/platformData.json`. For production deployments, consider:

### Option 1: Keep JSON Database (Simple)
- Works well for small to medium user bases
- Data is persisted in the Docker volume or server filesystem
- No additional infrastructure needed

### Option 2: Upgrade to Real Database (Recommended for scale)
- **MongoDB Atlas** (Free tier available)
- **PostgreSQL** with Supabase or Railway
- **SQLite** for simple deployments

To upgrade to a real database, you would need to:
1. Install a database driver (e.g., `mongoose` for MongoDB, `pg` for PostgreSQL)
2. Update the database functions in `server/server.js`
3. Update the database API service in `src/services/databaseApi.js`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CLIENT_ID` | Your IGDB API Client ID | Yes |
| `CLIENT_SECRET` | Your IGDB API Client Secret | Yes |
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Port to run the server on | No (default: 3001) |

## Security Considerations

1. **Environment Variables**: Never commit your IGDB credentials to version control
2. **CORS**: The backend allows CORS from any origin in development. For production, consider restricting it
3. **Rate Limiting**: Consider adding rate limiting for the API endpoints
4. **HTTPS**: Always use HTTPS in production

## Monitoring and Maintenance

### Health Checks
The application includes a health check endpoint: `GET /api/health`

### Logs
- Docker: `docker-compose logs -f`
- PM2: `pm2 logs video-game-categorizer`
- Railway/Render: Use their built-in logging

### Updates
To update the application:
1. Pull the latest code
2. Rebuild the Docker image: `docker-compose build`
3. Restart: `docker-compose up -d`

## Troubleshooting

### Common Issues

1. **IGDB API Errors**: Check your credentials and API limits
2. **Database Issues**: Ensure the data directory is writable
3. **Port Conflicts**: Change the port in docker-compose.yml if needed
4. **CORS Errors**: Check that the frontend is making requests to the correct backend URL

### Debug Mode
To enable debug logging, set `NODE_ENV=development` in your environment variables.

## Support

For issues and questions:
1. Check the application logs
2. Verify your IGDB API credentials
3. Ensure all environment variables are set correctly
4. Check that the backend is accessible at the expected URL 