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
        using Bitmap processed = ArtifactImagePreprocessor.PreprocessSubstats(source);
        string? debugImagePath = writeDebugImage ? ArtifactImagePreprocessor.SaveDebugImage(processed, imagePath) : null;
        OcrTextResult text = reader.ReadText(processed, PageSegMode.Auto);
        ParsedSubstats parsed = SubstatTextParser.ParseText(text.Text);

        return new OcrSubstatsResult
        {
            Substats = parsed.Substats,
            UnactivatedSubstats = parsed.UnactivatedSubstats,
            RawText = text.Text,
            Confidence = Math.Min(text.Confidence, parsed.Confidence),
            ImagePath = Path.GetFullPath(imagePath),
            DebugImagePath = debugImagePath
        };
    }
}
