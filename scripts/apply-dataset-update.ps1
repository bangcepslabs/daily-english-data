$ErrorActionPreference = "Stop"

param(
  [string]$UpdateFile = "scripts/dataset-update-2026-07-24.tsv",
  [string]$Version = "2026.07.24.3",
  [string]$UpdatedAt = "2026-07-24T15:30:00Z"
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$rows = Get-Content $UpdateFile -Encoding utf8 | Where-Object { $_.Trim() } | ForEach-Object {
  $parts = $_.Split("|")
  if ($parts.Count -ne 6) {
    throw "Invalid row: $_"
  }

  [pscustomobject]@{
    id = [int]$parts[0]
    english = $parts[1]
    korean = $parts[2]
    category = $parts[3]
    level = $parts[4]
    situation = $parts[5]
  }
}

$map = @{}
foreach ($row in $rows) {
  $map[$row.id] = $row
}

function Apply-Updates($items) {
  foreach ($item in $items) {
    $id = [int]$item.id
    if ($map.ContainsKey($id)) {
      $record = $map[$id]
      $item.english = $record.english
      $item.korean = $record.korean
      $item.category = $record.category
      $item.level = $record.level
      $item.situation = $record.situation
    }
  }
}

$dataPath = "data/sentences.json"
$data = Get-Content $dataPath -Raw -Encoding utf8 | ConvertFrom-Json
Apply-Updates $data
$existing = @($data | ForEach-Object { [int]$_.id })
foreach ($row in ($rows | Where-Object { $existing -notcontains $_.id } | Sort-Object id)) {
  $data += [pscustomobject]@{
    id = $row.id
    english = $row.english
    korean = $row.korean
    category = $row.category
    level = $row.level
    situation = $row.situation
  }
}
$data = @($data | Sort-Object id)
[System.IO.File]::WriteAllText((Resolve-Path $dataPath), ($data | ConvertTo-Json -Depth 6), $utf8NoBom)

$rawPath = "examples/github-raw/sentences.json"
$raw = Get-Content $rawPath -Raw -Encoding utf8 | ConvertFrom-Json
Apply-Updates $raw.sentences
$rawExisting = @($raw.sentences | ForEach-Object { [int]$_.id })
foreach ($row in ($rows | Where-Object { $rawExisting -notcontains $_.id } | Sort-Object id)) {
  $raw.sentences += [pscustomobject]@{
    id = $row.id
    english = $row.english
    korean = $row.korean
    category = $row.category
    level = $row.level
    situation = $row.situation
  }
}
$raw.sentences = @($raw.sentences | Sort-Object id)
$raw.count = $raw.sentences.Count
$raw.version = $Version
$raw.updatedAt = $UpdatedAt
[System.IO.File]::WriteAllText((Resolve-Path $rawPath), ($raw | ConvertTo-Json -Depth 6), $utf8NoBom)

$metaPath = "examples/github-raw/sentences.meta.json"
$meta = Get-Content $metaPath -Raw -Encoding utf8 | ConvertFrom-Json
$meta.count = $raw.sentences.Count
$meta.version = $Version
$meta.updatedAt = $UpdatedAt
[System.IO.File]::WriteAllText((Resolve-Path $metaPath), ($meta | ConvertTo-Json -Depth 4), $utf8NoBom)
