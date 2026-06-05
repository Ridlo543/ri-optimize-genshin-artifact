using System.Drawing;
using System.Drawing.Imaging;

namespace GenshinArtifactScanner.Win;

internal static class ImageCropper
{
    public static Bitmap Crop(Bitmap source, Rectangle rectangle)
    {
        ArgumentNullException.ThrowIfNull(source);

        Rectangle bounded = Rectangle.Intersect(new Rectangle(Point.Empty, source.Size), rectangle);
        if (bounded.Width <= 0 || bounded.Height <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(rectangle), $"Crop rectangle is outside image bounds: {rectangle}");
        }

        Bitmap crop = new(bounded.Width, bounded.Height, PixelFormat.Format24bppRgb);
        using Graphics graphics = Graphics.FromImage(crop);
        graphics.DrawImage(source, new Rectangle(0, 0, crop.Width, crop.Height), bounded, GraphicsUnit.Pixel);
        return crop;
    }

    public static Rectangle Scale(RectangleF normalized, int width, int height)
    {
        return new Rectangle(
            x: (int)Math.Round(normalized.X * width),
            y: (int)Math.Round(normalized.Y * height),
            width: (int)Math.Round(normalized.Width * width),
            height: (int)Math.Round(normalized.Height * height));
    }

    public static string Format(Rectangle rectangle)
    {
        return $"{rectangle.X},{rectangle.Y},{rectangle.Width},{rectangle.Height}";
    }
}
