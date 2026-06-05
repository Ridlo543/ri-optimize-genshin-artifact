using System.Drawing;
using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Tesseract;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ArtifactOcrFixtureTests
{
    [TestMethod]
    public void ParseFixtureArtifact_Artifact0SubstatsMatchExpected()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);

        FixtureArtifactParseResult result = parser.Parse(GetFixtureFolder("artifact0"));

        result.Passed.Should().BeTrue(string.Join(Environment.NewLine, result.Mismatches));
        result.Actual.Substats.Should().HaveCount(4);
        result.Actual.UnactivatedSubstats.Should().BeEmpty();
        result.Actual.Confidence.Should().BeGreaterThan(0.5);
    }

    [TestMethod]
    public void ParseFixtureArtifact_Artifact1000UnactivatedSubstatMatchesExpected()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);

        FixtureArtifactParseResult result = parser.Parse(GetFixtureFolder("artifact1000"));

        result.Passed.Should().BeTrue(string.Join(Environment.NewLine, result.Mismatches));
        result.Actual.Substats.Should().HaveCount(3);
        result.Actual.UnactivatedSubstats.Should().ContainSingle();
        result.Actual.UnactivatedSubstats[0].Key.Should().Be("atk_");
        result.Actual.Confidence.Should().BeGreaterThan(0.5);
    }

    [TestMethod]
    public void ParseFixtureCard_Artifact0AssemblesFullCard()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);

        FixtureCardParseResult result = parser.ParseCard(GetFixtureFolder("artifact0"));

        result.Passed.Should().BeTrue(string.Join(Environment.NewLine, result.Mismatches));
        result.ScanResult.Artifact.Should().NotBeNull();
        result.ScanResult.Artifact!.SlotKey.Should().Be("flower");
        result.ScanResult.Artifact.MainStatKey.Should().Be("hp");
        result.ScanResult.Artifact.Level.Should().Be(20);
        result.ScanResult.Artifact.Lock.Should().BeTrue();
    }

    [TestMethod]
    public void ParseFixtureCard_Artifact1000PreservesUnactivatedSubstat()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);

        FixtureCardParseResult result = parser.ParseCard(GetFixtureFolder("artifact1000"));

        result.Passed.Should().BeTrue(string.Join(Environment.NewLine, result.Mismatches));
        result.ScanResult.Artifact.Should().NotBeNull();
        result.ScanResult.Artifact!.SlotKey.Should().Be("plume");
        result.ScanResult.Artifact.MainStatKey.Should().Be("atk");
        result.ScanResult.Artifact.UnactivatedSubstats.Should().ContainSingle();
    }

    [TestMethod]
    public void ParseFixtureCard_Artifact1042ReadsEquippedLocation()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);

        FixtureCardParseResult result = parser.ParseCard(GetFixtureFolder("artifact1042"));

        result.Passed.Should().BeTrue(string.Join(Environment.NewLine, result.Mismatches));
        result.ScanResult.Artifact.Should().NotBeNull();
        result.ScanResult.Artifact!.Location.Should().Be("Layla");
    }

    [TestMethod]
    public void ParseFixtureCard_Artifact1082ReadsUnlockedState()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);

        FixtureCardParseResult result = parser.ParseCard(GetFixtureFolder("artifact1082"));

        result.Passed.Should().BeTrue(string.Join(Environment.NewLine, result.Mismatches));
        result.ScanResult.Artifact.Should().NotBeNull();
        result.ScanResult.Artifact!.Lock.Should().BeFalse();
    }

    [TestMethod]
    [DataRow("artifact0")]
    [DataRow("artifact1000")]
    [DataRow("artifact1021")]
    [DataRow("artifact1027")]
    [DataRow("artifact1035")]
    [DataRow("artifact1042")]
    [DataRow("artifact1066")]
    [DataRow("artifact1082")]
    [DataRow("artifact1743")]
    [DataRow("artifact513")]
    public void ParseFixtureCard_CuratedFixturesMatchExpectedArtifactJson(string fixtureName)
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);

        FixtureCardParseResult result = parser.ParseCard(GetFixtureFolder(fixtureName));

        result.Passed.Should().BeTrue(string.Join(Environment.NewLine, result.Mismatches));
    }

    [TestMethod]
    public void ReadText_MissingTessdataThrowsStructuredOcrUnavailableException()
    {
        string missingTessdata = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        using Bitmap bitmap = new(4, 4);
        using OcrTextReader reader = new(missingTessdata);

        Action act = () => reader.ReadText(bitmap, PageSegMode.Auto);

        act.Should().Throw<OcrUnavailableException>()
            .WithMessage("Missing OCR traineddata:*");
    }

    private static string GetFixtureFolder(string fixtureName)
    {
        DirectoryInfo? directory = new(AppContext.BaseDirectory);
        while (directory is not null)
        {
            string candidate = Path.Combine(directory.FullName, "data", "fixtures", "artifacts", fixtureName);
            if (Directory.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException($"Could not find fixture folder for {fixtureName}.");
    }
}
