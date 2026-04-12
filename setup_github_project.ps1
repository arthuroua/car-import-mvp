param(
  [Parameter(Mandatory = $true)]
  [string]$Repo, # owner/repo

  [string]$Owner = "@me",

  [string]$ProjectTitle = "Car Import MVP",

  [int]$ProjectNumber = 0
)

$ErrorActionPreference = "Stop"

function Run-GhJson {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  $output = & gh @Args
  if ($LASTEXITCODE -ne 0) {
    throw "gh command failed: gh $($Args -join ' ')"
  }

  if ([string]::IsNullOrWhiteSpace($output)) {
    return $null
  }

  return ($output | ConvertFrom-Json)
}

# 1) Validate auth and required scope
$authText = (& gh auth status 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
  throw "Not authenticated. Run: gh auth login"
}

$scopeLine = ($authText -split "`r?`n" | Where-Object { $_ -match "Token scopes:" } | Select-Object -First 1)
$scopes = @()
if ($scopeLine) {
  $raw = ($scopeLine -replace ".*Token scopes:\s*", "")
  $raw = $raw -replace "'", ""
  $scopes = $raw.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}

$hasProject = $scopes -contains "project"
if (-not $hasProject) {
  $current = if ($scopes.Count -gt 0) { ($scopes -join ", ") } else { "unknown" }
  throw "Missing required scope 'project'. Current: $current`nRun:`n  gh auth refresh -h github.com -s project"
}

# 2) Validate repo
$repoView = Run-GhJson -Args @('repo','view',$Repo,'--json','nameWithOwner,url')
$repoNameWithOwner = $repoView.nameWithOwner
Write-Host "Using repo: $repoNameWithOwner"

# 3) Resolve owner login
if ($Owner -eq "@me") {
  $ownerLogin = (& gh api user --jq .login)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($ownerLogin)) {
    throw "Failed to resolve current user login"
  }
} else {
  $ownerLogin = $Owner
}
Write-Host "Project owner: $ownerLogin"

# 4) Use provided project number or create a new project
if ($ProjectNumber -gt 0) {
  $projectNumber = [string]$ProjectNumber
  Write-Host "Using existing project #$projectNumber"
} else {
  $created = Run-GhJson -Args @('project','create','--owner',$ownerLogin,'--title',$ProjectTitle,'--format','json')
  $projectNumber = [string]$created.number
  Write-Host "Created project #$projectNumber ($ProjectTitle)"
}

# Ensure title is set as requested
& gh project edit $projectNumber --owner $ownerLogin --title $ProjectTitle 2>$null | Out-Null

$project = Run-GhJson -Args @('project','view',$projectNumber,'--owner',$ownerLogin,'--format','json')
$projectId = $project.id
$projectUrl = $project.url
if (-not $projectId) {
  throw "Failed to resolve project ID"
}

# 5) Link project to repo (ignore if already linked)
& gh project link $projectNumber --owner $ownerLogin --repo $repoNameWithOwner 2>$null | Out-Null

# 6) Fetch issues
$issuesResult = Run-GhJson -Args @('issue','list','--repo',$repoNameWithOwner,'--state','open','--limit','500','--json','number,title,url,labels')
$issues = @($issuesResult)
if (-not $issues -or $issues.Count -eq 0) {
  throw "No open issues found in $repoNameWithOwner"
}

$issueLabelMap = @{}
foreach ($i in $issues) {
  $labelNames = @()
  if ($i.labels) {
    $labelNames = $i.labels | ForEach-Object { $_.name }
  }
  $issueLabelMap[$i.url] = $labelNames
}

# 7) Add issues to project
$added = 0
foreach ($i in $issues) {
  & gh project item-add $projectNumber --owner $ownerLogin --url $i.url 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $added++ }
}
Write-Host "Attempted to add $($issues.Count) issues. Newly added: $added"

# 8) Resolve Status field and options
$fieldsResult = Run-GhJson -Args @('project','field-list',$projectNumber,'--owner',$ownerLogin,'--format','json')
$fieldItems = @()
if ($fieldsResult -and $fieldsResult.fields) {
  $fieldItems = @($fieldsResult.fields)
} else {
  $fieldItems = @($fieldsResult)
}

$statusField = $fieldItems | Where-Object { $_.name -eq 'Status' } | Select-Object -First 1
if (-not $statusField) {
  throw "Status field not found in project"
}

function Find-OptionId {
  param($options, [string[]]$names)
  foreach ($n in $names) {
    $match = $options | Where-Object { $_.name -eq $n } | Select-Object -First 1
    if ($match) { return $match.id }
  }
  return $null
}

$todoOptionId = Find-OptionId -options $statusField.options -names @('Todo','To do','Backlog')
$backlogOptionId = Find-OptionId -options $statusField.options -names @('Backlog','Todo','To do')
if (-not $todoOptionId) {
  throw "Could not resolve a Todo/Backlog-like status option"
}

# 9) Load project items and assign statuses
$itemsResult = Run-GhJson -Args @('project','item-list',$projectNumber,'--owner',$ownerLogin,'--limit','1000','--format','json')
$items = @()
if ($itemsResult -and $itemsResult.items) {
  $items = @($itemsResult.items)
} else {
  $items = @($itemsResult)
}

$updated = 0
foreach ($item in $items) {
  if (-not $item.content) { continue }
  if ($item.content.type -ne 'Issue') { continue }

  $url = $item.content.url
  if (-not $url) { continue }
  if (-not $url.StartsWith("https://github.com/$repoNameWithOwner/issues/")) { continue }

  $labels = @()
  if ($issueLabelMap.ContainsKey($url)) {
    $labels = $issueLabelMap[$url]
  }

  $targetOption = $todoOptionId
  if ($labels -contains 'type/epic') {
    $targetOption = $backlogOptionId
  }

  & gh project item-edit --id $item.id --project-id $projectId --field-id $statusField.id --single-select-option-id $targetOption 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $updated++
  }
}

Write-Host "Updated item statuses: $updated"
Write-Host "Project URL: $projectUrl"
