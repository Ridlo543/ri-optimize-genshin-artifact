using System.Drawing;

namespace GenshinArtifactScanner.Win;

internal static class ScreenStateDetector
{
    public static ScreenStateInfo Detect(Bitmap screenshot)
    {
        ArgumentNullException.ThrowIfNull(screenshot);

        double bagTitleOrange = Ratio(screenshot, Rect(1308, 120, 494, 57), IsArtifactOrange);
        double bagPanelBeige = Ratio(screenshot, Rect(1308, 120, 494, 962), IsArtifactPanelBeige);
        // The bag card stats body is always beige/cream regardless of the artifact's rarity
        // header color. Blue-themed artifact pieces (e.g. Celestial Gift plume/sands) can have
        // a non-orange title bar, so bagTitleOrange alone is an unreliable discriminant.
        // Fall back to beige alone (> 0.40) which is reliable: character panels have near-zero
        // beige (dark teal/red/purple backgrounds), while bag cards always have a large
        // cream-colored stats body that drives beige well above 0.40.
        if ((bagTitleOrange > 0.45 && bagPanelBeige > 0.45) || bagPanelBeige > 0.40)
        {
            return new ScreenStateInfo
            {
                Code = ScreenStateCodes.ArtifactBagDetail,
                ReadyForArtifactOcr = true,
                Confidence = Clamp01((bagTitleOrange + bagPanelBeige) / 2),
                Message = "Artifact bag detail panel detected."
            };
        }

        double rightRed = Ratio(screenshot, Rect(1420, 95, 470, 720), IsCharacterArtifactRed);
        double centerRed = Ratio(screenshot, Rect(670, 120, 660, 900), IsCharacterArtifactRed);
        double rightGreenText = Ratio(screenshot, Rect(1460, 520, 420, 430), IsCharacterSetBonusGreen);
        double rightTitleLight = Ratio(screenshot, Rect(1460, 110, 420, 130), IsCharacterTitleLight);
        if ((rightRed > 0.35 && centerRed > 0.25) ||
            (rightRed > 0.14 && rightTitleLight > 0.035 && rightGreenText > 0.035) ||
            // Non-red character panel (any color theme): the right panel header still has
            // substantial bright white text (name + slot + main stat) even when rightRed is
            // near zero. Bag card title text is gold/amber and fails the B>130 check, so the
            // ratio stays low there even though it overlaps the same screen region.
            // Guard: bag cards reach this point only when their beige is 0.20–0.40 (edge cases).
            // If bagPanelBeige >= 0.25 here the panel is likely still a bag card; skip.
            (rightTitleLight > 0.06 && bagPanelBeige < 0.25))
        {
            return new ScreenStateInfo
            {
                Code = ScreenStateCodes.CharacterArtifactDetail,
                ReadyForArtifactOcr = true,
                Confidence = Clamp01(Math.Max((rightRed + centerRed) / 2, (rightRed + rightTitleLight + rightGreenText) / 3)),
                Message = "Character artifact detail panel detected."
            };
        }

        double topNavDark = Ratio(screenshot, Rect(0, 0, 520, 130), IsInventoryDarkBlue);
        double gridGold = Ratio(screenshot, Rect(80, 145, 1200, 760), IsArtifactCardGold);
        if (topNavDark > 0.55 && gridGold > 0.20)
        {
            return new ScreenStateInfo
            {
                Code = ScreenStateCodes.ArtifactBagGrid,
                ReadyForArtifactOcr = false,
                Confidence = Clamp01((topNavDark + gridGold) / 2),
                Message = "Artifact inventory grid detected, but no artifact detail panel is visible."
            };
        }

        double paimonLightMenu = Ratio(screenshot, Rect(0, 60, 520, 820), IsPaimonMenuLight);
        if (paimonLightMenu > 0.35 && gridGold < 0.12)
        {
            return new ScreenStateInfo
            {
                Code = ScreenStateCodes.PaimonMenu,
                ReadyForArtifactOcr = false,
                Confidence = Clamp01(paimonLightMenu),
                Message = "Paimon or main menu detected. Open Artifact Bag with B or Character with C, then open artifact details."
            };
        }

        return new ScreenStateInfo
        {
            Code = ScreenStateCodes.UnknownGameScreen,
            ReadyForArtifactOcr = false,
            Confidence = 0.5,
            Message = "Open Artifact Bag with B or Character with C, then open artifact details."
        };
    }

