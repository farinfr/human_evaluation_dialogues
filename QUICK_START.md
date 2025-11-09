# Quick Start Guide

## One-Command Start (Development)

Simply run:

```bash
./start.sh
```

This will:
- ✅ Check Node.js installation
- ✅ Install dependencies automatically
- ✅ Start backend on port 5001
- ✅ Start frontend on port 3000
- ✅ Handle port conflicts
- ✅ Show logs and status

## One-Command Start (Production)

For production mode with optimized build:

```bash
./start-production.sh
```

This will:
- ✅ Build frontend for production
- ✅ Serve optimized production build
- ✅ Start backend in production mode
- ✅ Create .env files if needed

## Stop Servers

```bash
./stop.sh
```

Or press `Ctrl+C` if running in foreground.

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001/api
- **Admin Dashboard**: http://localhost:3000/admin (after admin login)

## Create Admin User

```bash
cd backend
npm run create-admin
# Or: node migrate-admin.js username email password
```

## Default Admin (if created with script)

- Username: `admin`
- Email: `admin@example.com`
- Password: `admin123` (or the one you set)

## Troubleshooting

### Port Already in Use
The start script will ask if you want to kill the process. Answer 'y' to continue.

### Dependencies Not Installing
Try:
```bash
npm cache clean --force
npm install --cache /tmp/npm-cache
```

### Database Issues
Reset database:
```bash
cd backend
rm database.sqlite
npm start  # Will recreate database
```

## For More Details

See `DEPLOYMENT.md` for:
- Production deployment
- Server setup
- Nginx configuration
- SSL/HTTPS setup
- PM2/systemd configuration
- Backup procedures

