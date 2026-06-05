using System.Text.Json;

namespace GenshinArtifactScanner.Win;

internal sealed class FixtureArtifactParser(ArtifactOcrService ocrService)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ArtifactOcrService ocrService = ocrService ?? throw new ArgumentNullException(nameof(ocrService));

    public FixtureArtifactParseResult Parse(string fixtureFolder, bool writeDebugImage = false)
    {
        FixturePaths paths = ResolveFixturePaths(fixtureFolder);

        GoodArtifact expected = LoadExpectedArtifact(paths.ArtifactPath);
        OcrSubstatsResult actual = ocrService.ReadSubstats(paths.SubstatsPath, writeDebugImage);
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

    public FixtureCardParseResult ParseCard(string fixtureFolder, bool writeDebugImage = false)
    {
        FixturePaths paths = ResolveFixturePaths(fixtureFolder);

        GoodArtifact expected = LoadExpectedArtifact(paths.ArtifactPath);
        OcrFieldResult<string> slot = ocrService.ReadSlotKey(paths.SlotPath, writeDebugImage);
        OcrFieldResult<string> mainStat = ocrService.ReadMainStatKey(paths.MainStatPath, slot.Value, writeDebugImage);
        OcrFieldResult<int> level = ocrService.ReadLevel(paths.LevelPath, writeDebugImage);
        OcrFieldResult<string> setKey = ocrService.ReadSetKey(paths.NamePath, writeDebugImage);
        OcrFieldResult<bool> locked = ArtifactVisualClassifier.ReadLock(paths.LockedPath);
        OcrFieldResult<string> location = ocrService.ReadLocation(paths.EquippedPath, writeDebugImage);
        OcrSubstatsResult substats = ocrService.ReadSubstats(paths.SubstatsPath, writeDebugImage);

        GoodArtifact actual = new()
        {
            Id = expected.Id,
            SetKey = setKey.Value,
            SlotKey = slot.Value ?? string.Empty,
            Rarity = expected.Rarity,
            Level = level.Value,
            MainStatKey = mainStat.Value ?? string.Empty,
            Substats = substats.Substats,
            UnactivatedSubstats = substats.UnactivatedSubstats,
            Lock = locked.Value,
            Location = location.Value ?? string.Empty
        };

        List<string> mismatches = CompareArtifact(expected, actual);
        ScanDiagnostics diagnostics = new()
        {
            FixtureFolder = Path.GetFullPath(fixtureFolder),
            RawText = BuildRawText(setKey, slot, mainStat, level, location),
            Mismatches = mismatches
        };

        ScanResult scanResult = new()
        {
            Source = "fixture",
            Mode = "fixture-card",
            Confidence = new Confidence
            {
                SetKey = setKey.Confidence,
                SlotKey = slot.Confidence,
                MainStatKey = mainStat.Confidence,
                Level = level.Confidence,
                Substats = substats.Confidence,
                Lock = locked.Confidence,
                Equipped = string.IsNullOrWhiteSpace(location.Value) ? 0.75 : location.Confidence,
                Location = location.Confidence
            },
            Artifact = actual,
            Capture = CreateFixtureCapture(paths.CardPath),
            Diagnostics = diagnostics,
            Error = mismatches.Count == 0 ? null : "Fixture card OCR completed with field mismatches."
        };

        return new FixtureCardParseResult
        {
            FixtureFolder = Path.GetFullPath(fixtureFolder),
            Passed = mismatches.Count == 0,
            Expected = expected,
            ScanResult = scanResult,
            Fields = new FixtureCardOcrFields
            {
                SetKey = setKey,
                SlotKey = slot,
                MainStatKey = mainStat,
                Level = level,
                Lock = locked,
                Location = location,
                Substats = substats
            },
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

    private static List<string> CompareArtifact(GoodArtifact expected, GoodArtifact actual)
    {
        List<string> mismatches = [];
        CompareValue("setKey", expected.SetKey, actual.SetKey, mismatches);
        CompareValue("slotKey", expected.SlotKey, actual.SlotKey, mismatches);
        CompareValue("mainStatKey", expected.MainStatKey, actual.MainStatKey, mismatches);
        CompareValue("level", expected.Level, actual.Level, mismatches);
        CompareValue("rarity", expected.Rarity, actual.Rarity, mismatches);
        CompareValue("lock", expected.Lock, actual.Lock, mismatches);
        CompareValue("location", expected.Location ?? string.Empty, actual.Location ?? string.Empty, mismatches);
        CompareList("substats", expected.Substats, actual.Substats, mismatches);
        CompareList("unactivatedSubstats", expected.UnactivatedSubstats ?? [], actual.UnactivatedSubstats ?? [], mismatches);
        return mismatches;
    }

    private static void CompareValue<T>(string field, T expected, T actual, List<string> mismatches)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
        {
            mismatches.Add($"{field} mismatch: expected {expected}, actual {actual}.");
        }
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

    private static Dictionary<string, string> BuildRawText(params object[] fields)
    {
        Dictionary<string, string> rawText = [];
        foreach (object field in fields)
        {
            switch (field)
            {
                case OcrFieldResult<string> textField:
                    rawText[textField.Field] = textField.RawText ?? string.Empty;
                    break;
                case OcrFieldResult<int> numberField:
                    rawText[numberField.Field] = numberField.RawText ?? string.Empty;
                    break;
            }
        }

        return rawText;
    }

    private static CaptureInfo CreateFixtureCapture(string cardPath)
    {
        using System.Drawing.Bitmap card = new(cardPath);
        return new CaptureInfo
        {
            Resolution = $"{card.Width}x{card.Height}",
            CapturedAt = DateTimeOffset.UtcNow.ToString("O"),
            ArtifactPanelImagePath = Path.GetFullPath(cardPath)
        };
    }

    private static FixturePaths ResolveFixturePaths(string fixtureFolder)
    {
        if (string.IsNullOrWhiteSpace(fixtureFolder))
        {
            throw new ArgumentException("Fixture folder is required.", nameof(fixtureFolder));
        }
        if (!Directory.Exists(fixtureFolder))
        {
            throw new DirectoryNotFoundException($"Fixture folder was not found: {fixtureFolder}");
        }

        FixturePaths paths = new(fixtureFolder);
        paths.EnsureRequiredFiles();
        return paths;
    }

    private sealed class FixturePaths
    {
        public FixturePaths(string fixtureFolder)
        {
            ArtifactPath = Path.Combine(fixtureFolder, "artifact.json");
            CardPath = Path.Combine(fixtureFolder, "card.png");
            NamePath = Path.Combine(fixtureFolder, "name", "name.png");
            SlotPath = Path.Combine(fixtureFolder, "slot", "slot.png");
            MainStatPath = Path.Combine(fixtureFolder, "mainstat", "mainstat.png");
            LevelPath = Path.Combine(fixtureFolder, "level", "level.png");
            LockedPath = Path.Combine(fixtureFolder, "locked", "locked.png");
            EquippedPath = Path.Combine(fixtureFolder, "equipped", "equipped.png");
            SubstatsPath = Path.Combine(fixtureFolder, "substats", "substats.png");
        }

        public string ArtifactPath { get; }

        public string CardPath { get; }

        public string NamePath { get; }

        public string SlotPath { get; }

        public string MainStatPath { get; }

        public string LevelPath { get; }

        public string LockedPath { get; }

        public string EquippedPath { get; }

        public string SubstatsPath { get; }

        public void EnsureRequiredFiles()
        {
            foreach (string path in new[] { ArtifactPath, CardPath, NamePath, SlotPath, MainStatPath, LevelPath, LockedPath, EquippedPath, SubstatsPath })
            {
                if (!File.Exists(path))
                {
                    throw new FileNotFoundException("Fixture file was not found.", path);
                }
            }
        }
    }
}
