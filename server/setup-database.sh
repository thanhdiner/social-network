#!/bin/bash

# Database Setup Script
# Run this script when you get "table does not exist" error

echo "========================================"
echo "  Database Setup Script"
echo "========================================"
echo ""

# Check if in server directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the server directory"
    exit 1
fi

# Step 1: Check if any Node.js process is running
echo "Step 1: Checking for running Node.js processes..."
if pgrep -x "node" > /dev/null; then
    echo "Found running Node.js processes. Please stop your server first!"
    echo "Press Ctrl+C in the terminal running 'npm run start:dev'"
    echo ""
    echo "Or run: pkill -9 node"
    exit 1
fi
echo "✓ No Node.js processes running"
echo ""

# Step 2: Remove .prisma folder
echo "Step 2: Cleaning Prisma cache..."
if [ -d "node_modules/.prisma" ]; then
    rm -rf node_modules/.prisma
    echo "✓ Removed .prisma cache"
fi
echo ""

# Step 3: Generate Prisma Client
echo "Step 3: Generating Prisma Client..."
npm run prisma:generate
if [ $? -ne 0 ]; then
    echo "✗ Failed to generate Prisma Client"
    exit 1
fi
echo "✓ Prisma Client generated"
echo ""

# Step 4: Run migrations
echo "Step 4: Running database migrations..."
echo "This will reset your database and create all tables"
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 0
fi

npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
    echo "✗ Migration failed"
    exit 1
fi
echo "✓ Migration completed"
echo ""

# Step 5: Verify
echo "Step 5: Verification..."
echo "Opening Prisma Studio to verify tables..."
echo "Press Ctrl+C to close Prisma Studio when done"
sleep 2
npx prisma studio

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "You can now start your server:"
echo "  npm run start:dev"
echo ""
