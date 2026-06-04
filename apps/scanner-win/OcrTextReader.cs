using System.Drawing;
using Tesseract;

namespace GenshinArtifactScanner.Win;

internal sealed class OcrTextReader : IDisposable
{
    public const string DefaultLanguage = "genshin_fast_09_04_21";

    private readonly string tessdataPath;
    private readonly string language;
    private TesseractEngine? engine;

    public OcrTextReader(string? tessdataPath = null, string language = DefaultLanguage)
    {
        this.tessdataPath = tessdataPath ?? ScannerPaths.FindTessdataDirectory();
        this.language = language;
    }

    public OcrTextResult ReadText(Bitmap bitmap, PageSegMode pageSegMode)
    {
        ArgumentNullException.ThrowIfNull(bitmap);
        EnsureTessdataAvailable();

        TesseractEngine tesseract = engine ??= new TesseractEngine(tessdataPath, language, EngineMode.LstmOnly);
        using Pix pix = PixConverter.ToPix(bitmap);
        using Page page = tesseract.Process(pix, pageSegMode);

        return new OcrTextResult
        {
            Text = page.GetText() ?? string.Empty,
            Confidence = page.GetMeanConfidence()
        };
    }

    public void Dispose()
    {
        engine?.Dispose();
    }

    private void EnsureTessdataAvailable()
    {
        string trainedDataPath = Path.Combine(tessdataPath, $"{language}.traineddata");
        if (!File.Exists(trainedDataPath))
        {
            throw new OcrUnavailableException($"Missing OCR traineddata: {trainedDataPath}");
        }
    }
}

internal sealed class OcrTextResult
{
    public required string Text { get; init; }

    public required double Confidence { get; init; }
}

internal sealed class OcrUnavailableException(string message) : Exception(message);
