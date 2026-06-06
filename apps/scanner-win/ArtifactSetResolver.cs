namespace GenshinArtifactScanner.Win;

internal sealed record ArtifactSetResolution(
    OcrFieldResult<string> Field,
    SetIdentityDiagnostics Diagnostics,
    List<string> Warnings);

internal static class ArtifactSetResolver
{
    public static ArtifactSetResolution Resolve(OcrFieldResult<string> itemName, OcrSubstatsResult substats)
    {
        ArgumentNullException.ThrowIfNull(itemName);
        ArgumentNullException.ThrowIfNull(substats);

        string? setDisplayName = ArtifactTextParser.ExtractSetDisplayName(substats.RawText);
        string? setFromDisplayName = ArtifactTextParser.ParseSetKeyFromSetBonusText(substats.RawText);
        string? setFromItemName = ArtifactTextParser.ParseSetKeyFromArtifactName(itemName.RawText ?? string.Empty);
        string? setKey = setFromDisplayName ?? setFromItemName;
        string source = setFromDisplayName is not null ? "set-display-name" : setFromItemName is not null ? "artifact-item-name" : "unrecognized";
        double confidence = setFromDisplayName is not null
            ? Math.Max(0.65, substats.Confidence)
            : setFromItemName is not null ? itemName.Confidence : 0;

        List<string> warnings = [];
        if (setKey is null)
        {
            warnings.Add("Set name was not recognized. Upgrade-roll analysis can still continue.");
        }

        return new ArtifactSetResolution(
            new OcrFieldResult<string>
            {
                Field = "setKey",
                Value = setKey,
                RawText = setDisplayName ?? itemName.RawText,
                Confidence = confidence,
                ImagePath = itemName.ImagePath,
                DebugImagePath = itemName.DebugImagePath
            },
            new SetIdentityDiagnostics
            {
                RawItemName = itemName.RawText,
                RawSetDisplayName = setDisplayName,
                MatchedSetKey = setKey,
                MatchSource = source
            },
            warnings);
    }
}
