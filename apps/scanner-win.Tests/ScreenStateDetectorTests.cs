using System.Drawing;
using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ScreenStateDetectorTests
{
    [TestMethod]
    public void Detect_TealCharacterPanelYY0600ReturnsReadyCharacterDetail()
    {
        string path = FindRepoFile("data", "log-manual", "bug_new_2", "GenshinImpact_yY0600CANu.png");
        using Bitmap screenshot = new(path);

        ScreenStateInfo state = ScreenStateDetector.Detect(screenshot);

        state.Code.Should().Be(ScreenStateCodes.CharacterArtifactDetail);
        state.ReadyForArtifactOcr.Should().BeTrue();
    }

    [TestMethod]
    public void Detect_TealCharacterPanelG2ZhtL0vyoReturnsReadyCharacterDetail()
    {
        string path = FindRepoFile("data", "log-manual", "bug_new_2", "GenshinImpact_G2ZhtL0vyo.png");
        using Bitmap screenshot = new(path);

        ScreenStateInfo state = ScreenStateDetector.Detect(screenshot);

        state.Code.Should().Be(ScreenStateCodes.CharacterArtifactDetail);
        state.ReadyForArtifactOcr.Should().BeTrue();
    }

    private static string FindRepoFile(params string[] parts)
    {
        DirectoryInfo? directory = new(AppContext.BaseDirectory);
        while (directory is not null)
        {
            string candidate = Path.Combine(new[] { directory.FullName }.Concat(parts).ToArray());
            if (File.Exists(candidate)) return candidate;
            directory = directory.Parent;
        }
        throw new FileNotFoundException($"Could not find repo file: {Path.Combine(parts)}");
    }

    // Regression: Celestial Gift plume/sands artifacts have a blue-toned title bar that
    // fails bagTitleOrange > 0.45, causing the bag panel to be misclassified as
    // CharacterArtifactDetail. Fixed by adding bagPanelBeige > 0.40 as a fallback.
    [TestMethod]
    public void Detect_CelestialGiftPlumeHAIReturnsArtifactBagDetail()
    {
        string path = FindRepoFile("data", "log-manual", "bug_new_3", "GenshinImpact_HAIpmnQiCp.jpg");
        using Bitmap screenshot = new(path);

        ScreenStateInfo state = ScreenStateDetector.Detect(screenshot);

        state.Code.Should().Be(ScreenStateCodes.ArtifactBagDetail);
        state.ReadyForArtifactOcr.Should().BeTrue();
    }

    [TestMethod]
    public void Detect_CelestialGiftSandsSixfiveReturnsArtifactBagDetail()
    {
        string path = FindRepoFile("data", "log-manual", "bug_new_3", "GenshinImpact_S6f5iqBq6i.jpg");
        using Bitmap screenshot = new(path);

        ScreenStateInfo state = ScreenStateDetector.Detect(screenshot);

        state.Code.Should().Be(ScreenStateCodes.ArtifactBagDetail);
        state.ReadyForArtifactOcr.Should().BeTrue();
    }

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
