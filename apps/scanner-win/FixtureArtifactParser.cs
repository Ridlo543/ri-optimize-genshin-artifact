using System.Text.Json;

namespace GenshinArtifactScanner.Win;

internal sealed class FixtureArtifactParser(ArtifactOcrService ocrService)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ArtifactOcrService ocrService = ocrService ?? throw new ArgumentNullException(nameof(ocrService));

    public FixtureArtifactParseResult Parse(string fixtureFolder, bool writeDebugImage = false)
    {
        if (string.IsNullOrWhiteSpace(fixtureFolder))
        {
            throw new ArgumentException("Fixture folder is required.", nameof(fixtureFolder));
        }
        if (!Directory.Exists(fixtureFolder))
        {
            throw new DirectoryNotFoundException($"Fixture folder was not found: {fixtureFolder}");
        }

        string artifactPath = Path.Combine(fixtureFolder, "artifact.json");
        string substatsPath = Path.Combine(fixtureFolder, "substats", "substats.png");
        if (!File.Exists(artifactPath))
        {
            throw new FileNotFoundException("Fixture artifact.json was not found.", artifactPath);
        }
        if (!File.Exists(substatsPath))
        {
            throw new FileNotFoundException("Fixture substats image was not found.", substatsPath);
        }

        GoodArtifact expected = LoadExpectedArtifact(artifactPath);
        OcrSubstatsResult actual = ocrService.ReadSubstats(substatsPath, writeDebugImage);
        List<string> mismatches = CompareSubstats(expected, actual);

        return new FixtureArtifactParseResult
        {
            FixtureFolder = Path.GetFullPath(fixtureFolder),
            Passed = mismatches.Count == 0,
            Expected = expected,
            Actual = actual,
            Mismatches = mismatches
        };
    }

    public static GoodArtifact LoadExpectedArtifact(string artifactPath)
    {
        GoodArtifact? artifact = JsonSerializer.Deserialize<GoodArtifact>(File.ReadAllText(artifactPath), JsonOptions);
        return artifact ?? throw new InvalidOperationException($"Unable to parse fixture artifact: {artifactPath}");
    }

    private static List<string> CompareSubstats(GoodArtifact expected, OcrSubstatsResult actual)
    {
        List<string> mismatches = [];
        CompareList("substats", expected.Substats, actual.Substats, mismatches);
        CompareList("unactivatedSubstats", expected.UnactivatedSubstats ?? [], actual.UnactivatedSubstats, mismatches);
        return mismatches;
    }

    private static void CompareList(string field, IReadOnlyList<GoodSubstat> expected, IReadOnlyList<GoodSubstat> actual, List<string> mismatches)
    {
        if (expected.Count != actual.Count)
        {
            mismatches.Add($"{field} count mismatch: expected {expected.Count}, actual {actual.Count}.");
            return;
        }

        for (int index = 0; index < expected.Count; index++)
        {
            GoodSubstat expectedSubstat = expected[index];
            GoodSubstat actualSubstat = actual[index];
            if (!StringComparer.Ordinal.Equals(expectedSubstat.Key, actualSubstat.Key))
            {
                mismatches.Add($"{field}[{index}] key mismatch: expected {expectedSubstat.Key}, actual {actualSubstat.Key}.");
            }
            if (Math.Abs(expectedSubstat.Value - actualSubstat.Value) > 0.05m)
            {
                mismatches.Add($"{field}[{index}] value mismatch: expected {expectedSubstat.Value}, actual {actualSubstat.Value}.");
            }
        }
    }
}
