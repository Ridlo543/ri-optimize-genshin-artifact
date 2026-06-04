using System.Drawing;
using System.Drawing.Imaging;

namespace GenshinArtifactScanner.Win;

internal static class ScreenCapture
{
    public static Bitmap CaptureClient(GameWindowInfo window)
    {
        Bitmap bitmap = new(window.ClientWidth, window.ClientHeight, PixelFormat.Format24bppRgb);
        using Graphics graphics = Graphics.FromImage(bitmap);
        graphics.CopyFromScreen(window.ScreenX, window.ScreenY, 0, 0, bitmap.Size);

        using SolidBrush brush = new(Color.Black);
        Rectangle uidRegion = new(
            x: (int)(1070 / 1280.0 * bitmap.Width),
            y: (int)(695 / 720.0 * bitmap.Height),
            width: bitmap.Width,
            height: bitmap.Height);
        graphics.FillRectangle(brush, uidRegion);

        return bitmap;
    }

    public static Bitmap CropArtifactPanel(Bitmap windowBitmap)
    {
        Rectangle cardRectangle = new(
            x: (int)(windowBitmap.Width * 0.6807),
            y: (int)(windowBitmap.Height * 0.0989),
            width: (int)(windowBitmap.Width * 0.2573),
            height: (int)(windowBitmap.Height * 0.8022));

        Bitmap crop = new(cardRectangle.Width, cardRectangle.Height, PixelFormat.Format24bppRgb);
        using Graphics graphics = Graphics.FromImage(crop);
        graphics.DrawImage(windowBitmap, new Rectangle(0, 0, crop.Width, crop.Height), cardRectangle, GraphicsUnit.Pixel);
        return crop;
    }
}
