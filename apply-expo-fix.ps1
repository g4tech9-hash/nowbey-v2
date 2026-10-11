# apply-expo-fix.ps1

$zipPath = "C:\Users\Admin\Downloads\nowbey-expo-fixed.zip"
$targetDir = "C:\Users\Admin\Downloads\nowbeyV2"
$expoDir = "C:\Users\Admin\Downloads\nowbeyV2\expo"
$checkImage = "$expoDir\assets\splash-scene.jpg"

if (-Not (Test-Path $zipPath)) {
    Write-Error "Could not find $zipPath. Please ensure the zip file is downloaded."
    exit
}

Write-Host "Extracting and replacing Expo files..." -ForegroundColor Cyan
# Extracts the zip and forces overwrite of existing files in the target directory
Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force

# Verify the image was successfully placed
if (Test-Path $checkImage) {
    Write-Host "Confirmed: splash-scene.jpg exists in the assets folder." -ForegroundColor Green
} else {
    Write-Warning "Missing: splash-scene.jpg was not found. Please double-check the zip file contents."
}

Write-Host "Navigating to the Expo directory..." -ForegroundColor Cyan
cd $expoDir

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Starting Expo server and clearing cache..." -ForegroundColor Cyan
npx expo start -c