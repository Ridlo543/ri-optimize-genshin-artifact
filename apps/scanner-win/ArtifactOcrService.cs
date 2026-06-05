using System.Drawing;
using Tesseract;

namespace GenshinArtifactScanner.Win;

internal sealed class ArtifactOcrService(OcrTextReader reader)
{
    private readonly OcrTextReader reader = reader ?? throw new ArgumentNullException(nameof(reader));

    public OcrSubstatsResult ReadSubstats(string imagePath, bool writeDebugImage = false)
    {
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            throw new ArgumentException("Image path is required.", nameof(imagePath));
        }
        if (!File.Exists(imagePath))
        {
            throw new FileNotFoundException("Substat image was not found.", imagePath);
        }

        using Bitmap source = new(imagePath);
        return ReadSubstats(source, Path.GetFullPath(imagePath), writeDebugImage);
    }

    public OcrSubstatsResult ReadSubstats(Bitmap source, string? imagePath = null, bool writeDebugImage = false)
    {
        ArgumentNullException.ThrowIfNull(source);

        using Bitmap processed = ArtifactImagePreprocessor.PreprocessSubstats(source);
        string? debugImagePath = writeDebugImage ? ArtifactImagePreprocessor.SaveDebugImage(processed, imagePath ?? "substats", "substats") : null;
        OcrTextResult text = reader.ReadText(processed, PageSegMode.Auto);
        ParsedSubstats parsed = SubstatTextParser.ParseText(text.Text);

        return new OcrSubstatsResult
        {
            Substats = parsed.Substats,
            UnactivatedSubstats = parsed.UnactivatedSubstats,
            RawText = text.Text,
            Confidence = Math.Min(text.Confidence, parsed.Confidence),
            ImagePath = imagePath is null ? null : Path.GetFullPath(imagePath),
            DebugImagePath = debugImagePath
        };
    }

    public OcrFieldResult<string> ReadSetKey(string imagePath, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(imagePath, "setKey", PageSegMode.SingleLine, writeDebugImage);
        return ParseSetKey(text);
    }

    public OcrFieldResult<string> ReadSetKey(Bitmap source, string? imagePath = null, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(source, "setKey", PageSegMode.SingleLine, imagePath, writeDebugImage);
        return ParseSetKey(text);
    }

    public OcrFieldResult<string> ReadSlotKey(string imagePath, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(imagePath, "slotKey", PageSegMode.SingleLine, writeDebugImage);
        return ParseSlotKey(text);
    }

    public OcrFieldResult<string> ReadSlotKey(Bitmap source, string? imagePath = null, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(source, "slotKey", PageSegMode.SingleLine, imagePath, writeDebugImage);
        return ParseSlotKey(text);
    }

    public OcrFieldResult<string> ReadMainStatKey(string imagePath, string? slotKey, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(imagePath, "mainStatKey", PageSegMode.SingleLine, writeDebugImage);
        return ParseMainStatKey(text, slotKey);
    }

    public OcrFieldResult<string> ReadMainStatKey(Bitmap source, string? slotKey, string? imagePath = null, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(source, "mainStatKey", PageSegMode.SingleLine, imagePath, writeDebugImage);
        return ParseMainStatKey(text, slotKey);
    }

    public OcrFieldResult<int> ReadLevel(string imagePath, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(imagePath, "level", PageSegMode.SingleWord, writeDebugImage);
        return ParseLevel(text);
    }

    public OcrFieldResult<int> ReadLevel(Bitmap source, string? imagePath = null, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(source, "level", PageSegMode.SingleWord, imagePath, writeDebugImage);
        return ParseLevel(text);
    }

    public OcrFieldResult<string> ReadLocation(string imagePath, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(imagePath, "location", PageSegMode.SingleLine, writeDebugImage);
        return ParseLocation(text);
    }

    public OcrFieldResult<string> ReadLocation(Bitmap source, string? imagePath = null, bool writeDebugImage = false)
    {
        OcrFieldResult<string> text = ReadTextField(source, "location", PageSegMode.SingleLine, imagePath, writeDebugImage);
        return ParseLocation(text);
    }

    private static OcrFieldResult<string> ParseSetKey(OcrFieldResult<string> text)
    {
        string? value = ArtifactTextParser.ParseSetKeyFromArtifactName(text.RawText ?? string.Empty);
        return WithValue(text, value, value is null ? 0 : text.Confidence);
    }

    private static OcrFieldResult<string> ParseSlotKey(OcrFieldResult<string> text)
    {
        string? value = ArtifactTextParser.ParseSlotKey(text.RawText ?? string.Empty);
        return WithValue(text, value, value is null ? 0 : text.Confidence);
    }

    private static OcrFieldResult<string> ParseMainStatKey(OcrFieldResult<string> text, string? slotKey)
    {
        string? value = ArtifactTextParser.ParseMainStatKey(text.RawText ?? string.Empty, slotKey);
        return WithValue(text, value, value is null ? 0 : text.Confidence);
    }

    private static OcrFieldResult<int> ParseLevel(OcrFieldResult<string> text)
    {
        int? value = ArtifactTextParser.ParseLevel(text.RawText ?? string.Empty);

        return new OcrFieldResult<int>
        {
            Field = "level",
            Value = value ?? -1,
            RawText = text.RawText,
            Confidence = value.HasValue ? text.Confidence : 0,
            ImagePath = text.ImagePath,
            DebugImagePath = text.DebugImagePath
        };
    }

    private static OcrFieldResult<string> ParseLocation(OcrFieldResult<string> text)
    {
        string value = ArtifactTextParser.ParseLocation(text.RawText ?? string.Empty);
        double confidence = value.Length > 0 ? text.Confidence : Math.Min(0.75, text.Confidence);
        return WithValue(text, value, confidence);
    }

    private OcrFieldResult<string> ReadTextField(string imagePath, string fieldName, PageSegMode pageSegMode, bool writeDebugImage)
    {
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            throw new ArgumentException("Image path is required.", nameof(imagePath));
        }
        if (!File.Exists(imagePath))
        {
            throw new FileNotFoundException($"{fieldName} image was not found.", imagePath);
        }

        using Bitmap source = new(imagePath);
        return ReadTextField(source, fieldName, pageSegMode, Path.GetFullPath(imagePath), writeDebugImage);
    }

    private OcrFieldResult<string> ReadTextField(Bitmap source, string fieldName, PageSegMode pageSegMode, string? imagePath, bool writeDebugImage)
    {
        ArgumentNullException.ThrowIfNull(source);

        using Bitmap processed = ArtifactImagePreprocessor.PreprocessText(source);
        string? debugImagePath = writeDebugImage ? ArtifactImagePreprocessor.SaveDebugImage(processed, imagePath ?? fieldName, fieldName) : null;
        OcrTextResult text = reader.ReadText(processed, pageSegMode);

        return new OcrFieldResult<string>
        {
            Field = fieldName,
            Value = null,
            RawText = text.Text.Trim(),
            Confidence = text.Confidence,
            ImagePath = imagePath is null ? null : Path.GetFullPath(imagePath),
            DebugImagePath = debugImagePath
        };
    }

    private static OcrFieldResult<string> WithValue(OcrFieldResult<string> source, string? value, double confidence)
    {
        return new OcrFieldResult<string>
        {
            Field = source.Field,
            Value = value,
            RawText = source.RawText,
            Confidence = confidence,
            ImagePath = source.ImagePath,
            DebugImagePath = source.DebugImagePath
        };
    }
}
