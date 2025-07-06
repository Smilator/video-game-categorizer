# Video Game Categorizer

A responsive web application that allows users to browse and categorize video games from the IGDB API based on selected platforms. Users can save games to favorites, mark them as deleted, and import/export their categorization data **per platform**. Features persistent database storage and is ready for deployment.

## 🚀 Features

### 🎮 Platform Selection & Game Browsing
- Dropdown menu listing all available gaming platforms from IGDB
- Fetch and display 50 games at a time, ordered alphabetically
- Automatic loading of next batch when current games are processed
- Display game names and cover images (when available)

### 💾 Game Categorization
- **Save** button: Adds games to favorites list
- **Delete** button: Adds games to deleted list
- Games are automatically removed from the queue once categorized
- **Revert** functionality: Move games back from favorites/deleted to the main judging list

### 📁 Import/Export Functionality
- **Per-platform storage**: Each platform has its own favorites and deleted lists
- Import previously saved data from JSON files for the selected platform
- Export current favorites and deleted lists to JSON (platform-specific)
- Clear data option with confirmation (platform-specific)

### 📊 Statistics & Progress Tracking
- Real-time statistics showing favorites, deleted, and total processed games
- Current platform display
- Progress tracking across sessions using localStorage
- Per-platform data persistence

### 🎨 Modern UI/UX
- Responsive design that works on desktop and mobile
- Beautiful gradient background and card-based layout
- Smooth animations and hover effects
- Loading states and error handling

### 🔐 Authentication & Access Control
- User-based system with login/logout functionality
- Non-authenticated users can only view favorites
- Authenticated users have full access to all features

### 🗄️ Database Storage
- Persistent JSON database storage
- Data survives server restarts and deployments
- Automatic data synchronization

## 🏗️ Architecture

### Backend (Node.js/Express)
- **IGDB API Proxy**: Handles all IGDB API calls securely
- **CORS Support**: Allows frontend to communicate with the backend
- **Token Management**: Automatic IGDB access token refresh
- **Error Handling**: Proper error responses and logging

### Frontend (React)
- **Modern React 18**: Using hooks and functional components
- **Vite**: Fast development and building
- **Responsive Design**: Works on all screen sizes
- **Database API**: Per-platform data persistence via backend

### Database
- **JSON Database**: File-based storage in `server/data/`
- **RESTful API**: Database operations via HTTP endpoints
- **Data Persistence**: Survives server restarts and deployments

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sito-videogiochi
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd server
npm install
```

#### Frontend Dependencies
```bash
# From the root directory
npm install
```

### 3. Configure IGDB API Credentials

Create a `.env` file in the root directory with your IGDB credentials:
```bash
CLIENT_ID=your_igdb_client_id
CLIENT_SECRET=your_igdb_client_secret
```

You can get these credentials from https://dev.twitch.tv/console

### 4. Start the Application

#### Start Backend Server
```bash
cd server
npm start
```
The backend will run on `http://localhost:3001`

#### Start Frontend Development Server
```bash
# From the root directory
npm run dev
```
The frontend will run on `http://localhost:3000`

## 📖 Usage

### Basic Workflow
1. **Login**: Click "Login" to access full features (or browse as guest)
2. **Select a Platform**: Choose from the dropdown menu to load games for that platform
3. **Categorize Games**: For each game, click either "Save" (favorites) or "Delete"
4. **Continue Processing**: Once all visible games are categorized, more will load automatically
5. **Review Progress**: Check the statistics cards to see your progress
6. **Export Data**: Use the export button to save your categorization data for the current platform

### Import/Export (Per-Platform)
- **Import**: Select a platform, then click "Import Data" and select a JSON file
- **Export**: Select a platform, then click "Export Data" to download platform-specific data
- **Clear Data**: Select a platform, then click "Clear Platform Data" to reset that platform's data

### Revert Functionality
- **Revert Games**: Click the "Revert" button on any game in the favorites or deleted lists
- **Back to Judging**: Reverted games return to the main judging list for re-evaluation

