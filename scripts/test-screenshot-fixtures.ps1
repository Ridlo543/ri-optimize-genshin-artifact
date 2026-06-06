$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$project = Join-Path $repoRoot "apps\scanner-win\GenshinArtifactScanner.Win.csproj"
$fixtures = @(
    "bag-inventory-raw-1920x1200.png",
    "artifact-inventory-plus20.jpg",
    "artifact-inventory-unactivated.jpg"
)
$classificationFixtures = @(
    @{ Name = "bag-grid-live-1280x800.png"; State = "artifact-bag-grid"; Ready = $false }
)

function Convert-ScannerOutputToJson($rawOutput) {
    $text = ($rawOutput -join "`n")
    $start = $text.IndexOf("{")
    $end = $text.LastIndexOf("}")
    if ($start -lt 0 -or $end -le $start) {
        throw "Scanner output did not contain a JSON object."
    }

    return $text.Substring($start, $end - $start + 1) | ConvertFrom-Json
}

function Invoke-ScannerJson([string[]] $arguments) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $raw = dotnet run --project $project -- @arguments 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($exitCode -ne 0) {
        throw "Scanner process failed with exit code $exitCode."
    }

    return Convert-ScannerOutputToJson $raw
}

foreach ($fixture in $fixtures) {
    $result = Invoke-ScannerJson @("parse-screenshot-fixture", $fixture)

    if ($result.error -or -not $result.artifact) {
        throw "Screenshot fixture failed: $fixture :: $($result.error)"
    }

    $artifact = $result.artifact
    [PSCustomObject]@{
        Fixture = $fixture
        Layout = $result.capture.layout
        ScreenState = $result.screenState.code
        Artifact = "$($artifact.setKey)/$($artifact.slotKey)/$($artifact.mainStatKey)/+$($artifact.level)"
        Substats = $artifact.substats.Count
        Unactivated = $artifact.unactivatedSubstats.Count
    }
}

foreach ($fixture in $classificationFixtures) {
    $result = Invoke-ScannerJson @("classify-screenshot-fixture", $fixture.Name)

    if ($result.screenState.code -ne $fixture.State -or $result.screenState.readyForArtifactOcr -ne $fixture.Ready) {
        throw "Screenshot classification failed: $($fixture.Name) :: $($result.screenState.code)"
    }

    [PSCustomObject]@{
        Fixture = $fixture.Name
        Layout = $result.capture.layout
        ScreenState = $result.screenState.code
        Ready = $result.screenState.readyForArtifactOcr
        Hash = $result.capture.screenshotHash
    }
}
