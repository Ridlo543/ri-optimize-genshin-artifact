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
                "classify-visible-screen" => ClassifyVisibleScreen(),
                "scan-visible-artifact" => ScanVisibleArtifact(),
                "scan-region-artifact" => ScanRegionArtifact(args),
                "classify-region-artifact" => ClassifyRegionArtifact(args),
                "watch-start" => WatchStatus.NotImplemented("Watch mode will poll screenshot hashes after full artifact OCR is in place."),
                "watch-stop" => WatchStatus.Stopped(),
                "ocr-substats" => OcrSubstats(args),
                "parse-fixture-artifact" => ParseFixtureArtifact(args),
                "parse-fixture-card" => ParseFixtureCard(args),
                "parse-region-fixture" => ParseRegionFixture(args),
                "classify-region-fixture" => ClassifyRegionFixture(args),
                "parse-screenshot-artifact" => ParseScreenshotArtifact(args),
                "parse-screenshot-fixture" => ParseScreenshotFixture(args),
                "classify-screenshot-artifact" => ClassifyScreenshotArtifact(args),
                "classify-screenshot-fixture" => ClassifyScreenshotFixture(args),
                _ => new ScannerError($"Unknown command: {command}")
            };
        }
        catch (OcrUnavailableException error)
        {
            return new ScannerError(FormatException(error));
        }
        catch (Exception error)
        {
            return new ScannerError(FormatException(error));
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
                Resolution = $"{window.ClientWidth}x{window.ClientHeight}",
                ClientWidth = window.ClientWidth,
                ClientHeight = window.ClientHeight,
                ScreenX = window.ScreenX,
                ScreenY = window.ScreenY
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
            return GameNotFound("visible-artifact");
        }

        using Bitmap windowBitmap = ScreenCapture.CaptureClient(window);
        Directory.CreateDirectory(Path.Combine("logs", "scanner"));
        string outputPath = Path.Combine("logs", "scanner", "visible-artifact-last.png");
        windowBitmap.Save(outputPath, ImageFormat.Png);

        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);
        return parser.ParseBitmap(windowBitmap, "screen", "visible-artifact", Path.GetFullPath(outputPath), writeDebugImage: true);
    }

    private static object ClassifyVisibleScreen()
    {
        if (!GameWindow.TryFind(out GameWindowInfo? window) || window is null)
        {
            return GameNotFound("screen-classification");
        }

        using Bitmap windowBitmap = ScreenCapture.CaptureClient(window);
        Directory.CreateDirectory(Path.Combine("logs", "scanner"));
        string outputPath = Path.Combine("logs", "scanner", "visible-screen-classification-last.png");
        windowBitmap.Save(outputPath, ImageFormat.Png);

        return ScreenshotArtifactParser.ClassifyBitmap(windowBitmap, "screen", "screen-classification", Path.GetFullPath(outputPath));
    }

    private static object ScanRegionArtifact(string[] args)
    {
        if (!GameWindow.TryFind(out GameWindowInfo? window) || window is null)
        {
            return GameNotFound("region-artifact");
        }

        ScanRegion region = ParseRegionArg(args);
        using Bitmap windowBitmap = ScreenCapture.CaptureClient(window);
        Directory.CreateDirectory(Path.Combine("logs", "scanner"));
        string screenshotPath = Path.Combine("logs", "scanner", "region-source-last.png");
        string regionPath = Path.Combine("logs", "scanner", "region-last.png");
        windowBitmap.Save(screenshotPath, ImageFormat.Png);

        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);
        return parser.ParseBitmap(windowBitmap, region, "screen", "region-artifact", Path.GetFullPath(screenshotPath), Path.GetFullPath(regionPath), writeDebugImage: true);
    }

    private static object ClassifyRegionArtifact(string[] args)
    {
        if (!GameWindow.TryFind(out GameWindowInfo? window) || window is null)
        {
            return GameNotFound("region-classification");
        }

        ScanRegion region = ParseRegionArg(args);
        using Bitmap windowBitmap = ScreenCapture.CaptureClient(window);
        Directory.CreateDirectory(Path.Combine("logs", "scanner"));
        string screenshotPath = Path.Combine("logs", "scanner", "region-classification-source-last.png");
        string regionPath = Path.Combine("logs", "scanner", "region-classification-last.png");
        windowBitmap.Save(screenshotPath, ImageFormat.Png);

        return ArtifactRegionParser.ClassifyBitmap(windowBitmap, region, "screen", "region-classification", Path.GetFullPath(screenshotPath), Path.GetFullPath(regionPath));
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

    private static object ParseFixtureCard(string[] args)
    {
        if (args.Length < 2)
        {
            return new ScannerError("Usage: parse-fixture-card <fixtureFolder> [--debug]");
        }

        bool writeDebugImage = args.Contains("--debug", StringComparer.OrdinalIgnoreCase);
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        FixtureArtifactParser parser = new(service);
        return parser.ParseCard(args[1], writeDebugImage);
    }

    private static object ParseRegionFixture(string[] args)
    {
        if (args.Length < 3)
        {
            return new ScannerError("Usage: parse-region-fixture <fixtureFileName> <regionJson> [--debug]");
        }

        bool writeDebugImage = args.Contains("--debug", StringComparer.OrdinalIgnoreCase);
        string fixturePath = ScannerPaths.FindScreenshotFixture(args[1]);
        ScanRegion region = ScanRegionParser.Parse(args[2]);
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ArtifactRegionParser parser = new(service);
        return parser.ParseFile(fixturePath, region, writeDebugImage);
    }

    private static object ClassifyRegionFixture(string[] args)
    {
        if (args.Length < 3)
        {
            return new ScannerError("Usage: classify-region-fixture <fixtureFileName> <regionJson>");
        }

        string fixturePath = ScannerPaths.FindScreenshotFixture(args[1]);
        ScanRegion region = ScanRegionParser.Parse(args[2]);
        return ArtifactRegionParser.ClassifyFile(fixturePath, region);
    }

    private static object ParseScreenshotArtifact(string[] args)
    {
        if (args.Length < 2)
        {
            return new ScannerError("Usage: parse-screenshot-artifact <imagePath> [--debug]");
        }

        bool writeDebugImage = args.Contains("--debug", StringComparer.OrdinalIgnoreCase);
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);
        return parser.ParseFile(args[1], writeDebugImage);
    }

    private static object ParseScreenshotFixture(string[] args)
    {
        if (args.Length < 2)
        {
            return new ScannerError("Usage: parse-screenshot-fixture <fixtureFileName> [--debug]");
        }

        bool writeDebugImage = args.Contains("--debug", StringComparer.OrdinalIgnoreCase);
        string fixturePath = ScannerPaths.FindScreenshotFixture(args[1]);
        using OcrTextReader reader = new();
        ArtifactOcrService service = new(reader);
        ScreenshotArtifactParser parser = new(service);
        return parser.ParseFile(fixturePath, writeDebugImage);
    }

    private static object ClassifyScreenshotArtifact(string[] args)
    {
        if (args.Length < 2)
        {
            return new ScannerError("Usage: classify-screenshot-artifact <imagePath>");
        }

        return ScreenshotArtifactParser.ClassifyFile(args[1]);
    }

    private static object ClassifyScreenshotFixture(string[] args)
    {
        if (args.Length < 2)
        {
            return new ScannerError("Usage: classify-screenshot-fixture <fixtureFileName>");
        }

        string fixturePath = ScannerPaths.FindScreenshotFixture(args[1]);
        return ScreenshotArtifactParser.ClassifyFile(fixturePath);
    }

    private static ScanResult GameNotFound(string mode)
    {
        ScreenStateInfo screenState = new()
        {
            Code = ScreenStateCodes.GameNotFound,
            ReadyForArtifactOcr = false,
            Confidence = 1,
            Message = "Waiting for Genshin. Open the game in windowed or borderless mode."
        };

        return new ScanResult
        {
            Source = "screen",
            Mode = mode,
            Confidence = new Confidence(),
            Artifact = null,
            ScreenState = screenState,
            Capture = CaptureInfo.Unavailable(),
            Error = screenState.Message
        };
    }

    private static string FormatException(Exception error)
    {
        List<string> messages = [];
        for (Exception? current = error; current is not null; current = current.InnerException)
        {
            messages.Add(current.Message);
        }

        return string.Join(" Inner: ", messages);
    }

    private static ScanRegion ParseRegionArg(string[] args)
    {
        int optionIndex = Array.FindIndex(args, value => StringComparer.OrdinalIgnoreCase.Equals(value, "--region-json"));
        if (optionIndex < 0 || optionIndex + 1 >= args.Length)
        {
            throw new ArgumentException("Usage: scan-region-artifact --region-json <json>");
        }

        return ScanRegionParser.Parse(args[optionIndex + 1]);
    }
}
