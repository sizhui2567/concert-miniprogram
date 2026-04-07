param(
  [string]$RepoRoot = "."
)

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "AGENTS.md",
  "docs/superpowers/templates/spec-template.md",
  "docs/superpowers/templates/plan-template.md"
)

foreach ($p in $requiredPaths) {
  $full = Join-Path $RepoRoot $p
  if (-not (Test-Path $full)) {
    Write-Error "Missing required workflow doc: $p"
  }
}

$specDir = Join-Path $RepoRoot "docs/superpowers/specs"
$planDir = Join-Path $RepoRoot "docs/superpowers/plans"

if (-not (Test-Path $specDir)) {
  Write-Error "Missing specs directory: docs/superpowers/specs"
}
if (-not (Test-Path $planDir)) {
  Write-Error "Missing plans directory: docs/superpowers/plans"
}

$specCount = @(Get-ChildItem $specDir -File -ErrorAction SilentlyContinue).Count
$planCount = @(Get-ChildItem $planDir -File -ErrorAction SilentlyContinue).Count

if ($specCount -lt 1) {
  Write-Error "No spec docs found in docs/superpowers/specs"
}
if ($planCount -lt 1) {
  Write-Error "No plan docs found in docs/superpowers/plans"
}

Write-Host "Superpowers doc checks passed."
