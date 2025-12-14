#!/bin/bash

# Deploy Script - Upload chỉ folder server/ lên VPS
# Sử dụng: bash deploy.sh

VPS_HOST="163.44.193.71"
VPS_USER="root"
VPS_PATH="/var/www/accsafe-api"

echo "🚀 Deploying AccSafe Backend to VPS..."
echo "=========================================="

# Check if server folder exists
if [ ! -d "server" ]; then
    echo "❌ Error: Folder 'server' không tồn tại!"
    exit 1
fi

# Upload code (exclude node_modules, .env, logs)
echo "📤 Uploading code to VPS..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'logs' \
  --exclude '.git' \
  --exclude '*.log' \
  server/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

if [ $? -eq 0 ]; then
    echo "✅ Upload thành công!"
else
    echo "❌ Upload thất bại!"
    exit 1
fi

# Run commands on VPS
echo "🔧 Installing dependencies and restarting server..."
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd /var/www/accsafe-api
echo "📥 Installing dependencies..."
npm install --production
echo "🔄 Restarting PM2..."
pm2 restart accsafe-api || pm2 start server.js --name accsafe-api
pm2 save
echo "✅ Deploy completed!"
pm2 status accsafe-api
ENDSSH

echo ""
echo "✅ Deploy hoàn tất!"
echo "🌐 Test API: curl http://${VPS_HOST}:3000/api/health"

