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
