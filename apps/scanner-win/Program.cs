using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GenshinArtifactScanner.Win;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static int Main(string[] args)
    {
        string command = args.Length > 0 ? args[0] : "status";

        try
        {
            object payload = command switch
            {
                "status" => ScannerStatus.Create(),
                "sample" => SampleScanResult.Create(),
                "scan-visible-artifact" => ScanVisibleArtifact(),
                "watch-start" => WatchStatus.NotImplemented("Watch mode will poll screenshot hashes after OCR fixtures are in place."),
                "watch-stop" => WatchStatus.Stopped(),
                _ => new ScannerError($"Unknown command: {command}")
            };

            Console.WriteLine(JsonSerializer.Serialize(payload, JsonOptions));
            return payload is ScannerError ? 2 : 0;
        }
        catch (Exception error)
        {
            Console.WriteLine(JsonSerializer.Serialize(new ScannerError(error.Message), JsonOptions));
            return 1;
        }
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
            Error = "Artifact panel captured, but OCR parsing is not implemented yet. Use the fixture while building OCR tests."
        };
    }
}

internal sealed record ScannerError(
    [property: JsonPropertyName("error")] string Error,
    [property: JsonPropertyName("available")] bool Available = false);

internal sealed class ScannerStatus
{
    [JsonPropertyName("available")]
    public bool Available { get; init; }

    [JsonPropertyName("processName")]
    public string? ProcessName { get; init; }

    [JsonPropertyName("windowTitle")]
    public string? WindowTitle { get; init; }

    [JsonPropertyName("resolution")]
    public string? Resolution { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }

    public static ScannerStatus Create()
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
}

internal sealed class WatchStatus
{
    [JsonPropertyName("available")]
    public bool Available { get; init; }

    [JsonPropertyName("watching")]
    public bool Watching { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }

    public static WatchStatus NotImplemented(string error) => new() { Available = false, Watching = false, Error = error };

    public static WatchStatus Stopped() => new() { Available = true, Watching = false };
}

internal sealed class ScanResult
{
    [JsonPropertyName("source")]
    public required string Source { get; init; }

    [JsonPropertyName("mode")]
    public required string Mode { get; init; }

    [JsonPropertyName("confidence")]
    public required Confidence Confidence { get; init; }

    [JsonPropertyName("artifact")]
    public GoodArtifact? Artifact { get; init; }

    [JsonPropertyName("capture")]
    public required CaptureInfo Capture { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }
}

internal sealed class Confidence
{
    [JsonPropertyName("setKey")]
    public double SetKey { get; init; }

    [JsonPropertyName("slotKey")]
    public double SlotKey { get; init; }

    [JsonPropertyName("mainStatKey")]
    public double MainStatKey { get; init; }

    [JsonPropertyName("substats")]
    public double Substats { get; init; }
}

internal sealed class CaptureInfo
{
    [JsonPropertyName("resolution")]
    public required string Resolution { get; init; }

    [JsonPropertyName("capturedAt")]
    public required string CapturedAt { get; init; }

    [JsonPropertyName("artifactPanelImagePath")]
    public string? ArtifactPanelImagePath { get; init; }

    public static CaptureInfo Unavailable() => new()
    {
        Resolution = "unavailable",
        CapturedAt = DateTimeOffset.UtcNow.ToString("O")
    };
}

internal sealed class GoodArtifact
{
    [JsonPropertyName("setKey")]
    public string? SetKey { get; init; }

    [JsonPropertyName("slotKey")]
    public required string SlotKey { get; init; }

    [JsonPropertyName("rarity")]
    public required int Rarity { get; init; }

    [JsonPropertyName("level")]
    public required int Level { get; init; }

    [JsonPropertyName("mainStatKey")]
    public required string MainStatKey { get; init; }

    [JsonPropertyName("substats")]
    public required List<GoodSubstat> Substats { get; init; }

    [JsonPropertyName("unactivatedSubstats")]
    public List<GoodSubstat>? UnactivatedSubstats { get; init; }

    [JsonPropertyName("lock")]
    public bool Lock { get; init; }

    [JsonPropertyName("location")]
    public string? Location { get; init; }
}

internal sealed class GoodSubstat
{
    [JsonPropertyName("key")]
    public required string Key { get; init; }

    [JsonPropertyName("value")]
    public required decimal Value { get; init; }
}

