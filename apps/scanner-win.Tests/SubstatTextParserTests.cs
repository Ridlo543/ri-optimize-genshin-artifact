using FluentAssertions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GenshinArtifactScanner.Win.Tests;

[TestClass]
public sealed class SubstatTextParserTests
{
    [TestMethod]
    public void ParseLines_ParsesArtifact0ActiveSubstats()
    {
        string[] lines =
        [
            "CRIT Rate+10.5%",
            "Energy Recharge+6.5%",
            "DEF+23",
            "HP+16.3%"
        ];

        ParsedSubstats result = SubstatTextParser.ParseLines(lines);

        result.UnactivatedSubstats.Should().BeEmpty();
        result.Substats.Should().HaveCount(4);
        result.Substats[0].Key.Should().Be("critRate_");
        result.Substats[0].Value.Should().Be(10.5m);
        result.Substats[1].Key.Should().Be("enerRech_");
        result.Substats[2].Key.Should().Be("def");
        result.Substats[3].Key.Should().Be("hp_");
        result.Confidence.Should().Be(1);
    }

    [TestMethod]
    public void ParseLines_ParsesArtifact1000UnactivatedSubstat()
    {
        string[] lines =
        [
            "DEF+23",
            "HP+299",
            "CRIT Rate+3.5%",
            "ATK+4.1% (unactivated)"
        ];

        ParsedSubstats result = SubstatTextParser.ParseLines(lines);

        result.Substats.Should().HaveCount(3);
        result.UnactivatedSubstats.Should().ContainSingle();
        result.UnactivatedSubstats[0].Key.Should().Be("atk_");
        result.UnactivatedSubstats[0].Value.Should().Be(4.1m);
        result.Confidence.Should().Be(1);
    }

    [TestMethod]
    public void SampleScanResult_IncludesExpandedConfidenceFields()
    {
        ScanResult result = SampleScanResult.Create();

        result.Confidence.SetKey.Should().BeGreaterThan(0);
        result.Confidence.SlotKey.Should().BeGreaterThan(0);
        result.Confidence.MainStatKey.Should().BeGreaterThan(0);
        result.Confidence.Level.Should().BeGreaterThan(0);
        result.Confidence.Substats.Should().BeGreaterThan(0);
        result.Confidence.Lock.Should().BeGreaterThan(0);
        result.Confidence.Equipped.Should().BeGreaterThan(0);
        result.Confidence.Location.Should().BeGreaterThan(0);
    }
}
