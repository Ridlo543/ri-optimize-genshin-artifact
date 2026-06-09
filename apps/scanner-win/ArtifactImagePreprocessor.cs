using System.Drawing;
using System.Drawing.Imaging;

namespace GenshinArtifactScanner.Win;

internal static unsafe class ArtifactImagePreprocessor
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

    public static Bitmap PreprocessSlot(Bitmap source)
    {
        ArgumentNullException.ThrowIfNull(source);
        // Contrast(80) -> Grayscale -> Invert (IK-style, no scaling)
        Bitmap contrast = AdjustContrast(source, 80);
        Bitmap gray = ToGrayscale(contrast);
        contrast.Dispose();
        Invert(gray);
        return gray;
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
        BitmapData data = source.LockBits(new Rectangle(0, 0, source.Width, source.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        try
        {
            byte* ptr = (byte*)data.Scan0;
            int stride = data.Stride;
            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    int offset = y * stride + x * 3;
                    darkMask[x, y] = ptr[offset + 2] < 95 && ptr[offset + 1] < 95 && ptr[offset] < 110;
                }
            }
        }
        finally
        {
            source.UnlockBits(data);
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

    private static int ComputeOtsuThreshold(Bitmap source)
    {
        int[] histogram = new int[256];
        BitmapData data = source.LockBits(new Rectangle(0, 0, source.Width, source.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        try
        {
            byte* ptr = (byte*)data.Scan0;
            int stride = data.Stride;
            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    int offset = y * stride + x * 3;
                    int brightness = (ptr[offset] + ptr[offset + 1] + ptr[offset + 2]) / 3;
                    histogram[brightness]++;
                }
            }
        }
        finally
        {
            source.UnlockBits(data);
        }

        int total = source.Width * source.Height;
        double sum = 0;
        for (int i = 0; i < 256; i++)
        {
            sum += i * histogram[i];
        }

        double sumB = 0;
        int wB = 0;
        double maxVariance = 0;
        int threshold = 0;

        for (int t = 0; t < 256; t++)
        {
            wB += histogram[t];
            if (wB == 0) continue;
            int wF = total - wB;
            if (wF == 0) break;

            sumB += t * histogram[t];
            double mB = sumB / wB;
            double mF = (sum - sumB) / wF;
            double variance = wB * wF * (mB - mF) * (mB - mF);
            if (variance > maxVariance)
            {
                maxVariance = variance;
                threshold = t;
            }
        }

        return threshold;
    }

    private static Bitmap ThresholdLightText(Bitmap source)
    {
        int otsuThreshold = ComputeOtsuThreshold(source);
        Bitmap output = new(source.Width, source.Height, PixelFormat.Format24bppRgb);
        BitmapData srcData = source.LockBits(new Rectangle(0, 0, source.Width, source.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        BitmapData dstData = output.LockBits(new Rectangle(0, 0, output.Width, output.Height), ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
        try
        {
            byte* srcPtr = (byte*)srcData.Scan0;
            byte* dstPtr = (byte*)dstData.Scan0;
            int stride = srcData.Stride;
            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    int offset = y * stride + x * 3;
                    int brightness = (srcPtr[offset] + srcPtr[offset + 1] + srcPtr[offset + 2]) / 3;
                    byte value = brightness > otsuThreshold ? (byte)255 : (byte)0;
                    dstPtr[offset] = value;
                    dstPtr[offset + 1] = value;
                    dstPtr[offset + 2] = value;
                }
            }
        }
        finally
        {
            source.UnlockBits(srcData);
            output.UnlockBits(dstData);
        }
        return output;
    }

    private static Bitmap AdjustContrast(Bitmap source, int contrastValue)
    {
        double factor = (259.0 * (contrastValue + 255.0)) / (255.0 * (259.0 - contrastValue));
        Bitmap output = new(source.Width, source.Height, PixelFormat.Format24bppRgb);
        BitmapData srcData = source.LockBits(new Rectangle(0, 0, source.Width, source.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        BitmapData dstData = output.LockBits(new Rectangle(0, 0, output.Width, output.Height), ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
        try
        {
            byte* srcPtr = (byte*)srcData.Scan0;
            byte* dstPtr = (byte*)dstData.Scan0;
            int stride = srcData.Stride;
            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    int offset = y * stride + x * 3;
                    int r = ClampByte((int)(factor * (srcPtr[offset + 2] - 128) + 128));
                    int g = ClampByte((int)(factor * (srcPtr[offset + 1] - 128) + 128));
                    int b = ClampByte((int)(factor * (srcPtr[offset] - 128) + 128));
                    dstPtr[offset] = (byte)b;
                    dstPtr[offset + 1] = (byte)g;
                    dstPtr[offset + 2] = (byte)r;
                }
            }
        }
        finally
        {
            source.UnlockBits(srcData);
            output.UnlockBits(dstData);
        }
        return output;
    }

    private static Bitmap ToGrayscale(Bitmap source)
    {
        Bitmap output = new(source.Width, source.Height, PixelFormat.Format24bppRgb);
        BitmapData srcData = source.LockBits(new Rectangle(0, 0, source.Width, source.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        BitmapData dstData = output.LockBits(new Rectangle(0, 0, output.Width, output.Height), ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
        try
        {
            byte* srcPtr = (byte*)srcData.Scan0;
            byte* dstPtr = (byte*)dstData.Scan0;
            int stride = srcData.Stride;
            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    int offset = y * stride + x * 3;
                    int l = (int)(0.2125 * srcPtr[offset + 2] + 0.7154 * srcPtr[offset + 1] + 0.0721 * srcPtr[offset]);
                    byte gray = ClampByte(l);
                    dstPtr[offset] = gray;
                    dstPtr[offset + 1] = gray;
                    dstPtr[offset + 2] = gray;
                }
            }
        }
        finally
        {
            source.UnlockBits(srcData);
            output.UnlockBits(dstData);
        }
        return output;
    }

    private static void Invert(Bitmap image)
    {
        BitmapData data = image.LockBits(new Rectangle(0, 0, image.Width, image.Height), ImageLockMode.ReadWrite, PixelFormat.Format24bppRgb);
        try
        {
            byte* ptr = (byte*)data.Scan0;
            int stride = data.Stride;
            for (int y = 0; y < image.Height; y++)
            {
                for (int x = 0; x < image.Width; x++)
                {
                    int offset = y * stride + x * 3;
                    ptr[offset] = (byte)(255 - ptr[offset]);
                    ptr[offset + 1] = (byte)(255 - ptr[offset + 1]);
                    ptr[offset + 2] = (byte)(255 - ptr[offset + 2]);
                }
            }
        }
        finally
        {
            image.UnlockBits(data);
        }
    }

    private static void ImageThreshold(Bitmap image, int threshold)
    {
        BitmapData data = image.LockBits(new Rectangle(0, 0, image.Width, image.Height), ImageLockMode.ReadWrite, PixelFormat.Format24bppRgb);
        try
        {
            byte* ptr = (byte*)data.Scan0;
            int stride = data.Stride;
            for (int y = 0; y < image.Height; y++)
            {
                for (int x = 0; x < image.Width; x++)
                {
                    int offset = y * stride + x * 3;
                    int brightness = (ptr[offset] + ptr[offset + 1] + ptr[offset + 2]) / 3;
                    byte value = brightness > threshold ? (byte)255 : (byte)0;
                    ptr[offset] = value;
                    ptr[offset + 1] = value;
                    ptr[offset + 2] = value;
                }
            }
        }
        finally
        {
            image.UnlockBits(data);
        }
    }

    private static byte ClampByte(int value)
    {
        return (byte)Math.Clamp(value, 0, 255);
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
