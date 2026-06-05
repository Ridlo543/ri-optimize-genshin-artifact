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
    public void FindScreenshotFixture_RejectsDirectoryTraversal()
    {
        Action act = () => ScannerPaths.FindScreenshotFixture(@"..\artifact.json");

        act.Should().Throw<ArgumentException>()
            .WithMessage("Fixture name must not contain directory separators.*");
    }
}
