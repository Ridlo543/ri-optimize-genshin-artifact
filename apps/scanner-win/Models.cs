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

    [JsonPropertyName("capture")]
    public required CaptureInfo Capture { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }
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
    [JsonPropertyName("resolution")]
    public required string Resolution { get; init; }

    [JsonPropertyName("capturedAt")]
    public required string CapturedAt { get; init; }

    [JsonPropertyName("artifactPanelImagePath")]
    public string? ArtifactPanelImagePath { get; init; }

    public static CaptureInfo Unavailable() => new()
    {
        Resolution = "unavailable",
        CapturedAt = DateTimeOffset.UtcNow.ToString("O")
    };
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
