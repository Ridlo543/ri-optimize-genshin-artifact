using System.Runtime.InteropServices;

namespace GenshinArtifactScanner.Win;

internal static partial class NativeMethods
{
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetClientRect(nint hWnd, out NativeRect rect);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool ClientToScreen(nint hWnd, ref NativePoint point);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetProcessDpiAwarenessContext(nint dpiContext);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetProcessDPIAware();
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
