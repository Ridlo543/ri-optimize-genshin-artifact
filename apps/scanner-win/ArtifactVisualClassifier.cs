using System.Drawing;

namespace GenshinArtifactScanner.Win;

internal static class ArtifactVisualClassifier
{
    public static OcrFieldResult<bool> ReadLock(string imagePath)
    {
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            throw new ArgumentException("Lock image path is required.", nameof(imagePath));
        }
        if (!File.Exists(imagePath))
        {
            throw new FileNotFoundException("Lock image was not found.", imagePath);
        }

        using Bitmap image = new(imagePath);
        return ReadLock(image, Path.GetFullPath(imagePath));
    }

    public static OcrFieldResult<bool> ReadLock(Bitmap image, string? imagePath = null)
    {
        ArgumentNullException.ThrowIfNull(image);

        int redPixels = 0;
        int totalPixels = image.Width * image.Height;

        for (int y = 0; y < image.Height; y++)
        {
            for (int x = 0; x < image.Width; x++)
            {
                Color pixel = image.GetPixel(x, y);
                if (pixel.R > 180 && pixel.G is > 60 and < 170 && pixel.B is > 60 and < 170)
                {
                    redPixels++;
                }
            }
        }

        double redRatio = totalPixels == 0 ? 0 : redPixels / (double)totalPixels;
        bool locked = redRatio > 0.015;
        double confidence = locked ? Clamp(redRatio * 35) : 0.9;

        return new OcrFieldResult<bool>
        {
            Field = "lock",
            Value = locked,
            Confidence = confidence,
            ImagePath = imagePath is null ? null : Path.GetFullPath(imagePath)
        };
    }

    private static double Clamp(double value)
    {
        return Math.Max(0.5, Math.Min(0.98, value));
    }
}
