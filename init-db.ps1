# init-db.ps1

Write-Host "Checking dependencies..." -ForegroundColor Cyan

# 1. Verify Node/npm
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed or not in PATH."
    exit
}

# 2. Verify Docker
$dockerInfo = docker info 2>&1
if ($dockerInfo -match "error during connect") {
    Write-Error "Docker is not running. Please start Docker Desktop."
    exit
}

# 3. Start PostgreSQL Container (if not already running)
Write-Host "Starting database container..." -ForegroundColor Cyan
$containerExists = docker ps -a -q -f name=nowbey-db
if (!$containerExists) {
    docker run -d --name nowbey-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db postgres:16
    Start-Sleep -Seconds 5 # Wait for initialization
} else {
    docker start nowbey-db
}

# 4. Install Dependencies
Write-Host "Installing NPM packages..." -ForegroundColor Cyan
npm install

# 5. Push Schema
Write-Host "Pushing schema via Drizzle..." -ForegroundColor Cyan
npx drizzle-kit push

# 6. Seed Database
Write-Host "Seeding database..." -ForegroundColor Cyan
cmd.exe /c "type src\db\seed.sql | docker exec -i nowbey-db psql -U postgres app_db"

Write-Host "Database initialization complete!" -ForegroundColor Green