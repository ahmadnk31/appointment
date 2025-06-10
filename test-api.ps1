try {
    Write-Host "Testing Tenant Resolution API (GET)..."
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/tenants/resolve?slug=demo-clinic" -Method Get
    Write-Host "GET Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10

    Write-Host "`nTesting Tenant Resolution API (POST)..."
    $postBody = @{ slug = "demo-clinic" } | ConvertTo-Json
    $postResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/tenants/resolve" -Method Post -Body $postBody -ContentType "application/json"
    Write-Host "POST Response:" -ForegroundColor Green
    $postResponse | ConvertTo-Json -Depth 10

    Write-Host "`nTesting Services API..."
    $servicesResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/services/public?tenant=demo-clinic" -Method Get
    Write-Host "Services Response:" -ForegroundColor Green
    $servicesResponse | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Full Error Details:" -ForegroundColor Yellow
    $_ | Format-List * -Force
}
