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

    public static bool IsBagArtifactPanel(Bitmap image)
    {
        ArgumentNullException.ThrowIfNull(image);

        ColorRatios ratios = MeasureColors(image);
        return ratios.Beige > 0.4 ||
            ratios.Orange > 0.08 ||
            ratios.Purple > 0.12 ||
            ratios.Blue > 0.18 ||
            ratios.Green > 0.18;
    }

    public static int EstimateRarity(Bitmap nameCrop)
    {
        ArgumentNullException.ThrowIfNull(nameCrop);

        ColorRatios ratios = MeasureColors(nameCrop);
        if (ratios.Green > 0.25)
        {
            return 2;
        }
        if (ratios.Blue > 0.25)
        {
            return 3;
        }
        if (ratios.Purple > 0.12)
        {
            return 4;
        }

        return 5;
    }

    private static double Clamp(double value)
    {
        return Math.Max(0.5, Math.Min(0.98, value));
    }

    private static ColorRatios MeasureColors(Bitmap image)
    {
        int beige = 0;
        int orange = 0;
        int purple = 0;
        int blue = 0;
        int green = 0;
        int total = image.Width * image.Height;

        for (int y = 0; y < image.Height; y++)
        {
            for (int x = 0; x < image.Width; x++)
            {
                Color pixel = image.GetPixel(x, y);
                if (IsArtifactPanelBeige(pixel))
                {
                    beige++;
                }
                if (IsArtifactHeaderOrange(pixel))
                {
                    orange++;
                }
                if (IsArtifactHeaderPurple(pixel))
                {
                    purple++;
                }
                if (IsArtifactHeaderBlue(pixel))
                {
                    blue++;
                }
                if (IsArtifactHeaderGreen(pixel))
                {
                    green++;
                }
            }
        }

        if (total == 0)
        {
            return new ColorRatios();
        }

        return new ColorRatios(
            Beige: beige / (double)total,
            Orange: orange / (double)total,
            Purple: purple / (double)total,
            Blue: blue / (double)total,
            Green: green / (double)total);
    }

    private static bool IsArtifactPanelBeige(Color pixel)
    {
        return pixel.R > 150 && pixel.G > 125 && pixel.B > 95 && Math.Abs(pixel.R - pixel.G) < 85 && pixel.R > pixel.B;
    }

    private static bool IsArtifactHeaderOrange(Color pixel)
    {
        return pixel.R > 140 && pixel.G is > 65 and < 170 && pixel.B < 120;
    }

    private static bool IsArtifactHeaderPurple(Color pixel)
    {
        return pixel.R > 100 && pixel.B > 115 && pixel.G < 135;
    }

    private static bool IsArtifactHeaderBlue(Color pixel)
    {
        return pixel.B > 115 && pixel.G > 80 && pixel.R < 145;
    }

    private static bool IsArtifactHeaderGreen(Color pixel)
    {
        return pixel.G > 105 && pixel.R < 150 && pixel.B < 160 && pixel.G >= pixel.R && pixel.G >= pixel.B;
    }

    private sealed record ColorRatios(double Beige = 0, double Orange = 0, double Purple = 0, double Blue = 0, double Green = 0);
}
