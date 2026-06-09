using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class ArtifactTextParserTests
{
    [TestMethod]
    public void ParseSetKeyFromArtifactName_ReadsRoyalFlora()
    {
        string? setKey = ArtifactTextParser.ParseSetKeyFromArtifactName("Royal Flora");

        setKey.Should().Be("NoblesseOblige");
    }

    [TestMethod]
    public void ParseSetKeyFromArtifactName_ReadsInstructorFeatherAccessory()
    {
        string? setKey = ArtifactTextParser.ParseSetKeyFromArtifactName("Instructor's Feather Accessory");

        setKey.Should().Be("Instructor");
    }

    [TestMethod]
    public void ParseSetKeyFromArtifactName_ReadsExilesFlower()
    {
        string? setKey = ArtifactTextParser.ParseSetKeyFromArtifactName("Exile's Flower");

        setKey.Should().Be("TheExile");
    }

    [TestMethod]
    public void ParseSetKeyFromArtifactName_ReadsBerserkersBoneGoblet()
    {
        string? setKey = ArtifactTextParser.ParseSetKeyFromArtifactName("Berserker's Bone Goblet");

        setKey.Should().Be("Berserker");
    }

    [TestMethod]
    public void ParseSetKeyFromSetBonusText_ReadsDisenchantmentInDeepShadow()
    {
        string? setKey = ArtifactTextParser.ParseSetKeyFromSetBonusText(
            """
            Elemental Mastery+23
            CRIT Rate+3.1%
            Disenchantment in Deep Shadow:
            2-Piece Set: ATK +18%.
            """);

        setKey.Should().Be("DisenchantmentInDeepShadow");
    }

    [TestMethod]
    [DataRow("Af", "sands", "atk_")]
    [DataRow("Hf", "sands", "hp_")]
    [DataRow("Df", "circlet", "def_")]
    [DataRow("D", "goblet", "def_")]
    public void ParseMainStatKey_ReadsShortSlotBoundOcrFallback(string text, string slotKey, string expected)
    {
        ArtifactTextParser.ParseMainStatKey(text, slotKey).Should().Be(expected);
    }

    [TestMethod]
    [DataRow("+0", 0)]
    [DataRow("+10", 10)]
    [DataRow("+16", 16)]
    [DataRow("+2O", 20)]
    [DataRow("+l0", 10)]
    public void ParseLevel_ReadsValidArtifactLevels(string text, int expected)
    {
        int? level = ArtifactTextParser.ParseLevel(text);

        level.Should().Be(expected);
    }

    [TestMethod]
    [DataRow("+21")]
    [DataRow("191")]
    [DataRow("4")]
    [DataRow("* * wr 4")]
    [DataRow("")]
    public void ParseLevel_RejectsInvalidArtifactLevels(string text)
    {
        int? level = ArtifactTextParser.ParseLevel(text);

        level.Should().BeNull();
    }

    [TestMethod]
    [DataRow("Plume of Death", "plume")]
    [DataRow("pumeorDean", "plume")]
    [DataRow("pume or Dean", "plume")]
    [DataRow("Cone of Eonathem", "goblet")]
    [DataRow("coneeonathem", "goblet")]
    [DataRow("Goblet of Eonothem", "goblet")]
    [DataRow("Flower of Life", "flower")]
    [DataRow("Sands of Eon", "sands")]
    [DataRow("Circlet of Logos", "circlet")]
    public void ParseSlotKey_FuzzyMatchesNoisyOcr(string text, string expected)
    {
        string? slot = ArtifactTextParser.ParseSlotKey(text);

        slot.Should().Be(expected);
    }

    [TestMethod]
    [DataRow("xyzabc123")]
    [DataRow("randomgarbage")]
    [DataRow("")]
    public void ParseSlotKey_RejectsGibberish(string text)
    {
        string? slot = ArtifactTextParser.ParseSlotKey(text);

        slot.Should().BeNull();
    }
}
