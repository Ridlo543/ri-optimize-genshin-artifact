using System.Drawing;
using System.Drawing.Imaging;

namespace GenshinArtifactScanner.Win;

internal static class ScannerCommands
{
    public static object Execute(string[] args)
    {
        string command = args.Length > 0 ? args[0] : "status";

        try
        {
            return command switch
            {
                "status" => CreateStatus(),
                "sample" => SampleScanResult.Create(),
                "scan-visible-artifact" => ScanVisibleArtifact(),
                "watch-start" => WatchStatus.NotImplemented("Watch mode will poll screenshot hashes after full artifact OCR is in place."),
                "watch-stop" => WatchStatus.Stopped(),
                "ocr-substats" => OcrSubstats(args),
                "parse-fixture-artifact" => ParseFixtureArtifact(args),
                _ => new ScannerError($"Unknown command: {command}")
            };
        }
        catch (OcrUnavailableException error)
        {
            return new ScannerError(error.Message);
        }
        catch (Exception error)
        {
            return new ScannerError(error.Message);
        }
    }

    private static ScannerStatus CreateStatus()
    {
        return GameWindow.TryFind(out GameWindowInfo? window) && window is not null
            ? new ScannerStatus
            {
                Available = true,
                ProcessName = window.ProcessName,
                WindowTitle = window.WindowTitle,
                Resolution = $"{window.ClientWidth}x{window.ClientHeight}"
            }
            : new ScannerStatus
            {
                Available = false,
                Error = "Genshin Impact process not found."
            };
    }

    private static object ScanVisibleArtifact()
    {
        if (!GameWindow.TryFind(out GameWindowInfo? window) || window is null)
        {
            return new ScanResult
            {
                Source = "screen",
                Mode = "visible-artifact",
                Confidence = new Confidence(),
                Artifact = null,
                Capture = CaptureInfo.Unavailable(),
                Error = "Cannot find a visible Genshin Impact process. Open the game in windowed or borderless mode, then scan again."
            };
        }

        Directory.CreateDirectory(Path.Combine("logs", "scanner"));
        string outputPath = Path.Combine("logs", "scanner", "visible-artifact-last.png");

        using Bitmap windowBitmap = ScreenCapture.CaptureClient(window);
        using Bitmap artifactPanel = ScreenCapture.CropArtifactPanel(windowBitmap);
        artifactPanel.Save(outputPath, ImageFormat.Png);

        return new ScanResult
        {
            Source = "screen",
            Mode = "visible-artifact",
            Confidence = new Confidence(),
            Artifact = null,
            Capture = new CaptureInfo
            {
                Resolution = $"{window.ClientWidth}x{window.ClientHeight}",
                CapturedAt = DateTimeOffset.UtcNow.ToString("O"),
                ArtifactPanelImagePath = Path.GetFullPath(outputPath)
            },
            Error = "Artifact panel captured. Substat OCR fixture parsing is implemented, but full visible artifact assembly is still pending."
        };
    }

    private static object OcrSubstats(string[] args)
    {
        if (args.Length < 2)
        {
            return new ScannerError("Usage: ocr-substats <imagePath> [--debug]");
        }

        bool writeDebugImage = args.Contains("--debug", StringComparer.OrdinalIgnoreCase);
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        return service.ReadSubstats(args[1], writeDebugImage);
    }

    private static object ParseFixtureArtifact(string[] args)
    {
        if (args.Length < 2)
        {
            return new ScannerError("Usage: parse-fixture-artifact <fixtureFolder> [--debug]");
        }

        bool writeDebugImage = args.Contains("--debug", StringComparer.OrdinalIgnoreCase);
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);
        return parser.Parse(args[1], writeDebugImage);
    }
}
