using System.Globalization;
using System.Text.RegularExpressions;

namespace GenshinArtifactScanner.Win;

internal sealed class ParsedSubstats
{
    public required List<GoodSubstat> Substats { get; init; }

    public required List<GoodSubstat> UnactivatedSubstats { get; init; }

    public required double Confidence { get; init; }
}

internal static partial class SubstatTextParser
{
    public static ParsedSubstats ParseText(string text)
    {
        ArgumentNullException.ThrowIfNull(text);

        bool hasUnactivated = text.Contains("(unactivated)", StringComparison.OrdinalIgnoreCase);
        List<string> lines = text
            .Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        int setBonusStart = lines.FindIndex(IsSetBonusLine);
        if (setBonusStart >= 0)
        {
            lines.RemoveRange(setBonusStart, lines.Count - setBonusStart);
        }

        ParsedSubstats parsed = ParseLines(lines);
        if (hasUnactivated && parsed.UnactivatedSubstats.Count == 0 && parsed.Substats.Count > 0)
        {
            GoodSubstat last = parsed.Substats[^1];
            parsed.Substats.RemoveAt(parsed.Substats.Count - 1);
            parsed.UnactivatedSubstats.Insert(0, last);
        }

        return parsed;
    }

    public static ParsedSubstats ParseLines(IEnumerable<string> lines)
    {
        ArgumentNullException.ThrowIfNull(lines);

        List<GoodSubstat> active = [];
        List<GoodSubstat> unactivated = [];
        int attempted = 0;
        int parsed = 0;

        foreach (string rawLine in lines)
        {
            string line = NormalizeLine(rawLine);
            if (line.Length == 0)
            {
                continue;
            }

            attempted++;
            Match match = SubstatLineRegex().Match(line);
            if (!match.Success)
            {
                continue;
            }

            string label = NormalizeLabel(match.Groups["label"].Value);
            bool isPercent = match.Groups["percent"].Value == "%";
            string? key = ToGoodStatKey(label, isPercent);
            if (key is null)
            {
                continue;
            }

            string rawValue = match.Groups["value"].Value;
            if (!decimal.TryParse(rawValue, NumberStyles.Number, CultureInfo.InvariantCulture, out decimal value))
            {
                continue;
            }

            if (key.EndsWith('_') && !rawValue.Contains('.', StringComparison.Ordinal))
            {
                value /= 10m;
            }

            GoodSubstat substat = new() { Key = key, Value = value };
            if (line.Contains("(unactivated)", StringComparison.OrdinalIgnoreCase))
            {
                unactivated.Add(substat);
            }
            else
            {
                active.Add(substat);
            }

            parsed++;
        }

        return new ParsedSubstats
        {
            Substats = active,
            UnactivatedSubstats = unactivated,
            Confidence = attempted == 0 ? 0 : parsed / (double)attempted
        };
    }

    private static string NormalizeLine(string line)
    {
        string normalized = line
            .Replace("•", string.Empty, StringComparison.Ordinal)
            .Replace("*", string.Empty, StringComparison.Ordinal)
            .Replace("#", "+", StringComparison.Ordinal)
            .Replace("“", string.Empty, StringComparison.Ordinal)
            .Replace("”", string.Empty, StringComparison.Ordinal)
            .Replace("\"", string.Empty, StringComparison.Ordinal)
            .Replace(" ", string.Empty, StringComparison.Ordinal)
            .Trim();
        return Regex.Replace(normalized, @"^[^A-Za-z]+", string.Empty);
    }

    private static string NormalizeLabel(string label)
    {
        return Regex.Replace(label, @"[^A-Za-z]+", string.Empty).ToLowerInvariant();
    }

    private static string? ToGoodStatKey(string label, bool isPercent)
    {
        return label switch
        {
            "hp" => isPercent ? "hp_" : "hp",
            "atk" => isPercent ? "atk_" : "atk",
            "def" => isPercent ? "def_" : "def",
            "energyrecharge" => "enerRech_",
            "elementalmastery" => "eleMas",
            "critrate" => "critRate_",
            "critdmg" or "criticaldamage" => "critDMG_",
            _ => null
        };
    }

    [GeneratedRegex(@"^(?<label>[A-Za-z ]+?)\s*\+?\s*(?<value>\d+(?:\.\d+)?)\s*(?<percent>%?)\s*(?:\((?:unactivated)\))?$", RegexOptions.IgnoreCase)]
    private static partial Regex SubstatLineRegex();

    private static bool IsSetBonusLine(string line)
    {
        string trimmed = line.Trim();
        return Regex.IsMatch(trimmed, @"(piece|set|2-)", RegexOptions.IgnoreCase)
            || Regex.IsMatch(trimmed, @"^[A-Za-z\s]+:$");
    }
}
