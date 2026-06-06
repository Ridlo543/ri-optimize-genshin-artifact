using System.Text.Json.Serialization;

namespace GenshinArtifactScanner.Win;

internal sealed record ScannerError(
    [property: JsonPropertyName("error")] string Error,
    [property: JsonPropertyName("available")] bool Available = false);

internal sealed class ScannerStatus
{
    [JsonPropertyName("available")]
    public bool Available { get; init; }

    [JsonPropertyName("processName")]
    public string? ProcessName { get; init; }

    [JsonPropertyName("windowTitle")]
    public string? WindowTitle { get; init; }

    [JsonPropertyName("resolution")]
    public string? Resolution { get; init; }

    [JsonPropertyName("clientWidth")]
    public int? ClientWidth { get; init; }

    [JsonPropertyName("clientHeight")]
    public int? ClientHeight { get; init; }

    [JsonPropertyName("screenX")]
    public int? ScreenX { get; init; }

    [JsonPropertyName("screenY")]
    public int? ScreenY { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }
}

internal sealed class WatchStatus
{
    [JsonPropertyName("available")]
    public bool Available { get; init; }

    [JsonPropertyName("watching")]
    public bool Watching { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }

    public static WatchStatus NotImplemented(string error) => new() { Available = false, Watching = false, Error = error };

    public static WatchStatus Stopped() => new() { Available = true, Watching = false };
}

internal sealed class ScanResult
{
    [JsonPropertyName("source")]
    public required string Source { get; init; }

    [JsonPropertyName("mode")]
    public required string Mode { get; init; }

    [JsonPropertyName("confidence")]
    public required Confidence Confidence { get; init; }

    [JsonPropertyName("artifact")]
    public GoodArtifact? Artifact { get; init; }

    [JsonPropertyName("artifactDraft")]
    public GoodArtifactDraft? ArtifactDraft { get; init; }

    [JsonPropertyName("missingFields")]
    public List<string>? MissingFields { get; init; }

    [JsonPropertyName("optionalWarnings")]
    public List<string>? OptionalWarnings { get; init; }

    [JsonPropertyName("screenState")]
    public ScreenStateInfo? ScreenState { get; init; }

    [JsonPropertyName("capture")]
    public required CaptureInfo Capture { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }

    [JsonPropertyName("diagnostics")]
    public ScanDiagnostics? Diagnostics { get; init; }
}

internal sealed class Confidence
{
    [JsonPropertyName("setKey")]
    public double SetKey { get; init; }

    [JsonPropertyName("slotKey")]
    public double SlotKey { get; init; }

    [JsonPropertyName("mainStatKey")]
    public double MainStatKey { get; init; }

    [JsonPropertyName("level")]
    public double Level { get; init; }

    [JsonPropertyName("substats")]
    public double Substats { get; init; }

    [JsonPropertyName("lock")]
    public double Lock { get; init; }

    [JsonPropertyName("equipped")]
    public double Equipped { get; init; }

    [JsonPropertyName("location")]
    public double Location { get; init; }
}

internal sealed class CaptureInfo
{
    [JsonPropertyName("scanId")]
    public string? ScanId { get; init; }

    [JsonPropertyName("resolution")]
    public required string Resolution { get; init; }

    [JsonPropertyName("capturedAt")]
    public required string CapturedAt { get; init; }

    [JsonPropertyName("layout")]
    public string? Layout { get; init; }

    [JsonPropertyName("screenshotImagePath")]
    public string? ScreenshotImagePath { get; init; }

    [JsonPropertyName("artifactPanelImagePath")]
    public string? ArtifactPanelImagePath { get; init; }

    [JsonPropertyName("regionImagePath")]
    public string? RegionImagePath { get; init; }

    [JsonPropertyName("screenshotHash")]
    public string? ScreenshotHash { get; init; }

    [JsonPropertyName("regionHash")]
    public string? RegionHash { get; init; }

