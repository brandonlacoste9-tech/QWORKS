# Q-Emplois production wiring — run after Railway backend is live
# Usage: .\scripts\setup-production.ps1 -RailwayUrl "https://your-app.up.railway.app"

param(
    [Parameter(Mandatory = $true)]
    [string]$RailwayUrl
)

$ErrorActionPreference = "Stop"
$RailwayUrl = $RailwayUrl.TrimEnd('/')
$ApiUrl = "$RailwayUrl/api/v1"
$FrontendUrl = "https://www.quebec-emplois.ca"

Write-Host "Testing health: $ApiUrl/health"
try {
    $health = Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get
    if ($health.status -ne "ok") { throw "Health check failed: $($health | ConvertTo-Json -Compress)" }
    Write-Host "Health OK" -ForegroundColor Green
} catch {
    Write-Error "Backend not reachable at $ApiUrl/health — fix Railway first, then re-run."
}

$envFile = Join-Path $PSScriptRoot "..\frontend\.env.production"
Set-Content -Path $envFile -Value "VITE_API_URL=$ApiUrl" -Encoding utf8
Write-Host "Updated frontend/.env.production"

Push-Location (Join-Path $PSScriptRoot "..\frontend")
try {
    if (-not (Test-Path ".vercel\project.json")) {
        vercel link --yes --project q-emplois
    }
    Write-Host "Setting Vercel VITE_API_URL..."
    $ApiUrl | vercel env add VITE_API_URL production --force 2>$null
    $ApiUrl | vercel env add VITE_API_URL preview --force 2>$null
    Write-Host "Deploying frontend to production..."
    vercel --prod --yes
    Write-Host "Done. Frontend: $FrontendUrl" -ForegroundColor Green
    Write-Host "API: $ApiUrl"
} finally {
    Pop-Location
}

Write-Host @"

Railway variables (paste in dashboard if not set):
  DATABASE_URL = (Supabase session pooler, port 5432)
  JWT_SECRET   = (min 32 chars — generate below)
  CORS_ORIGIN  = $FrontendUrl
  FRONTEND_URL = $FrontendUrl

Generate JWT_SECRET:
  -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 48 | ForEach-Object {[char]$_}))

"@
