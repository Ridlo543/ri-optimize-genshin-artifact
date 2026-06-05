namespace GenshinArtifactScanner.Win;

internal static class ScannerPaths
{
    public static string FindRepoRoot()
    {
        IEnumerable<string> startDirectories = new[]
        {
            Environment.CurrentDirectory,
            AppContext.BaseDirectory
        }.Where(path => !string.IsNullOrWhiteSpace(path));

        foreach (string startDirectory in startDirectories)
        {
            DirectoryInfo? directory = new(startDirectory);
            while (directory is not null)
            {
                string marker = Path.Combine(directory.FullName, "pnpm-workspace.yaml");
                if (File.Exists(marker))
                {
                    return directory.FullName;
                }

                directory = directory.Parent;
            }
        }

        return Environment.CurrentDirectory;
    }

    public static string FindScreenshotFixture(string fixtureName)
    {
        if (string.IsNullOrWhiteSpace(fixtureName))
        {
            throw new ArgumentException("Fixture name is required.", nameof(fixtureName));
        }

        string fileName = Path.GetFileName(fixtureName);
        if (!StringComparer.Ordinal.Equals(fileName, fixtureName))
        {
            throw new ArgumentException("Fixture name must not contain directory separators.", nameof(fixtureName));
        }

        string path = Path.Combine(FindRepoRoot(), "data", "fixtures", "screenshots", fileName);
        if (!File.Exists(path))
        {
            throw new FileNotFoundException("Screenshot fixture was not found.", path);
        }

        return path;
    }

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
