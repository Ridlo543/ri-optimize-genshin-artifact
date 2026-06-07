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

    [TestMethod]
    public void ParseFile_TealCharacterPanelYY0600CANuDetectsCharacterArtifactDetail()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);

        ScanResult result = parser.ParseFile(GetRepoFilePath("data", "log-manual", "bug_new_2", "GenshinImpact_yY0600CANu.png"));

        result.ScreenState.Should().NotBeNull();
        result.ScreenState!.Code.Should().Be(ScreenStateCodes.CharacterArtifactDetail);
        result.ScreenState.ReadyForArtifactOcr.Should().BeTrue();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SlotKey.Should().Be("goblet");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(20);
        artifact.Location.Should().Be("Prune");
    }

    [TestMethod]
    public void ParseFile_TealCharacterPanelG2ZhtL0vyoDetectsCharacterArtifactDetail()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);

        ScanResult result = parser.ParseFile(GetRepoFilePath("data", "log-manual", "bug_new_2", "GenshinImpact_G2ZhtL0vyo.png"));

        result.ScreenState.Should().NotBeNull();
        result.ScreenState!.Code.Should().Be(ScreenStateCodes.CharacterArtifactDetail);
        result.ScreenState.ReadyForArtifactOcr.Should().BeTrue();
    }

    [TestMethod]
    public void ParseFile_ManualCharacterLongTitleGobletDoesNotNeedManualCorrection()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);

        ScanResult result = parser.ParseFile(GetRepoFilePath("data", "log-manual", "bug_new_1", "GenshinImpact_elLulJBWJW.png"));

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("equipped-character-panel-merged");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SlotKey.Should().Be("goblet");
        artifact.MainStatKey.Should().Be("def_");
        artifact.Level.Should().Be(20);
        artifact.Location.Should().Be("Linnea");
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "atk_", Value = 11.1m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "enerRech_", Value = 5.2m });
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "critDMG_", Value = 25.7m });
    }

    private static string GetScreenshotPath(string fileName)
    {
        return GetRepoFilePath("data", "fixtures", "screenshots", fileName);
    }

    private static string GetRepoFilePath(params string[] relativeParts)
    {
        DirectoryInfo? directory = new(AppContext.BaseDirectory);
        while (directory is not null)
        {
            string candidate = Path.Combine(new[] { directory.FullName }.Concat(relativeParts).ToArray());
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find repo file: {Path.Combine(relativeParts)}");
    }
}
