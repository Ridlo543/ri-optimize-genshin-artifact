using System.Text.RegularExpressions;

namespace GenshinArtifactScanner.Win;

internal static partial class ArtifactTextParser
{
    private static readonly Dictionary<string, string> SetDisplayNameToKey = new(StringComparer.Ordinal)
    {
        ["adaycarvedfromrisingwinds"] = "ADayCarvedFromRisingWinds",
        ["adventurer"] = "Adventurer",
        ["berserker"] = "Berserker",
        ["celestialgift"] = "CelestialGift",
        ["disenchantmentindeepshadow"] = "DisenchantmentInDeepShadow",
        ["fragmentofharmonicwhimsy"] = "FragmentOfHarmonicWhimsy",
        ["instructor"] = "Instructor",
        ["longnightsoath"] = "LongNightsOath",
        ["noblesseoblige"] = "NoblesseOblige",
        ["obsidiancodex"] = "ObsidianCodex",
        ["theexile"] = "TheExile",
        ["travelingdoctor"] = "TravelingDoctor"
    };

    private static readonly Dictionary<string, string> ArtifactNameToSetKey = new(StringComparer.Ordinal)
    {
        ["heavensentfragrance"] = "CelestialGift",
        ["heavensentdecree"] = "CelestialGift",
        ["royalflora"] = "NoblesseOblige",
        ["adventurerstailfeather"] = "Adventurer",
        ["travelingdoctorsowlfeather"] = "TravelingDoctor",
        ["instructorsfeatheraccessory"] = "Instructor",
        ["exilesflower"] = "TheExile",
        ["berserkersbonegoblet"] = "Berserker",
        ["nightingalestailfeather"] = "LongNightsOath",
        ["ahornunwinded"] = "LongNightsOath",
        ["dyedtassel"] = "LongNightsOath",
        ["mythsofthenightrealm"] = "ObsidianCodex",
        ["minnesangofloveandlament"] = "ADayCarvedFromRisingWinds",
        ["ichorshowerrhapsody"] = "FragmentOfHarmonicWhimsy"
    };

    public static string? ParseSetKeyFromArtifactName(string text)
    {
        string normalized = NormalizeText(text);
        if (ArtifactNameToSetKey.TryGetValue(normalized, out string? setKey))
        {
            return setKey;
        }

        return ArtifactNameToSetKey
            .FirstOrDefault(item => normalized.Contains(item.Key, StringComparison.Ordinal) || item.Key.Contains(normalized, StringComparison.Ordinal))
            .Value;
    }

    public static string? ParseSetKeyFromSetBonusText(string text)
    {
        ArgumentNullException.ThrowIfNull(text);

        foreach (string line in text.Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            string normalized = NormalizeText(line);
            string? match = SetDisplayNameToKey
                .FirstOrDefault(item => normalized.Contains(item.Key, StringComparison.Ordinal) || IsNearCompleteSetName(normalized, item.Key))
                .Value;
            if (!string.IsNullOrWhiteSpace(match))
            {
                return match;
            }
        }

        return null;
    }

    private static bool IsNearCompleteSetName(string normalizedText, string setKey)
    {
        return normalizedText.Length >= setKey.Length - 2 && setKey.Contains(normalizedText, StringComparison.Ordinal);
    }

    public static string? ExtractSetDisplayName(string text)
    {
        ArgumentNullException.ThrowIfNull(text);

        foreach (string line in text.Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            if (ParseSetKeyFromSetBonusText(line) is not null)
            {
                return line.Trim().TrimEnd(':').Trim();
            }
        }

        return null;
    }

    public static string? ParseSlotKey(string text)
    {
        string normalized = NormalizeText(text);
        if (normalized.Contains("floweroflife", StringComparison.Ordinal))
        {
            return "flower";
        }
        if (normalized.Contains("plumeofdeath", StringComparison.Ordinal))
        {
            return "plume";
        }
        if (normalized.Contains("sandsofeon", StringComparison.Ordinal))
        {
            return "sands";
        }
        if (normalized.Contains("gobletofeonothem", StringComparison.Ordinal))
        {
            return "goblet";
        }
        if (normalized.Contains("circletoflogos", StringComparison.Ordinal))
        {
            return "circlet";
        }

        return null;
    }

