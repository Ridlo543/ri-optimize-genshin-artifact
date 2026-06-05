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
