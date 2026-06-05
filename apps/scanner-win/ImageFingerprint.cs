using System.Drawing;
using System.Drawing.Imaging;
using System.Security.Cryptography;

namespace GenshinArtifactScanner.Win;

internal static class ImageFingerprint
{
    public static string ComputeHash(Bitmap image)
    {
        ArgumentNullException.ThrowIfNull(image);

        using MemoryStream stream = new();
        image.Save(stream, ImageFormat.Png);
        return Convert.ToHexString(SHA256.HashData(stream.ToArray())).ToLowerInvariant();
    }
}
