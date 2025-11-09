# Deployment Guide - Dialogue Evaluation System

This guide explains how to deploy and run the complete Dialogue Evaluation System on a server.

## Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)
- SQLite3 (usually pre-installed on Linux/macOS)

## Quick Start (Development)

### Option 1: Using the Start Script

```bash
./start.sh
```

This will automatically:
- Install dependencies for both backend and frontend
- Start the backend server on port 5001
- Start the frontend server on port 3000

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm start
```

## Production Deployment

### Step 1: Install Dependencies

```bash
# Backend dependencies
cd backend
npm install --production

# Frontend dependencies
cd ../frontend
npm install
npm run build
```

### Step 2: Set Environment Variables

**Backend (.env file in backend/):**
```
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
```

**Frontend (.env file in frontend/):**
```
REACT_APP_API_URL=http://your-server-ip:5001/api
```

### Step 3: Create Admin User

```bash
cd backend
npm run create-admin
# Or use the migration script:
node migrate-admin.js admin admin@example.com your-secure-password
```

### Step 4: Run Backend (Production)

**Using PM2 (Recommended):**
```bash
npm install -g pm2
cd backend
pm2 start server.js --name dialogue-backend
pm2 save
pm2 startup  # Follow instructions to enable auto-start on boot
```

**Using systemd (Linux):**
Create `/etc/systemd/system/dialogue-backend.service`:
```ini
[Unit]
Description=Dialogue Evaluation Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/human-evaluation-dialougue/backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=5001

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable dialogue-backend
sudo systemctl start dialogue-backend
```

### Step 5: Serve Frontend (Production)

**Option A: Using Nginx**

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Configure Nginx (`/etc/nginx/sites-available/dialogue-evaluation`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/human-evaluation-dialougue/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/dialogue-evaluation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Option B: Using PM2 with serve**

```bash
npm install -g serve
cd frontend
npm run build
pm2 serve build 3000 --name dialogue-frontend --spa
```

**Option C: Using Node.js serve**

```bash
npm install -g serve
cd frontend
npm run build
serve -s build -l 3000
```

## Database Setup

The database is automatically created on first run. To reset:

```bash
cd backend
rm database.sqlite
npm start  # Will recreate database with schema
```

## Firewall Configuration

If using a firewall, open the necessary ports:

```bash
# For UFW (Ubuntu)
sudo ufw allow 5001/tcp  # Backend
sudo ufw allow 3000/tcp  # Frontend (if not using Nginx)
sudo ufw allow 80/tcp    # HTTP (if using Nginx)
sudo ufw allow 443/tcp   # HTTPS (if using SSL)
```

## SSL/HTTPS Setup (Production)

Use Let's Encrypt with Certbot:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring

### Check Backend Status

```bash
# If using PM2
pm2 status
pm2 logs dialogue-backend

# If using systemd
sudo systemctl status dialogue-backend
sudo journalctl -u dialogue-backend -f
```

### Check Database

```bash
cd backend
sqlite3 database.sqlite "SELECT COUNT(*) FROM users;"
sqlite3 database.sqlite "SELECT COUNT(*) FROM ratings;"
sqlite3 database.sqlite "SELECT COUNT(*) FROM dialogues;"
```

## Backup

### Backup Database

```bash
cd backend
cp database.sqlite database.sqlite.backup-$(date +%Y%m%d-%H%M%S)
```

### Restore Database

```bash
cd backend
cp database.sqlite.backup-YYYYMMDD-HHMMSS database.sqlite
```

## Troubleshooting

### Backend won't start
- Check if port 5001 is available: `lsof -i:5001`
- Check logs: `pm2 logs dialogue-backend` or check systemd logs
- Verify Node.js version: `node --version` (should be v16+)

### Frontend can't connect to backend
- Verify backend is running
- Check CORS settings in backend/server.js
- Verify API_URL in frontend .env matches backend URL

### Database errors
- Check file permissions on database.sqlite
- Verify database schema is up to date
- Run migration scripts if needed

## Access URLs

- Frontend: `http://your-server-ip:3000` (development) or `http://your-domain.com` (production)
- Backend API: `http://your-server-ip:5001/api`
- Admin Dashboard: `http://your-server-ip:3000/admin` (after logging in as admin)

## Default Admin Credentials

After running `npm run create-admin` or `node migrate-admin.js`:
- Username: `admin`
- Email: `admin@example.com`
- Password: (the one you set during creation)

**⚠️ IMPORTANT: Change the default admin password in production!**

