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
        // A bag card always has a warm beige body beneath the colored rarity header.
        // Require beige > 0.30 for the color-based checks: the "Artifact Recommendations"
        // character sub-screen has beige 0.15–0.25 from warm artifact art + green set bonus
        // text, which was triggering (hasBeige && green > 0.18) and misfiring as BagCardProfile.
        // Bag cards consistently have beige > 0.40 from the stats body, so 0.30 is a safe gate.
        bool hasBeige = ratios.Beige > 0.30;
        return ratios.Beige > 0.4 ||
            (hasBeige && ratios.Orange > 0.08) ||
            (hasBeige && ratios.Purple > 0.12) ||
            (hasBeige && ratios.Blue > 0.18) ||
            (hasBeige && ratios.Green > 0.18);
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

    public static OcrFieldResult<string> ReadShortMainStat(Bitmap image, string? slotKey, string? imagePath = null)
    {
        ArgumentNullException.ThrowIfNull(image);

        if (slotKey is not ("sands" or "goblet" or "circlet"))
        {
            return EmptyShortMainStat(imagePath);
        }

        Rectangle textRect = FindLightTextBounds(image, Math.Max(48, image.Width / 2));
        if (textRect.Width <= 0 || textRect.Height <= 0)
        {
            return EmptyShortMainStat(imagePath);
        }

        using Bitmap text = ImageCropper.Crop(image, textRect);
        double[] columnInk = MeasureColumnInk(text);
        int strokes = CountInkRuns(columnInk, 0.12);
        double leftInk = Sum(columnInk, 0, columnInk.Length / 3);
        double centerInk = Sum(columnInk, columnInk.Length / 3, columnInk.Length * 2 / 3);
        double rightInk = Sum(columnInk, columnInk.Length * 2 / 3, columnInk.Length);

        string? value = null;
        if (strokes >= 3 && centerInk > leftInk * 0.55 && rightInk > leftInk * 0.35)
        {
            value = "def_";
        }

        return value is null
            ? EmptyShortMainStat(imagePath)
            : new OcrFieldResult<string>
            {
                Field = "mainStatKey",
                Value = value,
                RawText = "visual-short-main-stat",
                Confidence = 0.62,
                ImagePath = imagePath is null ? null : Path.GetFullPath(imagePath)
            };
    }

    private static double Clamp(double value)
    {
        return Math.Max(0.5, Math.Min(0.98, value));
    }

    private static OcrFieldResult<string> EmptyShortMainStat(string? imagePath)
    {
        return new OcrFieldResult<string>
        {
            Field = "mainStatKey",
            Value = null,
            RawText = string.Empty,
            Confidence = 0,
            ImagePath = imagePath is null ? null : Path.GetFullPath(imagePath)
        };
    }

    private static Rectangle FindLightTextBounds(Bitmap image, int maxWidth)
    {
        int minX = image.Width;
        int minY = image.Height;
        int maxX = -1;
        int maxY = -1;
        int boundedWidth = Math.Min(image.Width, maxWidth);

        for (int y = 0; y < image.Height; y++)
        {
            for (int x = 0; x < boundedWidth; x++)
            {
                if (IsBrightText(image.GetPixel(x, y)))
                {
                    minX = Math.Min(minX, x);
                    minY = Math.Min(minY, y);
                    maxX = Math.Max(maxX, x);
                    maxY = Math.Max(maxY, y);
                }
            }
        }

        if (maxX < minX || maxY < minY)
        {
            return Rectangle.Empty;
        }

        const int padding = 3;
        return Rectangle.FromLTRB(
            Math.Max(0, minX - padding),
            Math.Max(0, minY - padding),
            Math.Min(image.Width, maxX + padding + 1),
            Math.Min(image.Height, maxY + padding + 1));
    }

    private static double[] MeasureColumnInk(Bitmap image)
    {
        double[] ink = new double[image.Width];
        for (int x = 0; x < image.Width; x++)
        {
            int pixels = 0;
            for (int y = 0; y < image.Height; y++)
            {
                if (IsBrightText(image.GetPixel(x, y)))
                {
                    pixels++;
                }
            }

            ink[x] = pixels / (double)image.Height;
        }

        return ink;
    }

    private static int CountInkRuns(double[] values, double threshold)
    {
        int runs = 0;
        bool inRun = false;
        foreach (double value in values)
        {
            if (value > threshold)
            {
                if (!inRun)
                {
                    runs++;
                    inRun = true;
                }
            }
            else
            {
                inRun = false;
            }
        }

        return runs;
    }

    private static double Sum(double[] values, int start, int end)
    {
        double sum = 0;
        for (int index = start; index < end; index++)
        {
            sum += values[index];
        }

        return sum;
    }

    private static bool IsBrightText(Color pixel)
    {
        return pixel.R > 185 && pixel.G > 175 && pixel.B > 155;
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
