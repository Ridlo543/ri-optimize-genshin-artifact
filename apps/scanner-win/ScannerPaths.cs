namespace GenshinArtifactScanner.Win;

internal static class ScannerPaths
{
    public static string FindTessdataDirectory()
    {
        string outputTessdata = Path.Combine(AppContext.BaseDirectory, "tessdata");
        if (Directory.Exists(outputTessdata))
        {
            return outputTessdata;
        }

        string projectTessdata = Path.Combine("apps", "scanner-win", "tessdata");
        if (Directory.Exists(projectTessdata))
        {
            return Path.GetFullPath(projectTessdata);
        }

        return Path.GetFullPath("tessdata");
    }
}
