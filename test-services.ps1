Write-Host "Testing the fixed services API call..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/services/public?tenant=demo-clinic" -Method Get
    Write-Host "Services API Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response Details:" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $_.Exception.Response | Format-List * -Force
    }
}