    [JsonPropertyName("region")]
    public ScanRegion? Region { get; init; }

    [JsonPropertyName("occlusionAvoided")]
    public bool OcclusionAvoided { get; init; }

    public static CaptureInfo Unavailable() => new()
    {
        Resolution = "unavailable",
        CapturedAt = DateTimeOffset.UtcNow.ToString("O")
    };
}

internal static class ScreenStateCodes
{
    public const string GameNotFound = "game-not-found";
    public const string ArtifactBagGrid = "artifact-bag-grid";
    public const string ArtifactBagDetail = "artifact-bag-detail";
    public const string CharacterArtifactDetail = "character-artifact-detail";
    public const string PaimonMenu = "paimon-menu";
    public const string UnknownGameScreen = "unknown-game-screen";
}

internal sealed class ScreenStateInfo
{
    [JsonPropertyName("code")]
    public required string Code { get; init; }

    [JsonPropertyName("readyForArtifactOcr")]
    public required bool ReadyForArtifactOcr { get; init; }

    [JsonPropertyName("confidence")]
    public required double Confidence { get; init; }

    [JsonPropertyName("message")]
    public required string Message { get; init; }
}

internal sealed class ScanRegion
{
    [JsonPropertyName("x")]
    public required double X { get; init; }

    [JsonPropertyName("y")]
    public required double Y { get; init; }

    [JsonPropertyName("width")]
    public required double Width { get; init; }

    [JsonPropertyName("height")]
    public required double Height { get; init; }

    [JsonPropertyName("unit")]
    public required string Unit { get; init; }
}

internal sealed class GoodArtifact
{
    [JsonPropertyName("id")]
    public object? Id { get; init; }

    [JsonPropertyName("setKey")]
    public string? SetKey { get; init; }

    [JsonPropertyName("slotKey")]
    public required string SlotKey { get; init; }

    [JsonPropertyName("rarity")]
    public required int Rarity { get; init; }

    [JsonPropertyName("level")]
    public required int Level { get; init; }

    [JsonPropertyName("mainStatKey")]
    public required string MainStatKey { get; init; }

    [JsonPropertyName("substats")]
    public required List<GoodSubstat> Substats { get; init; }

    [JsonPropertyName("unactivatedSubstats")]
    public List<GoodSubstat>? UnactivatedSubstats { get; init; }

    [JsonPropertyName("lock")]
    public bool Lock { get; init; }

    [JsonPropertyName("location")]
    public string? Location { get; init; }
}

internal sealed class GoodArtifactDraft
{
    [JsonPropertyName("id")]
    public object? Id { get; init; }

    [JsonPropertyName("setKey")]
    public string? SetKey { get; init; }

    [JsonPropertyName("slotKey")]
    public string? SlotKey { get; init; }

    [JsonPropertyName("rarity")]
    public int? Rarity { get; init; }

    [JsonPropertyName("level")]
    public int? Level { get; init; }

    [JsonPropertyName("mainStatKey")]
    public string? MainStatKey { get; init; }

    [JsonPropertyName("substats")]
    public List<GoodSubstat>? Substats { get; init; }

    [JsonPropertyName("unactivatedSubstats")]
    public List<GoodSubstat>? UnactivatedSubstats { get; init; }

    [JsonPropertyName("lock")]
    public bool? Lock { get; init; }

    [JsonPropertyName("location")]
    public string? Location { get; init; }
}

internal sealed class GoodSubstat
{
    [JsonPropertyName("key")]
    public required string Key { get; init; }

    [JsonPropertyName("value")]
    public required decimal Value { get; init; }
}

internal sealed class OcrSubstatsResult
{
    [JsonPropertyName("substats")]
    public required List<GoodSubstat> Substats { get; init; }

    [JsonPropertyName("unactivatedSubstats")]
    public required List<GoodSubstat> UnactivatedSubstats { get; init; }