    public static string? ParseMainStatKey(string text, string? slotKey)
    {
        string normalized = NormalizeText(text);
        if (normalized.Contains("electro", StringComparison.Ordinal))
        {
            return "electro_dmg_";
        }
        if (normalized.Contains("cryo", StringComparison.Ordinal))
        {
            return "cryo_dmg_";
        }
        if (normalized.Contains("pyro", StringComparison.Ordinal))
        {
            return "pyro_dmg_";
        }
        if (normalized.Contains("hydro", StringComparison.Ordinal))
        {
            return "hydro_dmg_";
        }
        if (normalized.Contains("anemo", StringComparison.Ordinal))
        {
            return "anemo_dmg_";
        }
        if (normalized.Contains("geo", StringComparison.Ordinal))
        {
            return "geo_dmg_";
        }
        if (normalized.Contains("dendro", StringComparison.Ordinal))
        {
            return "dendro_dmg_";
        }
        if (normalized.Contains("physical", StringComparison.Ordinal))
        {
            return "physical_dmg_";
        }
        if (normalized.Contains("healing", StringComparison.Ordinal))
        {
            return "heal_";
        }
        if (normalized.Contains("energyrecharge", StringComparison.Ordinal))
        {
            return "enerRech_";
        }
        if (normalized.Contains("elementalmastery", StringComparison.Ordinal))
        {
            return "eleMas";
        }
        if (normalized.Contains("critrate", StringComparison.Ordinal))
        {
            return "critRate_";
        }
        if (normalized.Contains("critdmg", StringComparison.Ordinal) || normalized.Contains("criticaldamage", StringComparison.Ordinal))
        {
            return "critDMG_";
        }
        if (normalized is "hp" || normalized.StartsWith("hp", StringComparison.Ordinal))
        {
            return slotKey == "flower" ? "hp" : "hp_";
        }
        if (IsShortMainStatToken(normalized, 'h') && slotKey is "sands" or "goblet" or "circlet")
        {
            return "hp_";
        }
        if (normalized is "atk" || normalized.StartsWith("atk", StringComparison.Ordinal))
        {
            return slotKey == "plume" ? "atk" : "atk_";
        }
        if (IsShortMainStatToken(normalized, 'a') && slotKey is "sands" or "goblet" or "circlet")
        {
            return "atk_";
        }
        if (normalized is "def" || normalized.StartsWith("def", StringComparison.Ordinal))
        {
            return "def_";
        }
        if (IsShortMainStatToken(normalized, 'd') && slotKey is "sands" or "goblet" or "circlet")
        {
            return "def_";
        }

        return null;
    }

    private static bool IsShortMainStatToken(string normalized, char prefix)
    {
        return normalized.Length is > 0 and <= 3 && normalized[0] == prefix;
    }

    public static int? ParseLevel(string text)
    {
        string normalized = NormalizeLevelText(text);
        foreach (Match match in LevelRegex().Matches(normalized))
        {
            if (int.TryParse(match.Groups["level"].Value, out int level) && level is >= 0 and <= 20)
            {
                return level;
            }
        }

        string digitsOnly = Regex.Replace(normalized, @"[^\d]", string.Empty);
        if (digitsOnly.Length is > 0 and <= 2 &&
            int.TryParse(digitsOnly, out int bareLevel) &&
            bareLevel is 0 or >= 10 and <= 20)
        {
            return bareLevel;
        }

        return null;
    }

    public static int? ParseLeadingLevel(string text)
    {
        Match match = LeadingLevelRegex().Match(NormalizeLevelText(text));
        return match.Success && int.TryParse(match.Groups["level"].Value, out int level) && level is >= 0 and <= 20
            ? level
            : null;
    }

    public static string ParseLocation(string text)
    {
        Match match = EquippedRegex().Match(text);
        return match.Success ? match.Groups["location"].Value.Trim() : string.Empty;
    }

    private static string NormalizeText(string text)
    {
        string compact = Regex.Replace(text, @"[^A-Za-z]+", string.Empty);
        return compact.ToLowerInvariant();
    }

    private static string NormalizeLevelText(string text)
    {
        return text
            .Replace('O', '0')
            .Replace('o', '0')
            .Replace('I', '1')
            .Replace('l', '1')
            .Replace('S', '5')
            .Replace('s', '5')
            .Replace('B', '8');
    }

    [GeneratedRegex(@"(?<!\d)\+\s*(?<level>\d{1,2})(?!\d)")]
    private static partial Regex LevelRegex();

    [GeneratedRegex(@"^\s*\+\s*(?<level>\d{1,2})(?![\d.])")]
    private static partial Regex LeadingLevelRegex();

    [GeneratedRegex(@"Equipped\s*:\s*(?<location>[A-Za-z][A-Za-z\s'-]*)", RegexOptions.IgnoreCase)]
    private static partial Regex EquippedRegex();
}
