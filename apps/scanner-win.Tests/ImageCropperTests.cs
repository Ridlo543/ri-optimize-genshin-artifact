using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Drawing;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ImageCropperTests
{
    [TestMethod]
    public void Scale_At16x10Native_ReturnsExactPixelCoordinates()
    {
        RectangleF normalized = new(1463f / 1920f, 119f / 1200f, 420f / 1920f, 60f / 1200f);

        Rectangle result = ImageCropper.Scale(normalized, 1920, 1200);

        result.X.Should().Be(1463);
        result.Y.Should().Be(119);
        result.Width.Should().Be(420);
        result.Height.Should().Be(60);
    }

    [TestMethod]
    public void Scale_At16x10Halved_ReturnsHalvedCoordinates()
    {
        RectangleF normalized = new(1463f / 1920f, 119f / 1200f, 420f / 1920f, 60f / 1200f);

        Rectangle result = ImageCropper.Scale(normalized, 960, 600);

        result.X.Should().Be(732);
        result.Y.Should().Be(60);
        result.Width.Should().Be(210);
        result.Height.Should().Be(30);
    }

    [TestMethod]
    public void Scale_At16x10Doubled_ReturnsDoubledCoordinates()
    {
        RectangleF normalized = new(1463f / 1920f, 119f / 1200f, 420f / 1920f, 60f / 1200f);

        Rectangle result = ImageCropper.Scale(normalized, 3840, 2400);

        result.X.Should().Be(2926);
        result.Y.Should().Be(238);
        result.Width.Should().Be(840);
        result.Height.Should().Be(120);
    }

    [TestMethod]
    public void Scale_At16x9SameWidth_DifferentHeight()
    {
        RectangleF normalized = new(1463f / 1920f, 119f / 1200f, 420f / 1920f, 60f / 1200f);

        Rectangle result = ImageCropper.Scale(normalized, 1920, 1080);

        result.X.Should().Be(1463);
        result.Y.Should().Be(107);
        result.Width.Should().Be(420);
        result.Height.Should().Be(54);
    }

    [TestMethod]
    public void Scale_NormalizedUnitSquare_FillsEntireImage()
    {
        RectangleF normalized = new(0, 0, 1, 1);

        Rectangle result = ImageCropper.Scale(normalized, 800, 600);

        result.X.Should().Be(0);
        result.Y.Should().Be(0);
        result.Width.Should().Be(800);
        result.Height.Should().Be(600);
    }

    [TestMethod]
    public void Scale_ZeroWidthHeight_ReturnsZeroDimensions()
    {
        RectangleF normalized = new(0.5f, 0.5f, 0, 0);

        Rectangle result = ImageCropper.Scale(normalized, 1920, 1200);

        result.X.Should().Be(960);
        result.Y.Should().Be(600);
        result.Width.Should().Be(0);
        result.Height.Should().Be(0);
    }
}
