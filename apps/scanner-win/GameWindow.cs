using System.Diagnostics;

namespace GenshinArtifactScanner.Win;

internal sealed class GameWindowInfo
{
    public required nint Handle { get; init; }

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
                if (process.MainWindowHandle == nint.Zero)
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
