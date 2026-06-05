using System.Text.RegularExpressions;

namespace GenshinArtifactScanner.Win;

internal static partial class ArtifactTextParser
{
    private static readonly Dictionary<string, string> ArtifactNameToSetKey = new(StringComparer.Ordinal)
    {
        ["heavensentfragrance"] = "CelestialGift",
        ["heavensentdecree"] = "CelestialGift",
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
        if (normalized is "atk" || normalized.StartsWith("atk", StringComparison.Ordinal))
        {
            return slotKey == "plume" ? "atk" : "atk_";
        }
        if (normalized is "def" || normalized.StartsWith("def", StringComparison.Ordinal))
        {
            return "def_";
        }

        return null;
    }

    public static int? ParseLevel(string text)
    {
        Match match = LevelRegex().Match(text);
        if (!match.Success)
        {
            return null;
        }

        return int.TryParse(match.Groups["level"].Value, out int level) ? level : null;
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

    [GeneratedRegex(@"\+?\s*(?<level>\d{1,2})")]
    private static partial Regex LevelRegex();

    [GeneratedRegex(@"Equipped\s*:\s*(?<location>[A-Za-z][A-Za-z\s'-]*)", RegexOptions.IgnoreCase)]
    private static partial Regex EquippedRegex();
}
