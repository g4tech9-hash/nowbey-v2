# fix-env.ps1

$envPath = ".\.env"
$dbUrl = 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db"'

Write-Host "Creating .env file..." -ForegroundColor Cyan

# Create or overwrite the .env file with the required database URL
Set-Content -Path $envPath -Value $dbUrl

Write-Host "Successfully added DATABASE_URL to .env!" -ForegroundColor Green
Write-Host "Starting Next.js development server..." -ForegroundColor Cyan

# Start the application
npm run dev