using System.Drawing;
using System.Text.Json;

namespace GenshinArtifactScanner.Win;

internal static class ScanRegionParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static ScanRegion Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new ArgumentException("Region JSON is required.", nameof(json));
        }

        ScanRegion? region = JsonSerializer.Deserialize<ScanRegion>(json, JsonOptions);
        if (region is null)
        {
            throw new ArgumentException("Region JSON could not be parsed.", nameof(json));
        }

        Validate(region);
        return region;
    }

    public static Rectangle ToRectangle(ScanRegion region, Bitmap source)
    {
        ArgumentNullException.ThrowIfNull(region);
        ArgumentNullException.ThrowIfNull(source);
        Validate(region);

        return ImageCropper.Scale(new RectangleF((float)region.X, (float)region.Y, (float)region.Width, (float)region.Height), source.Width, source.Height);
    }

    public static void Validate(ScanRegion region)
    {
        ArgumentNullException.ThrowIfNull(region);

        if (!StringComparer.Ordinal.Equals(region.Unit, "normalized-client"))
        {
            throw new ArgumentException("Region unit must be normalized-client.", nameof(region));
        }

        if (!IsFinite(region.X) || !IsFinite(region.Y) || !IsFinite(region.Width) || !IsFinite(region.Height))
        {
            throw new ArgumentException("Region values must be finite numbers.", nameof(region));
        }

        if (region.X < 0 || region.Y < 0 || region.Width <= 0 || region.Height <= 0)
        {
            throw new ArgumentException("Region x/y must be non-negative and width/height must be positive.", nameof(region));
        }

        if (region.X + region.Width > 1.000001 || region.Y + region.Height > 1.000001)
        {
            throw new ArgumentException("Region must stay within normalized client bounds.", nameof(region));
        }
    }

    private static bool IsFinite(double value)
    {
        return !double.IsNaN(value) && !double.IsInfinity(value);
    }
}
