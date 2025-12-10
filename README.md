# StockIt Backend API

Complete backend API server for the StockIt Android application.

## Features

- ✅ User authentication (JWT)
- ✅ Stock data (mock data for testing)
- ✅ Portfolio management (buy/sell stocks)
- ✅ Wallet system
- ✅ Watchlist functionality
- ✅ Transaction history
- ✅ SQLite database

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Database

```bash
npm run init-db
```

### 3. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/signup-simple` - Register new user
- `POST /api/auth/signin-simple` - Login user

### Stock Data
- `GET /api/stock/:symbol` - Get stock information
- `GET /api/trending` - Get trending stocks
- `GET /api/search?q=query` - Search stocks

### User Portfolio (Requires Authentication)
- `GET /api/user/wallet` - Get wallet balance
- `GET /api/user/portfolio` - Get user portfolio
- `POST /api/user/stocks/buy` - Buy stocks
- `POST /api/user/stocks/sell` - Sell stocks
- `GET /api/user/transactions` - Get transaction history

### Watchlist (Requires Authentication)
- `GET /api/user/watchlist` - Get watchlist
- `POST /api/user/watchlist` - Add to watchlist
- `DELETE /api/user/watchlist/:symbol` - Remove from watchlist

## Environment Variables

Create a `.env` file (already created) with:

```env
PORT=3000
JWT_SECRET=your-secret-key
STARTING_BALANCE=100000
```

## Testing the API

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup-simple \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@test.com","password":"Test@1234","confirmPassword":"Test@1234"}'
```

### Sign In
```bash
curl -X POST http://localhost:3000/api/auth/signin-simple \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@1234"}'
```

### Get Trending Stocks
```bash
curl http://localhost:3000/api/trending
```

## Connecting Android App

1. Find your computer's local IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. Update Android app's `ApiConfig.kt`:
   ```kotlin
   private const val BASE_URL = "http://YOUR_LOCAL_IP:3000/"
   ```

3. Make sure your phone and computer are on the same WiFi network

## Deployment

### Option 1: Local Development
Already set up! Just run `npm run dev`

### Option 2: Deploy to Render.com (Free)
1. Create account on render.com
2. Create new Web Service
3. Connect your GitHub repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Deploy!

### Option 3: Deploy to Railway.app
1. Create account on railway.app
2. Create new project
3. Deploy from GitHub
4. Add environment variables
5. Deploy!

## Database

Uses SQLite for simplicity. Database file: `database.sqlite`

To reset database, delete the file and run:
```bash
npm run init-db
```

## Stock Data

Currently uses mock data for testing. To use real stock data:
1. Get API key from Alpha Vantage or Yahoo Finance
2. Update `src/services/stockService.js`
3. Replace mock data with real API calls

## Security Notes

⚠️ **For Development Only**
- Change JWT_SECRET in production
- Use HTTPS in production
- Add rate limiting
- Validate all inputs
- Use PostgreSQL for production

## Troubleshooting

### Port already in use
Change PORT in `.env` file

### Database locked
Close any other connections to database.sqlite

### Cannot connect from Android
- Check firewall settings
- Ensure phone and computer on same network
- Use correct local IP address

## License

MIT