internal static class SampleScanResult
{
    public static ScanResult Create() => new()
    {
        Source = "fixture",
        Mode = "visible-artifact",
        Confidence = new Confidence
        {
            SetKey = 0.95,
            SlotKey = 0.98,
            MainStatKey = 0.96,
            Substats = 0.94
        },
        Artifact = new GoodArtifact
        {
            SetKey = "HuskOfOpulentDreams",
            SlotKey = "goblet",
            Rarity = 5,
            Level = 0,
            MainStatKey = "def_",
            Substats =
            [
                new GoodSubstat { Key = "critDMG_", Value = 7.0m },
                new GoodSubstat { Key = "eleMas", Value = 23m },
                new GoodSubstat { Key = "def", Value = 23m }
            ],
            UnactivatedSubstats =
            [
                new GoodSubstat { Key = "critRate_", Value = 3.1m }
            ],
            Lock = false,
            Location = ""
        },
        Capture = new CaptureInfo
        {
            Resolution = "fixture",
            CapturedAt = DateTimeOffset.UtcNow.ToString("O")
        }
    };
}

internal sealed class GameWindowInfo
{
    public required IntPtr Handle { get; init; }
    public required string ProcessName { get; init; }
    public required string WindowTitle { get; init; }
    public required int ClientWidth { get; init; }
    public required int ClientHeight { get; init; }
    public required int ScreenX { get; init; }
    public required int ScreenY { get; init; }
}

internal static class GameWindow
{
    private static readonly string[] KnownProcessNames =
    [
        "GenshinImpact",
        "GenshinImpact.exe",
        "YuanShen",
        "YuanShen.exe"
    ];

    public static bool TryFind(out GameWindowInfo? windowInfo)
    {
        foreach (string processName in KnownProcessNames)
        {
            string normalized = Path.GetFileNameWithoutExtension(processName);
            foreach (Process process in Process.GetProcessesByName(normalized))
            {
                if (process.MainWindowHandle == IntPtr.Zero)
                {
                    continue;
                }

                if (!NativeMethods.GetClientRect(process.MainWindowHandle, out NativeRect clientRect))
                {
                    continue;
                }

                NativePoint point = new() { X = 0, Y = 0 };
                if (!NativeMethods.ClientToScreen(process.MainWindowHandle, ref point))
                {
                    continue;
                }

                int width = clientRect.Right - clientRect.Left;
                int height = clientRect.Bottom - clientRect.Top;
                if (width <= 0 || height <= 0)
                {
                    continue;
                }

                windowInfo = new GameWindowInfo
                {
                    Handle = process.MainWindowHandle,
                    ProcessName = process.ProcessName,
                    WindowTitle = process.MainWindowTitle,
                    ClientWidth = width,
                    ClientHeight = height,
                    ScreenX = point.X,
                    ScreenY = point.Y
                };
                return true;
            }
        }

        windowInfo = null;
        return false;
    }
}

internal static class ScreenCapture
{
    public static Bitmap CaptureClient(GameWindowInfo window)
    {
        Bitmap bitmap = new(window.ClientWidth, window.ClientHeight, PixelFormat.Format24bppRgb);
        using Graphics graphics = Graphics.FromImage(bitmap);
        graphics.CopyFromScreen(window.ScreenX, window.ScreenY, 0, 0, bitmap.Size);

        using SolidBrush brush = new(Color.Black);
        Rectangle uidRegion = new(
            x: (int)(1070 / 1280.0 * bitmap.Width),
            y: (int)(695 / 720.0 * bitmap.Height),
            width: bitmap.Width,
            height: bitmap.Height);
        graphics.FillRectangle(brush, uidRegion);

        return bitmap;
    }

    public static Bitmap CropArtifactPanel(Bitmap windowBitmap)
    {
        Rectangle cardRectangle = new(
            x: (int)(windowBitmap.Width * 0.6807),
            y: (int)(windowBitmap.Height * 0.0989),
            width: (int)(windowBitmap.Width * 0.2573),
            height: (int)(windowBitmap.Height * 0.8022));

        Bitmap crop = new(cardRectangle.Width, cardRectangle.Height, PixelFormat.Format24bppRgb);
        using Graphics graphics = Graphics.FromImage(crop);
        graphics.DrawImage(windowBitmap, new Rectangle(0, 0, crop.Width, crop.Height), cardRectangle, GraphicsUnit.Pixel);
        return crop;
    }
}

internal static partial class NativeMethods
{
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetClientRect(IntPtr hWnd, out NativeRect rect);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool ClientToScreen(IntPtr hWnd, ref NativePoint point);
}

[StructLayout(LayoutKind.Sequential)]
internal struct NativeRect
{
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
}

[StructLayout(LayoutKind.Sequential)]
internal struct NativePoint
{
    public int X;
    public int Y;
}
