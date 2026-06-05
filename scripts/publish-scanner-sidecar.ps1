$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path $cargoBin) {
    $env:Path = "$cargoBin;$env:Path"
}

$hostTuple = (& rustc --print host-tuple).Trim()
if ([string]::IsNullOrWhiteSpace($hostTuple)) {
    throw "Unable to determine Rust host tuple for Tauri sidecar naming."
}

$project = Join-Path $repoRoot "apps\scanner-win\GenshinArtifactScanner.Win.csproj"
$outputDir = Join-Path $repoRoot "apps\desktop\src-tauri\binaries"
$publishDir = Join-Path $outputDir "scanner-publish"
$targetExe = Join-Path $outputDir "GenshinArtifactScanner.Win-$hostTuple.exe"
$tessdataSource = Join-Path $repoRoot "apps\scanner-win\tessdata"
$tessdataTarget = Join-Path $outputDir "tessdata"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

dotnet publish $project `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -o $publishDir

$publishedExe = Join-Path $publishDir "GenshinArtifactScanner.Win.exe"
if (!(Test-Path $publishedExe)) {
    throw "Published scanner executable was not found: $publishedExe"
}

Copy-Item -Path (Join-Path $publishDir "*") -Destination $outputDir -Recurse -Force
Copy-Item -LiteralPath $publishedExe -Destination $targetExe -Force
New-Item -ItemType Directory -Force -Path $tessdataTarget | Out-Null
Copy-Item -Path (Join-Path $tessdataSource "*.traineddata") -Destination $tessdataTarget -Force

Write-Host "Published Tauri sidecar: $targetExe"
