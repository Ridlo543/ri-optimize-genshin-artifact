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
        object payload = ScannerCommands.Execute(args);
        Console.WriteLine(JsonSerializer.Serialize(payload, JsonOptions));
        return payload is ScannerError ? 2 : 0;
    }
}
