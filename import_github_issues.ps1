param(
  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [string]$CsvPath = "J:\car-import-mvp\github_issues_seed.csv",

  [switch]$DryRun,

  [switch]$ContinueOnError,

  [switch]$SkipLabelSetup
)

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  throw "GitHub CLI (gh) is not installed. Install from https://cli.github.com/"
}

$null = gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "You are not authenticated in gh. Run: gh auth login"
}

if (-not (Test-Path $CsvPath)) {
  throw "CSV not found: $CsvPath"
}

$null = gh repo view $Repo --json nameWithOwner 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Repository '$Repo' was not found or you do not have access. Use format owner/repo, e.g. arthuroua/my-repo"
}

$items = Import-Csv -Path $CsvPath
if (-not $items -or $items.Count -eq 0) {
  throw "No rows found in: $CsvPath"
}

function Get-LabelsFromItems {
  param([array]$Rows)
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($row in $Rows) {
    if (-not $row.Labels) { continue }
    $parts = $row.Labels.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
    foreach ($p in $parts) { [void]$set.Add($p) }
  }
  return $set
}

if (-not $SkipLabelSetup) {
  $desiredLabels = Get-LabelsFromItems -Rows $items
  $existingJson = gh label list --repo $Repo --limit 1000 --json name
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read existing labels from $Repo"
  }

  $existing = @{}
  ($existingJson | ConvertFrom-Json) | ForEach-Object { $existing[$_.name] = $true }

  $missing = @()
  foreach ($label in $desiredLabels) {
    if (-not $existing.ContainsKey($label)) {
      $missing += $label
    }
  }

  if ($missing.Count -gt 0) {
    if ($DryRun) {
      Write-Host "[DRY] Missing labels to create: $($missing -join ', ')"
    } else {
      foreach ($label in $missing) {
        gh label create $label --repo $Repo --color 0E8A16 --description "Auto-created by import script" | Out-Null
        if ($LASTEXITCODE -ne 0) {
          throw "Failed to create label '$label' in $Repo"
        }
      }
      Write-Host "Created missing labels: $($missing.Count)"
    }
  }
}

$created = 0
$failed = 0
foreach ($item in $items) {
  $labels = @()
  if ($item.Labels) {
    $labels = $item.Labels.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
  }

  if ($DryRun) {
    Write-Host "[DRY] $($item.Title)"
    continue
  }

  $args = @('issue', 'create', '--repo', $Repo, '--title', $item.Title, '--body', $item.Body)
  foreach ($label in $labels) {
    $args += @('--label', $label)
  }

  gh @args | Out-Host
  if ($LASTEXITCODE -eq 0) {
    $created++
  } else {
    $failed++
    if (-not $ContinueOnError) {
      throw "Issue creation failed for '$($item.Title)'. Re-run with -ContinueOnError to skip failed items."
    }
  }
}

if ($DryRun) {
  Write-Host "Dry run complete. Checked $($items.Count) issues."
} else {
  Write-Host "Created $created issues in $Repo. Failed: $failed"
}
