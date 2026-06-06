$ErrorActionPreference = "Stop"

$project = "apps/scanner-win/GenshinArtifactScanner.Win.csproj"
$characterRegion = '{\"x\":0.75625,\"y\":0.075,\"width\":0.2427083333,\"height\":0.8333333333,\"unit\":\"normalized-client\"}'
$bagRegion = '{\"x\":0.68125,\"y\":0.1,\"width\":0.2572916667,\"height\":0.8016666667,\"unit\":\"normalized-client\"}'

$fixtures = @(
    @{
        Name = "GenshinImpact_lKJAl1Pymu.jpg"
        Region = $characterRegion
        SetKey = "CelestialGift"
        SlotKey = "sands"
        MainStatKey = "atk_"
        Level = 20
        Rarity = 5
        Substats = 4
        Unactivated = 0
    },
    @{
        Name = "GenshinImpact_oXNqhIZyXT.jpg"
        Region = $characterRegion
        SetKey = "CelestialGift"
        SlotKey = "sands"
        MainStatKey = "atk_"
        Level = 0
        Rarity = 5
        Substats = 3
        Unactivated = 1
    },
    @{
        Name = "ArtifactsInventory1_8x5 - weight 0.png"
        Region = $bagRegion
        SetKey = "CelestialGift"
        SlotKey = "flower"
        MainStatKey = "hp"
        Level = 20
        Rarity = 5
        Substats = 4
        Unactivated = 0
    },
    @{
        Name = "ArtifactsInventory40_8x5 - weight 0.png"
        Region = $bagRegion
        SetKey = "NoblesseOblige"
        SlotKey = "flower"
        MainStatKey = "hp"
        Level = 0
        Rarity = 5
        Substats = 3
        Unactivated = 1
    },
    @{
        Name = "ArtifactsInventory45_8x5 - weight 0.png"
        Region = $bagRegion
        SetKey = "Instructor"
        SlotKey = "plume"
        MainStatKey = "atk"
        Level = 0
        Rarity = 4
        Substats = 2
        Unactivated = 0
    },
    @{
        Name = "GenshinImpact_3star.png"
        Region = $bagRegion
        SetKey = "TravelingDoctor"
        SlotKey = "plume"
        MainStatKey = "atk"
        Level = 0
        Rarity = 3
        Substats = 1
        Unactivated = 0
    },
    @{
        Name = "GenshinImpact_2star.jpg"
        Region = $bagRegion
        SetKey = "Adventurer"
        SlotKey = "plume"
        MainStatKey = "atk"
        Level = 0
        Rarity = 2
        Substats = 0
        Unactivated = 0
    }
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

foreach ($fixture in $fixtures) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $raw = dotnet run --project $project -- parse-region-fixture $fixture.Name $fixture.Region 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($exitCode -ne 0) {
        throw "$($fixture.Name) scanner process failed with exit code $exitCode."
    }

    $result = Convert-ScannerOutputToJson $raw

    if ($null -ne $result.error) {
        throw "$($fixture.Name) returned scanner error: $($result.error)"
    }
    if ($result.artifact.setKey -ne $fixture.SetKey) {
        throw "$($fixture.Name) setKey expected $($fixture.SetKey), got $($result.artifact.setKey)"
    }
    if ($result.artifact.slotKey -ne $fixture.SlotKey) {
        throw "$($fixture.Name) slotKey expected $($fixture.SlotKey), got $($result.artifact.slotKey)"
    }
    if ($result.artifact.mainStatKey -ne $fixture.MainStatKey) {
        throw "$($fixture.Name) mainStatKey expected $($fixture.MainStatKey), got $($result.artifact.mainStatKey)"
    }
    if ($result.artifact.level -ne $fixture.Level) {
        throw "$($fixture.Name) level expected $($fixture.Level), got $($result.artifact.level)"
    }
    if ($result.artifact.rarity -ne $fixture.Rarity) {
        throw "$($fixture.Name) rarity expected $($fixture.Rarity), got $($result.artifact.rarity)"
    }
    if ($result.artifact.substats.Count -ne $fixture.Substats) {
        throw "$($fixture.Name) substats expected $($fixture.Substats), got $($result.artifact.substats.Count)"
    }
    if ($result.artifact.unactivatedSubstats.Count -ne $fixture.Unactivated) {
        throw "$($fixture.Name) unactivated expected $($fixture.Unactivated), got $($result.artifact.unactivatedSubstats.Count)"
    }

    [PSCustomObject]@{
        Fixture = $fixture.Name
        Layout = $result.capture.layout
        Artifact = "$($result.artifact.rarity)-star $($result.artifact.setKey)/$($result.artifact.slotKey)/$($result.artifact.mainStatKey)/+$($result.artifact.level)"
        Substats = $result.artifact.substats.Count
        Unactivated = $result.artifact.unactivatedSubstats.Count
        Hash = $result.capture.regionHash.Substring(0, 12)
    }
}
