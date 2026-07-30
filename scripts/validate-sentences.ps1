param(
  [string]$DataPath = "data/sentences.json",
  [string]$RawPath = "examples/github-raw/sentences.json",
  [string]$MetaPath = "examples/github-raw/sentences.meta.json",
  [switch]$FailOnWarning
)

$ErrorActionPreference = "Stop"

$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Error([string]$message) {
  $script:errors.Add($message)
}

function Add-Warning([string]$message) {
  $script:warnings.Add($message)
}

function Load-Json([string]$path) {
  if (-not (Test-Path $path)) {
    throw "File not found: $path"
  }

  return Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-Sentences($payload, [string]$path) {
  if ($payload -is [System.Array]) {
    return @($payload)
  }

  if ($payload.PSObject.Properties.Name -contains "sentences") {
    return @($payload.sentences)
  }

  Add-Error("${path}: expected an array or an object with a sentences array")
  return @()
}

function Test-RequiredString([object]$value) {
  return -not [string]::IsNullOrWhiteSpace([string]$value)
}

function Get-CompactRow($item) {
  return [pscustomobject]@{
    id = [int]$item.id
    english = [string]$item.english
    korean = [string]$item.korean
    category = [string]$item.category
    level = [string]$item.level
    situation = [string]$item.situation
  }
}

function Compare-SentenceSets($left, $right, [string]$leftName, [string]$rightName) {
  if ($left.Count -ne $right.Count) {
    Add-Error("$leftName and $rightName have different sentence counts: $($left.Count) vs $($right.Count)")
    return
  }

  for ($index = 0; $index -lt $left.Count; $index++) {
    $a = Get-CompactRow $left[$index]
    $b = Get-CompactRow $right[$index]
    if (($a | ConvertTo-Json -Compress) -ne ($b | ConvertTo-Json -Compress)) {
      Add-Error("$leftName and $rightName differ at index $index (id $($a.id))")
      return
    }
  }
}

function Validate-Sentences($sentences, [string]$path) {
  if (-not $sentences.Count) {
    Add-Error("${path}: sentence list is empty")
    return
  }

  $allowedLevels = @("Beginner", "Intermediate", "Advanced")
  $seenIds = @{}
  $seenEnglish = @{}
  $openingCounts = @{}

  foreach ($item in $sentences) {
    if ($null -eq $item) {
      Add-Error("${path}: found a null sentence item")
      continue
    }

    foreach ($field in @("id", "english", "korean", "category", "level", "situation")) {
      if (-not ($item.PSObject.Properties.Name -contains $field)) {
        Add-Error("${path}: item is missing field '$field'")
      }
    }

    try {
      $id = [int]$item.id
    } catch {
      Add-Error("${path}: invalid id '$($item.id)'")
      continue
    }

    if ($seenIds.ContainsKey($id)) {
      Add-Error("${path}: duplicate id $id")
    } else {
      $seenIds[$id] = $true
    }

    foreach ($field in @("english", "korean", "category", "level", "situation")) {
      if (-not (Test-RequiredString $item.$field)) {
        Add-Error("${path}: item $id has an empty $field")
      }
    }

    $english = [string]$item.english
    $korean = [string]$item.korean
    $category = [string]$item.category
    $level = [string]$item.level
    $situation = [string]$item.situation

    if ($allowedLevels -notcontains $level) {
      Add-Error("${path}: item $id has invalid level '$level'")
    }

    if ($seenEnglish.ContainsKey($english)) {
      Add-Error("${path}: duplicate english sentence '$english'")
    } else {
      $seenEnglish[$english] = $id
    }

    if ($english -notmatch '[.!?]["'']?$') {
      Add-Warning("${path}: item $id english may be missing ending punctuation")
    }

    if ($english -match '\b(before|after|more|less|very|really|to|the)\s+\1\b') {
      Add-Error("${path}: item $id english has a repeated word pattern")
    }

    if ($english -match '\ba\s+[aeiouAEIOU]\w*' -and $english -notmatch '\ba\s+(user|university|uniform|unit|euro|one)\b') {
      Add-Warning("${path}: item $id english may have an article mismatch: '$english'")
    }

    if ($english -match '\ban\s+[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]\w*' -and $english -notmatch '\ban\s+(honest|hour|heir)\b') {
      Add-Warning("${path}: item $id english may have an article mismatch: '$english'")
    }

    if ($english -match '\bseems missing\b' -or $english -match '\bfeels more better\b') {
      Add-Error("${path}: item $id english contains a known awkward pattern")
    }

    if ($situation -match '\bbefore [^.!?]* before\b') {
      Add-Error("${path}: item $id situation contains a repeated phrase")
    }

    $opening = (($english -split '\s+') | Select-Object -First 4) -join ' '
    if ($openingCounts.ContainsKey($opening)) {
      $openingCounts[$opening]++
    } else {
      $openingCounts[$opening] = 1
    }
  }

  $repeatedOpenings = $openingCounts.GetEnumerator() | Where-Object { $_.Value -ge 20 } | Sort-Object Value -Descending
  foreach ($pair in $repeatedOpenings) {
    Write-Output ("Info: {0}: repeated opening '{1}' appears {2} times" -f $path, $pair.Key, $pair.Value)
  }
}

$dataPayload = Load-Json $DataPath
$rawPayload = Load-Json $RawPath
$metaPayload = Load-Json $MetaPath

$dataSentences = Get-Sentences $dataPayload $DataPath
$rawSentences = Get-Sentences $rawPayload $RawPath

Validate-Sentences $dataSentences $DataPath
Validate-Sentences $rawSentences $RawPath
Compare-SentenceSets $dataSentences $rawSentences $DataPath $RawPath

if ($metaPayload.count -ne $rawSentences.Count) {
  Add-Error("${MetaPath}: count does not match raw sentence count")
}

if (($rawPayload.PSObject.Properties.Name -contains "count") -and $rawPayload.count -ne $rawSentences.Count) {
  Add-Error("${RawPath}: count does not match raw sentence count")
}

if (($rawPayload.PSObject.Properties.Name -contains "version") -and $metaPayload.version -ne $rawPayload.version) {
  Add-Error("${MetaPath}: version does not match raw payload version")
}

if (($rawPayload.PSObject.Properties.Name -contains "updatedAt") -and $metaPayload.updatedAt -ne $rawPayload.updatedAt) {
  Add-Error("${MetaPath}: updatedAt does not match raw payload updatedAt")
}

Write-Output "Validation summary"
Write-Output "  Data count: $($dataSentences.Count)"
Write-Output "  Raw count: $($rawSentences.Count)"
Write-Output "  Errors: $($errors.Count)"
Write-Output "  Warnings: $($warnings.Count)"

if ($warnings.Count) {
  Write-Output ""
  Write-Output "Warnings"
  foreach ($message in $warnings) {
    Write-Output "  - $message"
  }
}

if ($errors.Count) {
  Write-Output ""
  Write-Output "Errors"
  foreach ($message in $errors) {
    Write-Output "  - $message"
  }
  exit 1
}

if ($FailOnWarning -and $warnings.Count) {
  Write-Output ""
  Write-Output "Validation failed because -FailOnWarning was set."
  exit 1
}

Write-Output ""
Write-Output "Sentence files validated successfully."
