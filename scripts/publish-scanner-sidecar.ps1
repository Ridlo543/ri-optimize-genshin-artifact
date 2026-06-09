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

if (Test-Path $outputDir) {
    Get-ChildItem -LiteralPath $outputDir -Force |
        Where-Object { $_.Name -ne ".gitignore" } |
        Remove-Item -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

dotnet publish $project `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=false `
    -o $publishDir

$publishedExe = Join-Path $publishDir "GenshinArtifactScanner.Win.exe"
if (!(Test-Path $publishedExe)) {
    throw "Published scanner executable was not found: $publishedExe"
}

Write-Host "Published Tauri scanner folder: $publishDir"