    [JsonPropertyName("rawText")]
    public required string RawText { get; init; }

    [JsonPropertyName("confidence")]
    public required double Confidence { get; init; }

    [JsonPropertyName("imagePath")]
    public string? ImagePath { get; init; }

    [JsonPropertyName("debugImagePath")]
    public string? DebugImagePath { get; init; }
}

internal sealed class OcrFieldResult<T>
{
    [JsonPropertyName("field")]
    public required string Field { get; init; }

    [JsonPropertyName("value")]
    public T? Value { get; init; }

    [JsonPropertyName("rawText")]
    public string? RawText { get; init; }

    [JsonPropertyName("confidence")]
    public required double Confidence { get; init; }

    [JsonPropertyName("imagePath")]
    public string? ImagePath { get; init; }

    [JsonPropertyName("debugImagePath")]
    public string? DebugImagePath { get; init; }
}

internal sealed class ScanDiagnostics
{
    [JsonPropertyName("fixtureFolder")]
    public string? FixtureFolder { get; init; }

    [JsonPropertyName("screenshotPath")]
    public string? ScreenshotPath { get; init; }

    [JsonPropertyName("rawText")]
    public Dictionary<string, string> RawText { get; init; } = [];

    [JsonPropertyName("cropRectangles")]
    public Dictionary<string, string> CropRectangles { get; init; } = [];

    [JsonPropertyName("mismatches")]
    public List<string> Mismatches { get; init; } = [];

    [JsonPropertyName("setIdentity")]
    public SetIdentityDiagnostics? SetIdentity { get; init; }
}

internal sealed class SetIdentityDiagnostics
{
    [JsonPropertyName("rawItemName")]
    public string? RawItemName { get; init; }

    [JsonPropertyName("rawSetDisplayName")]
    public string? RawSetDisplayName { get; init; }

    [JsonPropertyName("matchedSetKey")]
    public string? MatchedSetKey { get; init; }

    [JsonPropertyName("matchSource")]
    public required string MatchSource { get; init; }
}

internal sealed class FixtureArtifactParseResult
{
    [JsonPropertyName("fixtureFolder")]
    public required string FixtureFolder { get; init; }

    [JsonPropertyName("passed")]
    public required bool Passed { get; init; }

    [JsonPropertyName("expected")]
    public required GoodArtifact Expected { get; init; }

    [JsonPropertyName("actual")]
    public required OcrSubstatsResult Actual { get; init; }

    [JsonPropertyName("mismatches")]
    public required List<string> Mismatches { get; init; }
}

internal sealed class FixtureCardParseResult
{
    [JsonPropertyName("fixtureFolder")]
    public required string FixtureFolder { get; init; }

    [JsonPropertyName("passed")]
    public required bool Passed { get; init; }

    [JsonPropertyName("expected")]
    public required GoodArtifact Expected { get; init; }

    [JsonPropertyName("scanResult")]
    public required ScanResult ScanResult { get; init; }

    [JsonPropertyName("fields")]
    public required FixtureCardOcrFields Fields { get; init; }

    [JsonPropertyName("mismatches")]
    public required List<string> Mismatches { get; init; }
}

internal sealed class FixtureCardOcrFields
{
    [JsonPropertyName("setKey")]
    public required OcrFieldResult<string> SetKey { get; init; }

    [JsonPropertyName("slotKey")]
    public required OcrFieldResult<string> SlotKey { get; init; }

    [JsonPropertyName("mainStatKey")]
    public required OcrFieldResult<string> MainStatKey { get; init; }

    [JsonPropertyName("level")]
    public required OcrFieldResult<int> Level { get; init; }

    [JsonPropertyName("lock")]
    public required OcrFieldResult<bool> Lock { get; init; }

    [JsonPropertyName("location")]
    public required OcrFieldResult<string> Location { get; init; }

    [JsonPropertyName("substats")]
    public required OcrSubstatsResult Substats { get; init; }
}
