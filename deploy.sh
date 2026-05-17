#!/bin/bash

# --- CONFIGURATION ---
KEY_FILE="ssh-key-2026-03-05.key"
REMOTE_USER="ubuntu"
REMOTE_HOST="168.138.113.239"
REMOTE_DIR="/home/ubuntu/medcert-premium"
APP_NAME="medcert-premium"

# --- PRODUCTION ENVIRONMENT VARIABLES ---
PORT=5174
VITE_APP_URL=https://medcert.doctrust.in
VITE_SUPABASE_URL=https://rnlyhbniofrcwmtujftc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubHloYm5pb2ZyY3dtdHVqZnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODU4NzYsImV4cCI6MjA5NDA2MTg3Nn0.7njkl60pCiqRuCnp94f6I8w30-c1gL0TyWScePO90jA
VITE_RAZORPAY_KEY_ID=rzp_live_SoQFYDfCWdBfr5
VITE_RAZORPAY_PLAN_WEEKLY=plan_SordzVGlq8aHXg
VITE_RAZORPAY_PLAN_MONTHLY=plan_SoreoqmY2qUTDX
VITE_RAZORPAY_PLAN_YEARLY=plan_SorhVxQD5Mf4OP
VITE_POSTHOG_KEY="phc_GKhHM5LqVFZjhGVdrpBVOvZEDtBIlBcWZ0DNBg5lTuo"
VITE_POSTHOG_HOST="https://us.i.posthog.com"

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting deployment for MedCert Premium...${NC}"

# 1. Create .env file locally FIRST (so Vite can use it during build)
echo -e "${BLUE}📝 Generating production .env...${NC}"
cat <<EOF > .env
PORT=$PORT
VITE_APP_URL=$VITE_APP_URL
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
VITE_RAZORPAY_PLAN_WEEKLY=plan_SordzVGlq8aHXg
VITE_RAZORPAY_PLAN_MONTHLY=plan_SoreoqmY2qUTDX
VITE_RAZORPAY_PLAN_YEARLY=plan_SorhVxQD5Mf4OP
VITE_POSTHOG_KEY=phc_GKhHM5LqVFZjhGVdrpBVOvZEDtBIlBcWZ0DNBg5lTuo
VITE_POSTHOG_HOST=https://us.i.posthog.com
EOF

# 2. Build locally
echo -e "${BLUE}📦 Building the frontend...${NC}"
npm install
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Local build failed. Deployment aborted.${NC}"
    exit 1
fi

# 3. Check for SSH key
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ SSH Key '$KEY_FILE' not found.${NC}"
    exit 1
fi

# 4. Upload files to VPS
echo -e "${BLUE}📤 Uploading files to VPS...${NC}"
# Upload dist, server, package files and .env
rsync -avz -e "ssh -i $KEY_FILE" dist server package.json package-lock.json .env "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ File transfer failed.${NC}"
    exit 1
fi

# 5. Install dependencies and Restart PM2 on VPS
echo -e "${BLUE}🔄 Installing dependencies and restarting PM2 on VPS...${NC}"
ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" << EOF
    mkdir -p "$REMOTE_DIR"
    cd "$REMOTE_DIR"
    # Ensure all dependencies are installed
    npm install
    
    # Restart the app in PM2
    sudo pm2 delete "$APP_NAME" || true
    sudo PORT=$PORT pm2 start "npx tsx server/index.ts" --name "$APP_NAME"
    sudo pm2 save
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful! Your site is live at $VITE_APP_URL${NC}"
else
    echo -e "${RED}❌ Remote commands failed.${NC}"
    exit 1
fi
