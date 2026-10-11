# fix-image.ps1

$filePath = "C:\Users\Admin\Downloads\nowbeyV2\expo\app\(tabs)\index.tsx"

if (Test-Path $filePath) {
    Write-Host "Scanning index.tsx for the missing image..." -ForegroundColor Cyan
    
    # Read the file
    $content = Get-Content $filePath
    
    # Replace the specific require statement with null to prevent the crash
    # The regex handles both single and double quotes around the file path
    $updatedContent = $content -replace "require\(['""]\.\./\.\./assets/splash-scene\.jpg['""]\)", "null"
    
    # Save the changes
    Set-Content -Path $filePath -Value $updatedContent
    
    Write-Host "Successfully removed the missing image requirement!" -ForegroundColor Green
    Write-Host "Go back to your Expo terminal and press 'r' to reload the app." -ForegroundColor Cyan
} else {
    Write-Error "Could not find the file at $filePath. Please verify the path."
}