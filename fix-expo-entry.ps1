# fix-expo-entry.ps1

$expoDir = "C:\Users\Admin\Downloads\nowbeyV2\expo"

if (Test-Path $expoDir) {
    Write-Host "Navigating to the Expo directory..." -ForegroundColor Cyan
    cd $expoDir
    
    Write-Host "Updating package.json entry point..." -ForegroundColor Cyan
    # Safely adds or updates the "main" field in package.json
    npm pkg set main="expo-router/entry"
    
    Write-Host "Successfully configured project entry!" -ForegroundColor Green
    Write-Host "Starting Expo server with cleared cache..." -ForegroundColor Cyan
    
    # Start the server and clear cache to ensure new config is read
    npx expo start -c
} else {
    Write-Error "Could not find the expo directory at $expoDir. Please verify the path."
}