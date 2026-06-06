using System.Drawing;
using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ArtifactRegionParserTests
{
    private static readonly ScanRegion BagCardRegion = new()
    {
        X = 1308.0 / 1920.0,
        Y = 120.0 / 1200.0,
        Width = 494.0 / 1920.0,
        Height = 962.0 / 1200.0,
        Unit = "normalized-client"
    };

    private static readonly ScanRegion CharacterPanelRegion = new()
    {
        X = 1452.0 / 1920.0,
        Y = 90.0 / 1200.0,
        Width = 466.0 / 1920.0,
        Height = 1000.0 / 1200.0,
        Unit = "normalized-client"
    };

    [TestMethod]
    public void ParseFile_BagCardRegionReadsArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(GetScreenshotPath("bag-inventory-raw-1920x1200.png"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-bag-card");
        result.Capture.RegionHash.Should().NotBeNullOrWhiteSpace();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("CelestialGift");
        artifact.SlotKey.Should().Be("flower");
        artifact.MainStatKey.Should().Be("hp");
        artifact.Level.Should().Be(20);
        artifact.Substats.Should().ContainEquivalentOf(new GoodSubstat { Key = "critRate_", Value = 10.5m });
    }

    [TestMethod]
    public void ParseFile_CharacterRegionReadsEquippedArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(GetScreenshotPath("artifact-inventory-plus20.jpg"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-character-panel");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("CelestialGift");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(20);
        artifact.Location.Should().Be("Nicole");
    }

    [TestMethod]
    public void ParseFile_CharacterRegionPreservesUnactivatedSubstat()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(GetScreenshotPath("artifact-inventory-unactivated.jpg"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        result.Artifact!.UnactivatedSubstats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "critDMG_", Value = 5.4m });
    }

    [TestMethod]
    public void ParseFile_ExampleCharacterPlus20ReadsArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("GenshinImpact_lKJAl1Pymu.jpg"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-character-panel");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("CelestialGift");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(20);
        artifact.Location.Should().Be("Nicole");
        artifact.Substats.Should().HaveCount(4);
    }

    [TestMethod]
    public void ParseFile_ExampleCharacterUnactivatedPreservesSubstat()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("GenshinImpact_oXNqhIZyXT.jpg"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        result.Artifact!.UnactivatedSubstats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "critDMG_", Value = 5.4m });
    }

    [TestMethod]
    public void ParseFile_ExampleBagPlus20ReadsArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("ArtifactsInventory1_8x5 - weight 0.png"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-bag-card");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("CelestialGift");
        artifact.SlotKey.Should().Be("flower");
        artifact.MainStatKey.Should().Be("hp");
        artifact.Level.Should().Be(20);
        artifact.Substats.Should().HaveCount(4);
    }

    [TestMethod]
    public void ParseFile_ExampleBagRoyalFloraPreservesUnactivatedSubstat()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("ArtifactsInventory40_8x5 - weight 0.png"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-bag-card");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("NoblesseOblige");
        artifact.SlotKey.Should().Be("flower");
        artifact.Rarity.Should().Be(5);
        artifact.MainStatKey.Should().Be("hp");
        artifact.Level.Should().Be(0);
        artifact.Substats.Should().HaveCount(3);
        artifact.UnactivatedSubstats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "enerRech_", Value = 5.2m });
    }

    [TestMethod]
    public void ParseBitmap_WhenOnlyLevelMissing_ReturnsArtifactDraft()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);
        using Bitmap screenshot = new(ScannerPaths.FindScreenshotFixture("ArtifactsInventory40_8x5 - weight 0.png"));
        Rectangle card = ScanRegionParser.ToRectangle(BagCardRegion, screenshot);
        using (Graphics graphics = Graphics.FromImage(screenshot))
        {
            graphics.FillRectangle(Brushes.Beige, card.X + 31, card.Y + 312, 69, 33);
        }

        ScanResult result = parser.ParseBitmap(screenshot, BagCardRegion, "fixture", "region-artifact");

        result.Artifact.Should().BeNull();
        result.MissingFields.Should().Equal("level");
        result.ArtifactDraft.Should().NotBeNull();
        result.ArtifactDraft!.SetKey.Should().Be("NoblesseOblige");
        result.ArtifactDraft.SlotKey.Should().Be("flower");
        result.ArtifactDraft.Rarity.Should().Be(5);
        result.ArtifactDraft.Level.Should().BeNull();
        result.ArtifactDraft.Substats.Should().NotBeEmpty();
    }

    [TestMethod]
    public void ParseFile_ExampleBagInstructorFourStarReadsArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("ArtifactsInventory45_8x5 - weight 0.png"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-bag-card");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("Instructor");
        artifact.SlotKey.Should().Be("plume");
        artifact.MainStatKey.Should().Be("atk");
        artifact.Level.Should().Be(0);
        artifact.Rarity.Should().Be(4);
        artifact.Substats.Should().HaveCount(2);
        artifact.UnactivatedSubstats.Should().BeEmpty();
    }

    [TestMethod]
    public void ParseFile_ExampleBagAdventurerTwoStarReadsArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("GenshinImpact_2star.jpg"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-bag-card");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("Adventurer");
        artifact.SlotKey.Should().Be("plume");
        artifact.MainStatKey.Should().Be("atk");
        artifact.Level.Should().Be(0);
        artifact.Rarity.Should().Be(2);
        artifact.Substats.Should().BeEmpty();
        artifact.Location.Should().Be("Amber");
    }

    [TestMethod]
    public void ParseFile_ExampleBagTravelingDoctorThreeStarReadsArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("GenshinImpact_3star.png"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-bag-card");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("TravelingDoctor");
        artifact.SlotKey.Should().Be("plume");
        artifact.MainStatKey.Should().Be("atk");
        artifact.Level.Should().Be(0);
        artifact.Rarity.Should().Be(3);
        artifact.Substats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "atk_", Value = 2.8m });
        artifact.Location.Should().Be("Xiangling");
    }

    [TestMethod]
    public void ParseFile_ManualCharacterLongTitleReadsArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("success_artifact_character_detail_1.png"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().Be("roi-character-panel-merged");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("ObsidianCodex");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(20);
        artifact.Substats.Should().HaveCount(4);
    }

    [TestMethod]
    public void ParseFile_ManualCharacterUnknownSetDoesNotBlockArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("error_artifact_character_detail_1.png"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.OptionalWarnings.Should().Contain("Set name was not recognized. Upgrade-roll analysis can still continue.");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().BeNull();
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("enerRech_");
        artifact.Level.Should().Be(20);
        artifact.Substats.Should().HaveCount(4);
    }

    [TestMethod]
    public void ParseFile_ManualBagDisenchantmentReadsSetFromGreenLine()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("error_artifact_bag_detail_1.png"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        result.Artifact!.SetKey.Should().Be("DisenchantmentInDeepShadow");
        result.Artifact.SlotKey.Should().Be("flower");
        result.Artifact.UnactivatedSubstats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "critDMG_", Value = 7.0m });
    }

    [TestMethod]
    public void ParseFile_ManualCharacterBorderlineRedPanelReadsArtifact()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("error_artifact_character_detail_2.png"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.Capture.Layout.Should().StartWith("roi-character-panel");
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("ObsidianCodex");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(20);
        artifact.Substats.Should().HaveCount(4);
    }

    [TestMethod]
    public void ParseFile_ManualCharacterElementalMasteryReadsFourSubstats()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("error_artifact_character_detail_3.png"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("NoblesseOblige");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("eleMas");
        artifact.Level.Should().Be(20);
        artifact.Substats.Should().BeEquivalentTo(new[]
        {
            new GoodSubstat { Key = "atk_", Value = 5.8m },
            new GoodSubstat { Key = "critDMG_", Value = 35.8m },
            new GoodSubstat { Key = "critRate_", Value = 3.5m },
            new GoodSubstat { Key = "enerRech_", Value = 12.3m }
        }, options => options.WithStrictOrdering());
    }

    [TestMethod]
    public void ParseFile_ManualCharacterLongTitleDoesNotReadStarCountAsLevel()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("error_artifact_character_detail_4.png"), CharacterPanelRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("ObsidianCodex");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(0);
        artifact.Substats.Should().HaveCount(3);
        artifact.UnactivatedSubstats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "def", Value = 21m });
    }

    [TestMethod]
    public void ParseFile_ManualBagFlowerKeepsFlatHpMainStat()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("error_artifact_bag_detail_2.png"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("DisenchantmentInDeepShadow");
        artifact.SlotKey.Should().Be("flower");
        artifact.MainStatKey.Should().Be("hp");
        artifact.Level.Should().Be(0);
        artifact.Substats.Should().HaveCount(3);
        artifact.UnactivatedSubstats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "critDMG_", Value = 7.0m });
    }

    [TestMethod]
    public void ParseFile_ManualBagAtkSandsReadsAllFieldsWithoutCorrection()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("GenshinImpact_WGHmIpkN58.jpg"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("ObsidianCodex");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(20);
        artifact.Substats.Should().BeEquivalentTo(new[]
        {
            new GoodSubstat { Key = "critRate_", Value = 6.6m },
            new GoodSubstat { Key = "hp_", Value = 9.3m },
            new GoodSubstat { Key = "critDMG_", Value = 15.5m },
            new GoodSubstat { Key = "def", Value = 42m }
        }, options => options.WithStrictOrdering());
    }

    [TestMethod]
    public void ParseFile_ManualBagUnactivatedAtkSandsReadsAllFieldsWithoutCorrection()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("GenshinImpact_zuCNecgQiu.jpg"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("DisenchantmentInDeepShadow");
        artifact.SlotKey.Should().Be("sands");
        artifact.MainStatKey.Should().Be("atk_");
        artifact.Level.Should().Be(0);
        artifact.Substats.Should().BeEquivalentTo(new[]
        {
            new GoodSubstat { Key = "hp", Value = 239m },
            new GoodSubstat { Key = "critDMG_", Value = 7.8m },
            new GoodSubstat { Key = "atk", Value = 14m }
        }, options => options.WithStrictOrdering());
        artifact.UnactivatedSubstats.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new GoodSubstat { Key = "def_", Value = 5.1m });
    }

    [TestMethod]
    public void ParseFile_ManualBagFlowerWithVisibleAssistantReadsAllFieldsWithoutCorrection()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);

        ScanResult result = parser.ParseFile(ScannerPaths.FindScreenshotFixture("iTPXIcUjaV.png"), BagCardRegion);

        result.Error.Should().BeNull();
        result.Artifact.Should().NotBeNull();
        GoodArtifact artifact = result.Artifact!;
        artifact.SetKey.Should().Be("CelestialGift");
        artifact.SlotKey.Should().Be("flower");
        artifact.MainStatKey.Should().Be("hp");
        artifact.Level.Should().Be(20);
        artifact.Substats.Should().BeEquivalentTo(new[]
        {
            new GoodSubstat { Key = "critRate_", Value = 10.5m },
            new GoodSubstat { Key = "enerRech_", Value = 6.5m },
            new GoodSubstat { Key = "def", Value = 23m },
            new GoodSubstat { Key = "hp_", Value = 16.3m }
        }, options => options.WithStrictOrdering());
    }

    [TestMethod]
    public void ParseBitmap_RecordsOcclusionAvoidedFlag()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);
        using Bitmap screenshot = new(ScannerPaths.FindScreenshotFixture("error_artifact_bag_detail_1.png"));

        ScanResult result = parser.ParseBitmap(screenshot, BagCardRegion, "screen", "region-artifact", occlusionAvoided: true);

        result.Capture.OcclusionAvoided.Should().BeTrue();
    }

    [TestMethod]
    public void Parse_RejectsRegionOutsideNormalizedClientBounds()
    {
        Action act = () => ScanRegionParser.Parse("""{"x":0.9,"y":0.1,"width":0.2,"height":0.2,"unit":"normalized-client"}""");

        act.Should().Throw<ArgumentException>()
            .WithMessage("Region must stay within normalized client bounds.*");
    }

    [TestMethod]
    public void ClassifyFile_RegionHashChangesWhenRegionChanges()
    {
        ScanRegion shiftedRegion = new()
        {
            X = BagCardRegion.X + 0.01,
            Y = BagCardRegion.Y,
            Width = BagCardRegion.Width,
            Height = BagCardRegion.Height,
            Unit = "normalized-client"
        };

        ScanResult first = ArtifactRegionParser.ClassifyFile(GetScreenshotPath("bag-inventory-raw-1920x1200.png"), BagCardRegion);
        ScanResult second = ArtifactRegionParser.ClassifyFile(GetScreenshotPath("bag-inventory-raw-1920x1200.png"), shiftedRegion);

        first.Capture.RegionHash.Should().NotBeNullOrWhiteSpace();
        second.Capture.RegionHash.Should().NotBe(first.Capture.RegionHash);
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
