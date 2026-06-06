using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ArtifactSetResolverTests
{
    [TestMethod]
    public void Resolve_PrefersSetDisplayNameForNewArtifactItem()
    {
        OcrFieldResult<string> itemName = new()
        {
            Field = "setKey",
            RawText = "Moment That Ceased Upon Waking From Grand Dreams",
            Confidence = 0.18
        };
        OcrSubstatsResult substats = new()
        {
            Substats = [],
            UnactivatedSubstats = [],
            RawText = "Elemental Mastery+23\nCRIT Rate+3.1%\nDisenchantment in Deep Shadow:\n2-Piece Set: ATK +18%.",
            Confidence = 0.74
        };

        ArtifactSetResolution result = ArtifactSetResolver.Resolve(itemName, substats);

        result.Field.Value.Should().Be("DisenchantmentInDeepShadow");
        result.Diagnostics.MatchSource.Should().Be("set-display-name");
        result.Diagnostics.RawItemName.Should().Be(itemName.RawText);
        result.Warnings.Should().BeEmpty();
    }

    [TestMethod]
    public void Resolve_UnknownSetReturnsNonBlockingWarning()
    {
        OcrFieldResult<string> itemName = new()
        {
            Field = "setKey",
            RawText = "Unknown Artifact",
            Confidence = 0.1
        };
        OcrSubstatsResult substats = new()
        {
            Substats = [],
            UnactivatedSubstats = [],
            RawText = "CRIT Rate+3.1%",
            Confidence = 0.9
        };

        ArtifactSetResolution result = ArtifactSetResolver.Resolve(itemName, substats);

        result.Field.Value.Should().BeNull();
        result.Warnings.Should().ContainSingle()
            .Which.Should().Be("Set name was not recognized. Upgrade-roll analysis can still continue.");
    }
}
