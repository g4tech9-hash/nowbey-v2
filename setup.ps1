# NowBey Setup & Recovery Script
# This script handles environment setup and database initialization for both Local (Docker) and Cloud (Neon) environments.

$ErrorActionPreference = "Stop"

Write-Host "--- NowBey Project Setup ---" -ForegroundColor Cyan

# 1. Verify npm installation
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed. Please install Node.js from nodejs.org and restart PowerShell."
    exit
}

# 2. Environment Selection
Write-Host "`nWhere would you like to run the database?" -ForegroundColor Yellow
Write-Host "[1] Local (Docker PostgreSQL)"
Write-Host "[2] Cloud (Neon PostgreSQL)"
$choice = Read-Host "Enter choice [1 or 2]"

if ($choice -eq "1") {
    Write-Host "`nSetting up Local Docker environment..." -ForegroundColor Cyan

    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed or not in PATH. Please install Docker Desktop."
        exit
    }

    # Start Docker Container
    Write-Host "Starting database container..." -ForegroundColor Gray
    docker run -d --name nowbey-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db postgres:16 || Write-Host "Container may already exist, continuing..." -ForegroundColor Yellow

    # Update .env for local dev
    Write-Host "Updating .env for local connection..." -ForegroundColor Gray
    $localDbUrl = "postgresql://postgres:postgres@127.0.0.1:5432/app_db"
    # Simple replacement of DATABASE_URL in .env if it exists
    if (Test-Path ".env") {
        (Get-Content .env) -replace 'DATABASE_URL=.*', "DATABASE_URL=$localDbUrl" | Set-Content .env
    } else {
        "DATABASE_URL=$localDbUrl" | Out-File -Encoding utf8 .env
    }

    Start-Sleep -Seconds 5
}
elseif ($choice -eq "2") {
    Write-Host "`nSetting up Cloud (Neon) environment..." -ForegroundColor Cyan

    if (!(Test-Path ".env")) {
        Write-Error ".env file not found. Please create one or copy .env.example."
        exit
    }

    $dbUrl = (Get-Content .env | Select-String "DATABASE_URL=").ToString().Split("=")[1].Trim()
    if ([string]::IsNullOrWhiteSpace($dbUrl)) {
        Write-Error "DATABASE_URL is not set in .env file."
        exit
    }
    Write-Host "Connected to Neon instance: $dbUrl" -ForegroundColor Gray
}
else {
    Write-Error "Invalid choice. Please run the script again."
    exit
}

# 3. Install Dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
npm install

# 4. Push Database Schema
Write-Host "Pushing schema via Drizzle..." -ForegroundColor Cyan
npx drizzle-kit push

# 5. Seed Database
Write-Host "Seeding database..." -ForegroundColor Cyan
# Use a method that works for both local and cloud
# We use the current DATABASE_URL from .env to run the seed script via psql
$dbUrl = (Get-Content .env | Select-Hore "DATABASE_URL=").ToString().Split("=")[1].Trim()
# Note: This requires psql to be installed on the host machine.
# If psql is missing, we notify the user.
if (Get-Command psql -ErrorAction SilentlyContinue) {
    cmd.exe /c "psql $dbUrl -f src\db\seed.sql"
} else {
    Write-Warning "psql command not found. Database schema was pushed, but seeding failed."
    Write-Host "To seed manually, run: psql [YOUR_DATABASE_URL] -f src\db\seed.sql" -ForegroundColor Yellow
}

Write-Host "`nSetup complete! You can now run the app with 'npm run dev'." -ForegroundColor Green
