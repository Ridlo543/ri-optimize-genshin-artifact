using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ScreenshotArtifactParserTests
{
    [TestMethod]
    public void ParseFile_BagInventoryScreenshotReadsSelectedCard()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);

        ScanResult result = parser.ParseFile(GetScreenshotPath("bag-inventory-raw-1920x1200.png"));

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("bag-inventory-card");
        result.ScreenState.Should().NotBeNull();
        result.ScreenState!.Code.Should().Be(ScreenStateCodes.ArtifactBagDetail);
        result.ScreenState.ReadyForArtifactOcr.Should().BeTrue();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("CelestialGift");
        artifact.SlotKey.Should().Be("flower");
        artifact.MainStatKey.Should().Be("hp");
        artifact.Level.Should().Be(20);
        artifact.Lock.Should().BeTrue();
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "critRate_", Value = 10.5m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "enerRech_", Value = 6.5m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "def", Value = 23m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "hp_", Value = 16.3m });
    }

    [TestMethod]
    public void ParseFile_EquippedPlus20ScreenshotReadsRightPanel()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);

        ScanResult result = parser.ParseFile(GetScreenshotPath("artifact-inventory-plus20.jpg"));

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("equipped-character-panel");
        result.ScreenState.Should().NotBeNull();
        result.ScreenState!.Code.Should().Be(ScreenStateCodes.CharacterArtifactDetail);
        result.ScreenState.ReadyForArtifactOcr.Should().BeTrue();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("CelestialGift");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(20);
        artifact.Lock.Should().BeTrue();
        artifact.Location.Should().Be("Nicole");
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "enerRech_", Value = 17.5m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "critDMG_", Value = 5.4m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "eleMas", Value = 44m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "critRate_", Value = 5.8m });
    }

    [TestMethod]
    public void ParseFile_EquippedUnactivatedScreenshotPreservesInactiveSubstat()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);

        ScanResult result = parser.ParseFile(GetScreenshotPath("artifact-inventory-unactivated.jpg"));

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("equipped-character-panel");
        result.ScreenState.Should().NotBeNull();
        result.ScreenState!.Code.Should().Be(ScreenStateCodes.CharacterArtifactDetail);
        result.ScreenState.ReadyForArtifactOcr.Should().BeTrue();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("CelestialGift");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(0);
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "enerRech_", Value = 4.5m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "def", Value = 19m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "def_", Value = 5.1m });
        artifact.UnactivatedSubstats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "critDMG_", Value = 5.4m });
    }

    private static string GetScreenshotPath(string fileName)
    {
        DirectoryInfo? directory = new(AppContext.BaseDirectory);
        while (directory is not null)
        {
            string candidate = Path.Combine(directory.FullName, "data", "fixtures", "screenshots", fileName);
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find screenshot fixture: {fileName}");
    }
}
