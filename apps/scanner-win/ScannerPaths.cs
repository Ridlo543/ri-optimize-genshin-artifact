namespace GenshinArtifactScanner.Win;

internal static class ScannerPaths
{
    public static ScannerLogPaths CreateScannerLogPaths(string prefix)
    {
        if (string.IsNullOrWhiteSpace(prefix))
        {
            throw new ArgumentException("Log prefix is required.", nameof(prefix));
        }

        string scanId = CreateScanId();
        string logDirectory = GetScannerLogDirectory();
        string snapshotDirectory = Path.Combine(logDirectory, "captures");
        Directory.CreateDirectory(logDirectory);
        Directory.CreateDirectory(snapshotDirectory);

        return new ScannerLogPaths(
            ScanId: scanId,
            LastSourcePath: Path.Combine(logDirectory, $"{prefix}-source-last.png"),
            LastRegionPath: Path.Combine(logDirectory, $"{prefix}-last.png"),
            SnapshotSourcePath: Path.Combine(snapshotDirectory, $"{prefix}-source-{scanId}.png"),
            SnapshotRegionPath: Path.Combine(snapshotDirectory, $"{prefix}-{scanId}.png"));
    }

    public static string GetScannerLogDirectory()
    {
        return Path.Combine(FindRepoRoot(), "logs", "scanner");
    }

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

        string repoRoot = FindRepoRoot();
        string[] candidateDirectories =
        [
            Path.Combine(repoRoot, "data", "fixtures", "screenshots"),
            Path.Combine(repoRoot, "data", "example", "picture"),
            Path.Combine(repoRoot, "data", "log-manual")
        ];

        foreach (string directory in candidateDirectories)
        {
            string candidate = Path.Combine(directory, fileName);
            if (File.Exists(candidate))
            {
                return candidate;
            }

            string? nestedCandidate = Directory.Exists(directory)
                ? Directory.EnumerateFiles(directory, fileName, SearchOption.AllDirectories).FirstOrDefault()
                : null;
            if (!string.IsNullOrWhiteSpace(nestedCandidate))
            {
                return nestedCandidate;
            }
        }

        throw new FileNotFoundException("Screenshot fixture was not found.", Path.Combine(candidateDirectories[0], fileName));
    }

    public static string FindTessdataDirectory()
    {
        string outputTessdata = Path.Combine(AppContext.BaseDirectory, "tessdata");
        if (Directory.Exists(outputTessdata))
        {
            return outputTessdata;
        }

        string bundledResourceTessdata = Path.Combine(AppContext.BaseDirectory, "resources", "tessdata");
        if (Directory.Exists(bundledResourceTessdata))
        {
            return bundledResourceTessdata;
        }

        string projectTessdata = Path.Combine("apps", "scanner-win", "tessdata");
        if (Directory.Exists(projectTessdata))
        {
            return Path.GetFullPath(projectTessdata);
        }

        return Path.GetFullPath("tessdata");
    }

    private static string CreateScanId()
    {
        return $"{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss-fff}-{Guid.NewGuid():N}"[..31];
    }
}

internal sealed record ScannerLogPaths(
    string ScanId,
    string LastSourcePath,
    string LastRegionPath,
    string SnapshotSourcePath,
    string SnapshotRegionPath);
