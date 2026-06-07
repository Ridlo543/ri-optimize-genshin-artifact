using System.Drawing;
using System.Drawing.Imaging;

namespace GenshinArtifactScanner.Win;

internal static class ArtifactImagePreprocessor
{
    public static Bitmap PreprocessSubstats(Bitmap source)
    {
        ArgumentNullException.ThrowIfNull(source);
        return ApplyColorMatrix(source, CreateSubstatMatrix());
    }

    public static Bitmap PreprocessText(Bitmap source)
    {
        ArgumentNullException.ThrowIfNull(source);
        using Bitmap scaled = Scale(source, 3);
        return ApplyColorMatrix(scaled, CreateSubstatMatrix());
    }

    public static Bitmap PreprocessLevel(Bitmap source)
    {
        ArgumentNullException.ThrowIfNull(source);

        using Bitmap focused = CropDarkPill(source);
        using Bitmap scaled = Scale(focused, 5);
        return ThresholdLightText(scaled);
    }

    public static string SaveDebugImage(Bitmap image, string sourcePath, string fieldName)
    {
        ArgumentNullException.ThrowIfNull(image);

        Directory.CreateDirectory(Path.Combine("logs", "scanner", "debug"));
        string safeName = Path.GetFileNameWithoutExtension(sourcePath);
        if (string.IsNullOrWhiteSpace(safeName))
        {
            safeName = "image";
        }
        string outputPath = Path.Combine("logs", "scanner", "debug", $"{safeName}-{fieldName}-preprocessed.png");
        image.Save(outputPath, ImageFormat.Png);
        return Path.GetFullPath(outputPath);
    }

    private static Bitmap ApplyColorMatrix(Bitmap source, ColorMatrix matrix)
    {
        Bitmap output = new(source.Width, source.Height, PixelFormat.Format24bppRgb);
        using Graphics graphics = Graphics.FromImage(output);
        using ImageAttributes attributes = new();
        attributes.SetColorMatrix(matrix);
        graphics.DrawImage(
            source,
            new Rectangle(0, 0, output.Width, output.Height),
            0,
            0,
            source.Width,
            source.Height,
            GraphicsUnit.Pixel,
            attributes);
        return output;
    }

    private static Bitmap Scale(Bitmap source, int factor)
    {
        Bitmap output = new(source.Width * factor, source.Height * factor, PixelFormat.Format24bppRgb);
        using Graphics graphics = Graphics.FromImage(output);
        graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        graphics.DrawImage(source, new Rectangle(0, 0, output.Width, output.Height));
        return output;
    }

    private static Bitmap CropDarkPill(Bitmap source)
    {
        bool[,] darkMask = new bool[source.Width, source.Height];
        for (int y = 0; y < source.Height; y++)
        {
            for (int x = 0; x < source.Width; x++)
            {
                Color pixel = source.GetPixel(x, y);
                darkMask[x, y] = pixel.R < 95 && pixel.G < 95 && pixel.B < 110;
            }
        }

        Rectangle crop = FindTopLeftDarkComponent(darkMask, source.Width, source.Height);
        if (crop == Rectangle.Empty)
        {
            return CopyBitmap(source);
        }

        const int padding = 4;
        crop = Rectangle.FromLTRB(
            Math.Max(0, crop.Left - padding),
            Math.Max(0, crop.Top - padding),
            Math.Min(source.Width, crop.Right + padding),
            Math.Min(source.Height, crop.Bottom + padding));

        return CopyBitmap(source, crop);
    }

    private static Rectangle FindTopLeftDarkComponent(bool[,] darkMask, int width, int height)
    {
        bool[,] visited = new bool[width, height];
        Rectangle best = Rectangle.Empty;
        int bestScore = int.MaxValue;
        int bestArea = -1;

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                if (!darkMask[x, y] || visited[x, y])
                {
                    continue;
                }

                Queue<Point> queue = new();
                queue.Enqueue(new Point(x, y));
                visited[x, y] = true;

                int minX = x;
                int minY = y;
                int maxX = x;
                int maxY = y;
                int count = 0;

                while (queue.Count > 0)
                {
                    Point point = queue.Dequeue();
                    count++;
                    minX = Math.Min(minX, point.X);
                    minY = Math.Min(minY, point.Y);
                    maxX = Math.Max(maxX, point.X);
                    maxY = Math.Max(maxY, point.Y);

                    EnqueueDarkNeighbor(point.X - 1, point.Y);
                    EnqueueDarkNeighbor(point.X + 1, point.Y);
                    EnqueueDarkNeighbor(point.X, point.Y - 1);
                    EnqueueDarkNeighbor(point.X, point.Y + 1);
                }

                Rectangle component = Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
                int score = minY * 10 + minX;
                if (count > bestArea || (count == bestArea && score < bestScore))
                {
                    best = component;
                    bestScore = score;
                    bestArea = count;
                }

                void EnqueueDarkNeighbor(int nextX, int nextY)
                {
                    if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height)
                    {
                        return;
                    }
                    if (visited[nextX, nextY] || !darkMask[nextX, nextY])
                    {
                        return;
                    }

                    visited[nextX, nextY] = true;
                    queue.Enqueue(new Point(nextX, nextY));
                }
            }
        }

        return best;
    }

    private static Bitmap ThresholdLightText(Bitmap source)
    {
        Bitmap output = new(source.Width, source.Height, PixelFormat.Format24bppRgb);
        for (int y = 0; y < source.Height; y++)
        {
            for (int x = 0; x < source.Width; x++)
            {
                Color pixel = source.GetPixel(x, y);
                int brightness = (pixel.R + pixel.G + pixel.B) / 3;
                Color color = brightness > 150 ? Color.White : Color.Black;
                output.SetPixel(x, y, color);
            }
        }

        return output;
    }

    private static Bitmap CopyBitmap(Bitmap source)
    {
        return CopyBitmap(source, new Rectangle(0, 0, source.Width, source.Height));
    }

    private static Bitmap CopyBitmap(Bitmap source, Rectangle sourceRect)
    {
        Bitmap output = new(sourceRect.Width, sourceRect.Height, PixelFormat.Format24bppRgb);
        using Graphics graphics = Graphics.FromImage(output);
        graphics.DrawImage(source, new Rectangle(0, 0, output.Width, output.Height), sourceRect, GraphicsUnit.Pixel);
        return output;
    }

    private static ColorMatrix CreateSubstatMatrix()
    {
        const float contrast = 1.85f;
        const float brightness = -30f / 255f;
        float translate = (1f - contrast) / 2f + brightness;

        return new ColorMatrix(
        [
            [0.2125f * contrast, 0.2125f * contrast, 0.2125f * contrast, 0f, 0f],
            [0.7154f * contrast, 0.7154f * contrast, 0.7154f * contrast, 0f, 0f],
            [0.0721f * contrast, 0.0721f * contrast, 0.0721f * contrast, 0f, 0f],
            [0f, 0f, 0f, 1f, 0f],
            [translate, translate, translate, 0f, 1f]
        ]);
    }
}
