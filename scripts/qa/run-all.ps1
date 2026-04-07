param(
  [string]$RepoRoot = "."
)

$ErrorActionPreference = "Stop"

Push-Location $RepoRoot
try {
  Write-Host "1) Running superpowers doc checks..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File "scripts/qa/check-superpowers-docs.ps1" -RepoRoot "."

  Write-Host "2) Running seat-locator coordKey tests..."
  node --test tests/seat-locator.coordkey.test.js

  Write-Host "3) Running seat-map-generator coordKey tests..."
  node --test tests/seat-map-generator.coordkey.test.js

  Write-Host "4) Running scenario checks..."
  python scenario_data_pipeline_check.py
  python scenario_seat_map_pipeline_check.py
  python scenario_social_moderation_check.py

  Write-Host "All QA checks passed."
}
finally {
  Pop-Location
}
