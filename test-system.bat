@echo off
echo Testing Multi-Tenant Appointment Booking System...
echo.

echo 1. Testing Tenant Resolution (POST):
curl -s -X POST "http://localhost:3000/api/tenants/resolve" ^
  -H "Content-Type: application/json" ^
  -d "{\"slug\":\"demo-clinic\"}" | findstr "name"

echo.
echo 2. Testing Tenant Resolution (GET):
curl -s "http://localhost:3000/api/tenants/resolve?slug=demo-clinic" | findstr "name"

echo.
echo 3. Testing Services API:
curl -s "http://localhost:3000/api/services/public?tenant=demo-clinic" | findstr "name"

echo.
echo 4. Testing Middleware with tenant parameter:
curl -s -I "http://localhost:3000/?tenant=demo-clinic" | findstr "HTTP"

echo.
echo 5. Testing Landing Page:
curl -s -I "http://localhost:3000/tenant-landing?tenant=demo-clinic" | findstr "HTTP"

echo.
echo Testing complete!