### JSON Structure
The application expects/creates JSON files with this structure:
```json
{
  "favorites": [
    {
      "id": 83868,
      "cover": {
        "id": 161734,
        "image_id": "co3gsm"
      },
      "name": "10 Second Run Returns",
      "slug": "10-second-run-returns"
    }
  ],
  "deleted": [
    {
      "id": 186946,
      "cover": {
        "id": 281122,
        "image_id": "co60wy"
      },
      "name": "0x0 Minimalist",
      "slug": "0x0-minimalist"
    }
  ]
}
```

## 🔧 Technical Details

### Backend API Endpoints
- `GET /api/health` - Health check
- `GET /api/platforms` - Get all platforms
- `GET /api/games/:platformId` - Get games for platform (with offset/limit)

### Frontend Features
- **Per-Platform Storage**: Data structure: `{ [platformId]: { favorites: [], deleted: [] } }`
- **Automatic Filtering**: Games already in favorites/deleted don't appear in the main list
- **Revert System**: Games can be moved back to the judging list
- **Import Validation**: Ensures platform is selected before import
- **Export Naming**: Files are named with platform name and date

### Data Persistence
- **Database Storage**: All data persists in server database
- **Platform Isolation**: Each platform's data is stored separately
- **Automatic Sync**: Changes are immediately saved to database
- **Cross-Session**: Data persists across browser sessions and server restarts

## 🚀 Development

### Available Scripts

#### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## 🚀 Deployment

### Quick Deployment with Docker

1. **Prerequisites**: Install Docker and Docker Compose
2. **Environment Setup**: Create `.env` file with your IGDB credentials
3. **Deploy**: Run the deployment script:
   ```bash
   ./deploy.sh
   ```

### Cloud Deployment Options

- **Railway**: One-click deployment from GitHub
- **Render**: Free tier available with automatic deployments
- **DigitalOcean App Platform**: Scalable cloud deployment
- **Heroku**: Traditional hosting with easy setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Project Structure
```
sito-videogiochi/
├── server/
│   ├── server.js           # Express server
│   ├── config.js           # API configuration
│   └── package.json        # Backend dependencies
├── src/
│   ├── components/
│   │   ├── GameCard.jsx    # Individual game display
│   │   ├── Stats.jsx       # Statistics display
│   │   └── Lists.jsx       # Favorites/deleted lists with revert
│   ├── services/
│   │   └── igdbApi.js      # Backend API integration
│   ├── App.jsx             # Main application
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── package.json
├── vite.config.js
├── index.html
├── README.md
├── sample-data.json        # Test data
└── .gitignore
```

## 🔍 Troubleshooting

### Common Issues

1. **"Failed to load platforms" Error**
   - Ensure the backend server is running on port 3001
   - Check that the IGDB credentials are correct in `server/config.js`
   - Verify your internet connection

2. **Games Not Loading**
   - The IGDB API has rate limits, wait a moment and try again
   - Check the browser console for detailed error messages
   - Ensure the backend server is running

3. **Import Not Working**
   - Make sure you've selected a platform before importing
   - Ensure your JSON file follows the exact structure shown above
   - Check that the file is valid JSON (no syntax errors)

4. **Revert Not Working**
   - Ensure you're on the correct platform
   - Check that the game exists in the favorites or deleted list
   - Refresh the page if the state seems inconsistent

5. **Performance Issues**
   - The app loads 50 games at a time to manage API limits
   - Large platforms may take time to process completely
   - Use the "Load More Games" button to continue processing

## 🔄 Recent Updates

### Version 2.0 - Complete Backend Integration
- ✅ **Backend Proxy**: Secure IGDB API integration
- ✅ **Per-Platform Storage**: Each platform has separate favorites/deleted lists
- ✅ **Import/Export Per Platform**: Platform-specific data management
- ✅ **Revert Functionality**: Move games back to judging list
- ✅ **Automatic Filtering**: Processed games don't reappear
- ✅ **Enhanced UI**: Better buttons and responsive design

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure both backend and frontend servers are running
4. Verify your JSON import files follow the correct structure
5. Check that you've selected a platform before importing/exporting 