$ErrorActionPreference = "Stop"

$project = "apps/scanner-win/GenshinArtifactScanner.Win.csproj"
$characterRegion = '{\"x\":0.75625,\"y\":0.075,\"width\":0.2427083333,\"height\":0.8333333333,\"unit\":\"normalized-client\"}'
$bagRegion = '{\"x\":0.68125,\"y\":0.1,\"width\":0.2572916667,\"height\":0.8016666667,\"unit\":\"normalized-client\"}'

$fixtures = @(
    @{
        Name = "success_artifact_character_detail_1.png"
        Region = $characterRegion
        SlotKey = "sands"
        MainStatKey = "atk_"
        Level = 20
        Rarity = 5
        Substats = 4
        ExpectSetKey = "ObsidianCodex"
    },
    @{
        Name = "error_artifact_character_detail_1.png"
        Region = $characterRegion
        SlotKey = "sands"
        MainStatKey = "enerRech_"
        Level = 20
        Rarity = 5
        Substats = 4
        ExpectSetKey = $null
    },
    @{
        Name = "error_artifact_character_detail_2.png"
        Region = $characterRegion
        SlotKey = "sands"
        MainStatKey = "atk_"
        Level = 20
        Rarity = 5
        Substats = 4
        ExpectSetKey = "ObsidianCodex"
    },
    @{
        Name = "error_artifact_character_detail_3.png"
        Region = $characterRegion
        SlotKey = "sands"
        MainStatKey = "eleMas"
        Level = 20
        Rarity = 5
        Substats = 4
        ExpectSetKey = "NoblesseOblige"
        ExpectedSubstats = @(
            @{ Key = "atk_"; Value = 5.8 },
            @{ Key = "critDMG_"; Value = 35.8 },
            @{ Key = "critRate_"; Value = 3.5 },
            @{ Key = "enerRech_"; Value = 12.3 }
        )
    },
    @{
        Name = "error_artifact_character_detail_4.png"
        Region = $characterRegion
        SlotKey = "sands"
        MainStatKey = "atk_"
        Level = 0
        Rarity = 5
        Substats = 3
        Unactivated = 1
        ExpectSetKey = "ObsidianCodex"
    },
    @{
        Name = "error_artifact_bag_detail_1.png"
        Region = $bagRegion
        SlotKey = "flower"
        MainStatKey = "hp"
        Level = 0
        Rarity = 5
        Substats = 3
        Unactivated = 1
        ExpectSetKey = "DisenchantmentInDeepShadow"
    },
    @{
        Name = "error_artifact_bag_detail_2.png"
        Region = $bagRegion
        SlotKey = "flower"
        MainStatKey = "hp"
        Level = 0
        Rarity = 5
        Substats = 3
        Unactivated = 1
        ExpectSetKey = "DisenchantmentInDeepShadow"
    },
    @{
        Name = "GenshinImpact_WGHmIpkN58.jpg"
        Region = $bagRegion
        SlotKey = "sands"
        MainStatKey = "atk_"
        Level = 20
        Rarity = 5
        Substats = 4
        ExpectSetKey = "ObsidianCodex"
        ExpectedSubstats = @(
            @{ Key = "critRate_"; Value = 6.6 },
            @{ Key = "hp_"; Value = 9.3 },
            @{ Key = "critDMG_"; Value = 15.5 },
            @{ Key = "def"; Value = 42 }
        )
    },
    @{
        Name = "GenshinImpact_zuCNecgQiu.jpg"
        Region = $bagRegion
        SlotKey = "sands"
        MainStatKey = "atk_"
        Level = 0
        Rarity = 5
        Substats = 3
        Unactivated = 1
        ExpectSetKey = "DisenchantmentInDeepShadow"
        ExpectedSubstats = @(
            @{ Key = "hp"; Value = 239 },
            @{ Key = "critDMG_"; Value = 7.8 },
            @{ Key = "atk"; Value = 14 }
        )
        ExpectedUnactivatedSubstats = @(
            @{ Key = "def_"; Value = 5.1 }
        )
    },
    @{
        Name = "iTPXIcUjaV.png"
        Region = $bagRegion
        SlotKey = "flower"
        MainStatKey = "hp"
        Level = 20
        Rarity = 5
        Substats = 4
        ExpectSetKey = "CelestialGift"
        ExpectedSubstats = @(
            @{ Key = "critRate_"; Value = 10.5 },
            @{ Key = "enerRech_"; Value = 6.5 },
            @{ Key = "def"; Value = 23 },
            @{ Key = "hp_"; Value = 16.3 }
        )
    },
    @{
        Name = "success_artifact_bag_detail_1_level0.png"
        Region = $bagRegion
        SlotKey = "plume"
        MainStatKey = "atk"
        Level = 0
        Rarity = 5
        Substats = 3
        Unactivated = 1
        ExpectSetKey = "DisenchantmentInDeepShadow"
    },
    @{
        Name = "success_artifact_bag_detail_2_level20.png"
        Region = $bagRegion
        SlotKey = "flower"
        MainStatKey = "hp"
        Level = 20
        Rarity = 5
        Substats = 4
        ExpectSetKey = "ADayCarvedFromRisingWinds"
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

function Assert-Substats($fixtureName, $label, $actualSubstats, $expectedSubstats) {
    for ($index = 0; $index -lt $expectedSubstats.Count; $index++) {
        $expectedSubstat = $expectedSubstats[$index]
        $actualSubstat = $actualSubstats[$index]
        if ($actualSubstat.key -ne $expectedSubstat.Key) {
            throw "$fixtureName ${label}[$index] key expected $($expectedSubstat.Key), got $($actualSubstat.key)"
        }
        if ([Math]::Abs([double]$actualSubstat.value - [double]$expectedSubstat.Value) -gt 0.05) {
            throw "$fixtureName ${label}[$index] value expected $($expectedSubstat.Value), got $($actualSubstat.value)"
        }
    }
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
    if ($null -eq $result.artifact) {
        throw "$($fixture.Name) did not return artifact data."
    }
    if ($result.artifact.setKey -ne $fixture.ExpectSetKey) {
        throw "$($fixture.Name) setKey expected $($fixture.ExpectSetKey), got $($result.artifact.setKey)"
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
    if ($fixture.ContainsKey("ExpectedSubstats")) {
        Assert-Substats $fixture.Name "substat" @($result.artifact.substats) $fixture.ExpectedSubstats
    }
    if ($fixture.ContainsKey("Unactivated") -and $result.artifact.unactivatedSubstats.Count -ne $fixture.Unactivated) {
        throw "$($fixture.Name) unactivated expected $($fixture.Unactivated), got $($result.artifact.unactivatedSubstats.Count)"
    }
    if ($fixture.ContainsKey("ExpectedUnactivatedSubstats")) {
        Assert-Substats $fixture.Name "unactivated" @($result.artifact.unactivatedSubstats) $fixture.ExpectedUnactivatedSubstats
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