    private static RectangleF Rect(float x, float y, float width, float height)
    {
        return new RectangleF(x / 1920f, y / 1200f, width / 1920f, height / 1200f);
    }

    private static double Ratio(Bitmap screenshot, RectangleF normalizedRect, Func<Color, bool> predicate)
    {
        Rectangle rectangle = ImageCropper.Scale(normalizedRect, screenshot.Width, screenshot.Height);
        rectangle = Rectangle.Intersect(new Rectangle(Point.Empty, screenshot.Size), rectangle);
        if (rectangle.Width <= 0 || rectangle.Height <= 0)
        {
            return 0;
        }

        int matches = 0;
        int total = rectangle.Width * rectangle.Height;
        for (int y = rectangle.Top; y < rectangle.Bottom; y++)
        {
            for (int x = rectangle.Left; x < rectangle.Right; x++)
            {
                if (predicate(screenshot.GetPixel(x, y)))
                {
                    matches++;
                }
            }
        }

        return total == 0 ? 0 : matches / (double)total;
    }

    private static bool IsArtifactOrange(Color pixel)
    {
        return pixel.R > 140 && pixel.G is > 55 and < 160 && pixel.B < 110 && pixel.R > pixel.G * 1.25;
    }

    private static bool IsArtifactPanelBeige(Color pixel)
    {
        return pixel.R > 150 && pixel.G > 125 && pixel.B > 95 && Math.Abs(pixel.R - pixel.G) < 85 && pixel.R > pixel.B;
    }

    private static bool IsArtifactCardGold(Color pixel)
    {
        return pixel.R > 145 && pixel.G is > 70 and < 170 && pixel.B < 110 && pixel.R > pixel.G * 1.1;
    }

    private static bool IsInventoryDarkBlue(Color pixel)
    {
        return pixel.B > 45 && pixel.R < 95 && pixel.G < 105;
    }

    private static bool IsCharacterArtifactRed(Color pixel)
    {
        return pixel.R > 100 && pixel.G < 100 && pixel.B < 95;
    }

    private static bool IsCharacterSetBonusGreen(Color pixel)
    {
        return pixel.G > 145 && pixel.R < 180 && pixel.B < 150 && pixel.G > pixel.R * 1.05 && pixel.G > pixel.B * 1.15;
    }

    private static bool IsCharacterTitleLight(Color pixel)
    {
        return pixel.R > 190 && pixel.G > 170 && pixel.B > 130 && Math.Abs(pixel.R - pixel.G) < 70;
    }

    private static bool IsPaimonMenuLight(Color pixel)
    {
        return pixel.R > 185 && pixel.G > 170 && pixel.B > 145 && Math.Abs(pixel.R - pixel.G) < 45;
    }

    private static double Clamp01(double value)
    {
        return Math.Max(0, Math.Min(1, value));
    }

    public static ScanRegion? GetRecommendedRegion(string screenStateCode)
    {
        return screenStateCode switch
        {
            // Bag inventory detail panel: normalized coords derived from
            // ScreenshotArtifactParser.BagInventoryProfile.PanelRect
            // which is (1308, 120, 494, 962) ÷ 1920×1200.
            ScreenStateCodes.ArtifactBagDetail => new ScanRegion
            {
                X = 1308.0 / 1920.0,
                Y = 120.0 / 1200.0,
                Width = 494.0 / 1920.0,
                Height = 962.0 / 1200.0,
                Unit = "normalized-client"
            },

            // Character equipment detail panel: generous coverage derived from
            // ScreenshotArtifactParser.EquippedCharacterProfile field bounds
            // (x: 1463..1883, y: 119..1090) with padding from detection region
            // rightRed: Rect(1420, 95, 470, 720) ÷ 1920×1200.
            ScreenStateCodes.CharacterArtifactDetail => new ScanRegion
            {
                X = (1420.0 - 5.0) / 1920.0,
                Y = (95.0 - 5.0) / 1200.0,
                Width = (470.0 + 10.0) / 1920.0,
                Height = (720.0 + 280.0) / 1200.0,
                Unit = "normalized-client"
            },

            _ => null
        };
    }
}
