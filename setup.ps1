# 1. Navigate to your actual project directory (Replace the path below with your actual project folder)
$projectDir = Read-Host "Enter the full path to your project folder (e.g., C:\Users\Romario\Documents\MyProject)"
cd $projectDir

# 2. Verify npm is installed
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Warning "npm is not installed. Download Node.js from nodejs.org, restart PowerShell, and try again."
    exit
}

# 3. Verify Docker is running
$dockerInfo = docker info 2>&1
if ($dockerInfo -match "error during connect") {
    Write-Warning "Docker is not running. Start Docker Desktop, wait for it to initialize, and try again."
    exit
}

# 4. Start the PostgreSQL Docker container
Write-Host "Starting database container..." -ForegroundColor Cyan
docker run -d --name nowbey-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db postgres:16

# Wait a few seconds for the database to be ready to accept connections
Start-Sleep -Seconds 5

# 5. Install Node dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

# 6. Push the database schema using Drizzle
Write-Host "Pushing schema..." -ForegroundColor Cyan
npx drizzle-kit push

# 7. Seed the database 
# (Using cmd.exe /c ensures the pipe '|' works correctly with the 'type' command in PowerShell)
Write-Host "Seeding database..." -ForegroundColor Cyan
cmd.exe /c "type src\db\seed.sql | docker exec -i nowbey-db psql -U postgres app_db"

Write-Host "Setup complete!" -ForegroundColor Green