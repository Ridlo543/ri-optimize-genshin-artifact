using System.Drawing;
using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ScreenStateDetectorTests
{
    [TestMethod]
    public void Detect_Live1280GridReturnsArtifactBagGrid()
    {
        using Bitmap screenshot = new(GetScreenshotPath("bag-grid-live-1280x800.png"));

        ScreenStateInfo state = ScreenStateDetector.Detect(screenshot);

        state.Code.Should().Be(ScreenStateCodes.ArtifactBagGrid);
        state.ReadyForArtifactOcr.Should().BeFalse();
        state.Confidence.Should().BeGreaterThan(0.5);
    }

    [TestMethod]
    public void Detect_BagDetailReturnsReadyBagDetail()
    {
        using Bitmap screenshot = new(GetScreenshotPath("bag-inventory-raw-1920x1200.png"));

        ScreenStateInfo state = ScreenStateDetector.Detect(screenshot);

        state.Code.Should().Be(ScreenStateCodes.ArtifactBagDetail);
        state.ReadyForArtifactOcr.Should().BeTrue();
    }

    [TestMethod]
    public void Detect_EquippedArtifactReturnsReadyCharacterDetail()
    {
        using Bitmap screenshot = new(GetScreenshotPath("artifact-inventory-plus20.jpg"));

        ScreenStateInfo state = ScreenStateDetector.Detect(screenshot);

        state.Code.Should().Be(ScreenStateCodes.CharacterArtifactDetail);
        state.ReadyForArtifactOcr.Should().BeTrue();
    }

    [TestMethod]
    public void ParseFile_Live1280GridReturnsNoArtifactWithoutOcrFields()
    {
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);

        ScanResult result = parser.ParseFile(GetScreenshotPath("bag-grid-live-1280x800.png"));

        result.Artifact.Should().BeNull();
        result.ScreenState.Should().NotBeNull();
        result.ScreenState!.Code.Should().Be(ScreenStateCodes.ArtifactBagGrid);
        result.ScreenState.ReadyForArtifactOcr.Should().BeFalse();
        result.Error.Should().Be(result.ScreenState.Message);
        result.Diagnostics!.RawText.Should().BeEmpty();
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
