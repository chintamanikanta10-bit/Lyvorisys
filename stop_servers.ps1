Write-Host "Stopping any running servers on ports 8001 and 5174..." -ForegroundColor Yellow

# Stop backend on port 8001
$backendPorts = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
if ($backendPorts) {
    foreach ($port in $backendPorts) {
        Write-Host "Killing backend process (PID: $($port.OwningProcess))..." -ForegroundColor Red
        Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Stop frontend on port 5174
$frontendPorts = Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue
if ($frontendPorts) {
    foreach ($port in $frontendPorts) {
        Write-Host "Killing frontend process (PID: $($port.OwningProcess))..." -ForegroundColor Red
        Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Done stopping servers!" -ForegroundColor Green
Start-Sleep -Seconds 1