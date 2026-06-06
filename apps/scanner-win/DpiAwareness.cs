namespace GenshinArtifactScanner.Win;

internal static class DpiAwareness
{
    private static readonly nint DpiAwarenessContextPerMonitorAwareV2 = new(-4);

    public static void Enable()
    {
        try
        {
            if (NativeMethods.SetProcessDpiAwarenessContext(DpiAwarenessContextPerMonitorAwareV2))
            {
                return;
            }
        }
        catch (EntryPointNotFoundException)
        {
            // Older Windows versions may not expose SetProcessDpiAwarenessContext.
        }

        try
        {
            _ = NativeMethods.SetProcessDPIAware();
        }
        catch (EntryPointNotFoundException)
        {
            // If no DPI API is available, the scanner falls back to Windows defaults.
        }
    }
}
