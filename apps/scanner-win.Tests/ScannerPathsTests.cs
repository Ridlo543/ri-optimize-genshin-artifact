using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ScannerPathsTests
{
    [TestMethod]
    public void FindScreenshotFixture_ReturnsCuratedFixturePath()
    {
        string path = ScannerPaths.FindScreenshotFixture("bag-inventory-raw-1920x1200.png");

        File.Exists(path).Should().BeTrue();
        path.Should().EndWith(Path.Combine("data", "fixtures", "screenshots", "bag-inventory-raw-1920x1200.png"));
    }

    [TestMethod]
    public void FindScreenshotFixture_ReturnsExamplePicturePath()
    {
        string path = ScannerPaths.FindScreenshotFixture("GenshinImpact_lKJAl1Pymu.jpg");

        File.Exists(path).Should().BeTrue();
        path.Should().EndWith(Path.Combine("data", "example", "picture", "GenshinImpact_lKJAl1Pymu.jpg"));
    }

    [TestMethod]
    public void FindScreenshotFixture_ReturnsManualLogPath()
    {
        string path = ScannerPaths.FindScreenshotFixture("error_artifact_bag_detail_1.png");

        File.Exists(path).Should().BeTrue();
        path.Should().EndWith(Path.Combine("data", "log-manual", "error_artifact_bag_detail_1.png"));
    }

    [TestMethod]
    public void FindScreenshotFixture_RejectsDirectoryTraversal()
    {
        Action act = () => ScannerPaths.FindScreenshotFixture(@"..\artifact.json");

        act.Should().Throw<ArgumentException>()
            .WithMessage("Fixture name must not contain directory separators.*");
    }

    [TestMethod]
    public void CreateScannerLogPaths_ReturnsStableLastAndUniqueSnapshotPaths()
    {
        ScannerLogPaths first = ScannerPaths.CreateScannerLogPaths("region");
        ScannerLogPaths second = ScannerPaths.CreateScannerLogPaths("region");

        first.ScanId.Should().NotBeNullOrWhiteSpace();
        second.ScanId.Should().NotBe(first.ScanId);
        first.LastSourcePath.Should().EndWith(Path.Combine("logs", "scanner", "region-source-last.png"));
        first.LastRegionPath.Should().EndWith(Path.Combine("logs", "scanner", "region-last.png"));
        first.SnapshotSourcePath.Should().Contain(Path.Combine("logs", "scanner", "captures"));
        first.SnapshotRegionPath.Should().Contain(first.ScanId);
    }
}
