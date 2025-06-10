Write-Host "Testing Appointment Availability API..."
try {
    # Test availability for demo provider on a future date
    $today = Get-Date
    $testDate = $today.AddDays(1).ToString("yyyy-MM-dd")
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/appointments/availability?tenant=demo-clinic&providerId=cmbctp5sa0006mxcgy9mxf31m&date=$testDate" -Method Get
    Write-Host "Availability Response for $testDate :" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response Details:" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $_.Exception.Response | Format-List * -Force
    }
}
