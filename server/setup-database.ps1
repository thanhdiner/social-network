# Database Setup Script
# Run this script when you get "table does not exist" error

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if in server directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Please run this script from the server directory" -ForegroundColor Red
    exit 1
}

# Step 1: Check if any Node.js process is running
Write-Host "Step 1: Checking for running Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found running Node.js processes. Please stop your server first!" -ForegroundColor Red
    Write-Host "Press Ctrl+C in the terminal running 'npm run start:dev'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run: taskkill /F /IM node.exe" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ No Node.js processes running" -ForegroundColor Green
Write-Host ""

# Step 2: Remove .prisma folder
Write-Host "Step 2: Cleaning Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma"
    Write-Host "✓ Removed .prisma cache" -ForegroundColor Green
}
Write-Host ""

# Step 3: Generate Prisma Client
Write-Host "Step 3: Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Step 4: Run migrations
Write-Host "Step 4: Running database migrations..." -ForegroundColor Yellow
Write-Host "This will reset your database and create all tables" -ForegroundColor Yellow
$response = Read-Host "Continue? (y/n)"
if ($response -ne "y") {
    Write-Host "Aborted" -ForegroundColor Yellow
    exit 0
}

npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Migration failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Migration completed" -ForegroundColor Green
Write-Host ""

# Step 5: Verify
Write-Host "Step 5: Verification..." -ForegroundColor Yellow
Write-Host "Opening Prisma Studio to verify tables..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to close Prisma Studio when done" -ForegroundColor Yellow
Start-Sleep -Seconds 2
npx prisma studio

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start your server:" -ForegroundColor Yellow
Write-Host "  npm run start:dev" -ForegroundColor Cyan
Write-Host ""
