namespace GenshinArtifactScanner.Win;

internal static class SampleScanResult
{
    public static ScanResult Create() => new()
    {
        Source = "fixture",
        Mode = "visible-artifact",
        Confidence = new Confidence
        {
            SetKey = 0.95,
            SlotKey = 0.98,
            MainStatKey = 0.96,
            Level = 0.97,
            Substats = 0.94,
            Lock = 0.95,
            Equipped = 0.9,
            Location = 0.9
        },
        Artifact = new GoodArtifact
        {
            SetKey = "HuskOfOpulentDreams",
            SlotKey = "goblet",
            Rarity = 5,
            Level = 0,
            MainStatKey = "def_",
            Substats =
            [
                new GoodSubstat { Key = "critDMG_", Value = 7.0m },
                new GoodSubstat { Key = "eleMas", Value = 23m },
                new GoodSubstat { Key = "def", Value = 23m }
            ],
            UnactivatedSubstats =
            [
                new GoodSubstat { Key = "critRate_", Value = 3.1m }
            ],
            Lock = false,
            Location = ""
        },
        Capture = new CaptureInfo
        {
            Resolution = "fixture",
            CapturedAt = DateTimeOffset.UtcNow.ToString("O")
        }
    };
}
