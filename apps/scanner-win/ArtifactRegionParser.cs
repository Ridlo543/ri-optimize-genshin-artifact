using System.Drawing;
using System.Drawing.Imaging;

namespace GenshinArtifactScanner.Win;

internal sealed class ArtifactRegionParser(ArtifactOcrService ocrService)
{
    private static readonly RegionLayoutProfile BagCardProfile = new(
        "roi-bag-card",
        new RegionFieldRectangles(
            Name: RectFromPanel(0, 0, 494, 57, 494, 962),
            Slot: RectFromPanel(31, 57, 234, 77, 494, 962),
            MainStat: RectFromPanel(31, 151, 225, 32, 494, 962),
            Level: RectFromPanel(31, 312, 69, 33, 494, 962),
            Lock: RectFromPanel(369, 303, 47, 47, 494, 962),
            Substats: RectFromPanel(31, 350, 409, 151, 494, 962),
            Equipped: RectFromPanel(31, 904, 420, 55, 494, 962)));

    private static readonly RegionLayoutProfile CharacterPanelProfile = new(
        "roi-character-panel",
        new RegionFieldRectangles(
            Name: RectFromPanel(11, 29, 420, 60, 466, 1000),
            Slot: RectFromPanel(11, 86, 360, 42, 466, 1000),
            MainStat: RectFromPanel(11, 120, 260, 58, 466, 1000),
            Level: RectFromPanel(11, 213, 120, 50, 466, 1000),
            Lock: RectFromPanel(332, 79, 47, 47, 466, 1000),
            Substats: RectFromPanel(11, 258, 455, 180, 466, 1000),
            Equipped: RectFromPanel(11, 940, 420, 60, 466, 1000)));

    private readonly ArtifactOcrService ocrService = ocrService ?? throw new ArgumentNullException(nameof(ocrService));

    public ScanResult ParseFile(string screenshotPath, ScanRegion region, bool writeDebugImage = false)
    {
        if (string.IsNullOrWhiteSpace(screenshotPath))
        {
            throw new ArgumentException("Screenshot path is required.", nameof(screenshotPath));
        }
        if (!File.Exists(screenshotPath))
        {
            throw new FileNotFoundException("Screenshot image was not found.", screenshotPath);
        }

        using Bitmap screenshot = new(screenshotPath);
        return ParseBitmap(screenshot, region, "fixture", "region-artifact", Path.GetFullPath(screenshotPath), null, writeDebugImage);
    }

    public ScanResult ParseBitmap(
        Bitmap screenshot,
        ScanRegion region,
        string source,
        string mode,
        string? screenshotPath = null,
        string? regionImagePath = null,
        bool writeDebugImage = false)
    {
        ArgumentNullException.ThrowIfNull(screenshot);
        ScanRegionParser.Validate(region);

        string screenshotHash = ImageFingerprint.ComputeHash(screenshot);
        using Bitmap panel = CropRegion(screenshot, region);
        string regionHash = ImageFingerprint.ComputeHash(panel);
        SaveRegionImage(panel, regionImagePath);

        RegionLayoutProfile? profile = DetectProfile(panel);
        if (profile is null)
        {
            return CreateReviewRoiResult(screenshot, region, source, mode, screenshotPath, regionImagePath, screenshotHash, regionHash);
        }

        using FieldCrops crops = CropFields(panel, profile);
        OcrFieldResult<string> slot = ocrService.ReadSlotKey(crops.Slot, writeDebugImage: writeDebugImage);
        OcrFieldResult<string> mainStat = ocrService.ReadMainStatKey(crops.MainStat, slot.Value, writeDebugImage: writeDebugImage);
        OcrFieldResult<int> level = ocrService.ReadLevel(crops.Level, writeDebugImage: writeDebugImage);
        OcrFieldResult<string> setKey = ocrService.ReadSetKey(crops.Name, writeDebugImage: writeDebugImage);
        OcrFieldResult<bool> locked = ArtifactVisualClassifier.ReadLock(crops.Lock);
        OcrFieldResult<string> location = ocrService.ReadLocation(crops.Equipped, writeDebugImage: writeDebugImage);
        OcrSubstatsResult substats = ocrService.ReadSubstats(crops.Substats, writeDebugImage: writeDebugImage);

        List<string> missingFields = FindMissingFields(setKey, slot, mainStat, level, substats);
        GoodArtifact? artifact = missingFields.Count == 0
            ? new GoodArtifact
            {
                SetKey = setKey.Value,
                SlotKey = slot.Value ?? string.Empty,
                Rarity = EstimateRarity(crops.Name),
                Level = level.Value,
                MainStatKey = mainStat.Value ?? string.Empty,
                Substats = substats.Substats,
                UnactivatedSubstats = substats.UnactivatedSubstats,
                Lock = locked.Value,
                Location = location.Value ?? string.Empty
            }
            : null;

        ScreenStateInfo screenState = new()
        {
            Code = profile == BagCardProfile ? ScreenStateCodes.ArtifactBagDetail : ScreenStateCodes.CharacterArtifactDetail,
            ReadyForArtifactOcr = true,
            Confidence = 0.9,
            Message = "Artifact ROI detected."
        };

        return new ScanResult
        {
            Source = source,
            Mode = mode,
            Confidence = new Confidence
            {
                SetKey = setKey.Confidence,
                SlotKey = slot.Confidence,
                MainStatKey = mainStat.Confidence,
                Level = level.Confidence,
                Substats = substats.Confidence,
                Lock = locked.Confidence,
                Equipped = string.IsNullOrWhiteSpace(location.Value) ? 0.75 : location.Confidence,
                Location = location.Confidence
            },
            Artifact = artifact,
            ScreenState = screenState,
            Capture = new CaptureInfo
            {
                Resolution = $"{screenshot.Width}x{screenshot.Height}",
                CapturedAt = DateTimeOffset.UtcNow.ToString("O"),
                Layout = profile.Name,
                ScreenshotImagePath = screenshotPath,
                RegionImagePath = regionImagePath,
                ScreenshotHash = screenshotHash,
                RegionHash = regionHash,
                Region = region
            },
            Diagnostics = new ScanDiagnostics
            {
                ScreenshotPath = screenshotPath,
                RawText = BuildRawText(setKey, slot, mainStat, level, location, substats),
                CropRectangles = crops.Rectangles
            },
            Error = missingFields.Count == 0 ? null : $"Region OCR missing required fields: {string.Join(", ", missingFields)}."
        };
    }

    public static ScanResult ClassifyFile(string screenshotPath, ScanRegion region)
    {
        if (string.IsNullOrWhiteSpace(screenshotPath))
        {
            throw new ArgumentException("Screenshot path is required.", nameof(screenshotPath));
        }
        if (!File.Exists(screenshotPath))
        {
            throw new FileNotFoundException("Screenshot image was not found.", screenshotPath);
        }

        using Bitmap screenshot = new(screenshotPath);
        return ClassifyBitmap(screenshot, region, "fixture", "region-classification", Path.GetFullPath(screenshotPath), null);
    }

    public static ScanResult ClassifyBitmap(Bitmap screenshot, ScanRegion region, string source, string mode, string? screenshotPath = null, string? regionImagePath = null)
    {
        ArgumentNullException.ThrowIfNull(screenshot);
        ScanRegionParser.Validate(region);

        string screenshotHash = ImageFingerprint.ComputeHash(screenshot);
        using Bitmap panel = CropRegion(screenshot, region);
        string regionHash = ImageFingerprint.ComputeHash(panel);
        SaveRegionImage(panel, regionImagePath);

        RegionLayoutProfile? profile = DetectProfile(panel);
        ScreenStateInfo screenState = profile is null
            ? ReviewRoiState()
            : new ScreenStateInfo
            {
                Code = profile == BagCardProfile ? ScreenStateCodes.ArtifactBagDetail : ScreenStateCodes.CharacterArtifactDetail,
                ReadyForArtifactOcr = true,
                Confidence = 0.9,
                Message = "Artifact ROI detected."
            };

        return new ScanResult
        {
            Source = source,
            Mode = mode,
            Confidence = new Confidence(),
            Artifact = null,
            ScreenState = screenState,
            Capture = new CaptureInfo
            {
                Resolution = $"{screenshot.Width}x{screenshot.Height}",
                CapturedAt = DateTimeOffset.UtcNow.ToString("O"),
                Layout = profile?.Name ?? "roi-review",
                ScreenshotImagePath = screenshotPath,
                RegionImagePath = regionImagePath,
                ScreenshotHash = screenshotHash,
                RegionHash = regionHash,
                Region = region
            }
        };
    }

    private static Bitmap CropRegion(Bitmap screenshot, ScanRegion region)
    {
        return ImageCropper.Crop(screenshot, ScanRegionParser.ToRectangle(region, screenshot));
    }

    private static RegionLayoutProfile? DetectProfile(Bitmap panel)
    {
        double beige = Ratio(panel, IsArtifactPanelBeige);
        if (beige > 0.45)
        {
            return BagCardProfile;
        }

        double red = Ratio(panel, IsCharacterArtifactRed);
        return red > 0.35 ? CharacterPanelProfile : null;
    }

    private static ScanResult CreateReviewRoiResult(Bitmap screenshot, ScanRegion region, string source, string mode, string? screenshotPath, string? regionImagePath, string screenshotHash, string regionHash)
    {
        ScreenStateInfo screenState = ReviewRoiState();
        return new ScanResult
        {
            Source = source,
            Mode = mode,
            Confidence = new Confidence(),
            Artifact = null,
            ScreenState = screenState,
            Capture = new CaptureInfo
            {
                Resolution = $"{screenshot.Width}x{screenshot.Height}",
                CapturedAt = DateTimeOffset.UtcNow.ToString("O"),
                Layout = "roi-review",
                ScreenshotImagePath = screenshotPath,
                RegionImagePath = regionImagePath,
                ScreenshotHash = screenshotHash,
                RegionHash = regionHash,
                Region = region
            },
            Error = screenState.Message
        };
    }

    private static ScreenStateInfo ReviewRoiState()
    {
        return new ScreenStateInfo
        {
            Code = ScreenStateCodes.UnknownGameScreen,
            ReadyForArtifactOcr = false,
            Confidence = 0.45,
            Message = "Review ROI: artifact panel was not detected inside the selected box."
        };
    }

    private static FieldCrops CropFields(Bitmap panel, RegionLayoutProfile profile)
    {
        Rectangle name = ImageCropper.Scale(profile.Fields.Name, panel.Width, panel.Height);
        Rectangle slot = ImageCropper.Scale(profile.Fields.Slot, panel.Width, panel.Height);
        Rectangle mainStat = ImageCropper.Scale(profile.Fields.MainStat, panel.Width, panel.Height);
        Rectangle level = ImageCropper.Scale(profile.Fields.Level, panel.Width, panel.Height);
        Rectangle locked = ImageCropper.Scale(profile.Fields.Lock, panel.Width, panel.Height);
        Rectangle substats = ImageCropper.Scale(profile.Fields.Substats, panel.Width, panel.Height);
        Rectangle equipped = ImageCropper.Scale(profile.Fields.Equipped, panel.Width, panel.Height);

        return new FieldCrops(
            Name: ImageCropper.Crop(panel, name),
            Slot: ImageCropper.Crop(panel, slot),
            MainStat: ImageCropper.Crop(panel, mainStat),
            Level: ImageCropper.Crop(panel, level),
            Lock: ImageCropper.Crop(panel, locked),
            Substats: ImageCropper.Crop(panel, substats),
            Equipped: ImageCropper.Crop(panel, equipped),
            Rectangles: new Dictionary<string, string>
            {
                ["layout"] = profile.Name,
                ["name"] = ImageCropper.Format(name),
                ["slot"] = ImageCropper.Format(slot),
                ["mainStat"] = ImageCropper.Format(mainStat),
                ["level"] = ImageCropper.Format(level),
                ["lock"] = ImageCropper.Format(locked),
                ["substats"] = ImageCropper.Format(substats),
                ["equipped"] = ImageCropper.Format(equipped)
            });
    }

    private static List<string> FindMissingFields(
        OcrFieldResult<string> setKey,
        OcrFieldResult<string> slot,
        OcrFieldResult<string> mainStat,
        OcrFieldResult<int> level,
        OcrSubstatsResult substats)
    {
        List<string> missing = [];
        if (string.IsNullOrWhiteSpace(setKey.Value))
        {
            missing.Add("setKey");
        }
        if (string.IsNullOrWhiteSpace(slot.Value))
        {
            missing.Add("slotKey");
        }
        if (string.IsNullOrWhiteSpace(mainStat.Value))
        {
            missing.Add("mainStatKey");
        }
        if (level.Value < 0)
        {
            missing.Add("level");
        }
        if (substats.Substats.Count == 0)
        {
            missing.Add("substats");
        }

        return missing;
    }

    private static Dictionary<string, string> BuildRawText(
        OcrFieldResult<string> setKey,
        OcrFieldResult<string> slot,
        OcrFieldResult<string> mainStat,
        OcrFieldResult<int> level,
        OcrFieldResult<string> location,
        OcrSubstatsResult substats)
    {
        return new Dictionary<string, string>
        {
            ["setKey"] = setKey.RawText ?? string.Empty,
            ["slotKey"] = slot.RawText ?? string.Empty,
            ["mainStatKey"] = mainStat.RawText ?? string.Empty,
            ["level"] = level.RawText ?? string.Empty,
            ["location"] = location.RawText ?? string.Empty,
            ["substats"] = substats.RawText
        };
    }

    private static int EstimateRarity(Bitmap nameCrop)
    {
        int purple = 0;
        int total = nameCrop.Width * nameCrop.Height;
        for (int y = 0; y < nameCrop.Height; y++)
        {
            for (int x = 0; x < nameCrop.Width; x++)
            {
                Color pixel = nameCrop.GetPixel(x, y);
                if (pixel.R > 110 && pixel.B > 120 && pixel.G < 120)
                {
                    purple++;
                }
            }
        }

        return total > 0 && purple / (double)total > 0.12 ? 4 : 5;
    }

    private static double Ratio(Bitmap image, Func<Color, bool> predicate)
    {
        int matches = 0;
        int total = image.Width * image.Height;
        for (int y = 0; y < image.Height; y++)
        {
            for (int x = 0; x < image.Width; x++)
            {
                if (predicate(image.GetPixel(x, y)))
                {
                    matches++;
                }
            }
        }

        return total == 0 ? 0 : matches / (double)total;
    }

    private static bool IsArtifactPanelBeige(Color pixel)
    {
        return pixel.R > 150 && pixel.G > 125 && pixel.B > 95 && Math.Abs(pixel.R - pixel.G) < 85 && pixel.R > pixel.B;
    }

    private static bool IsCharacterArtifactRed(Color pixel)
    {
        return pixel.R > 100 && pixel.G < 100 && pixel.B < 95;
    }

    private static RectangleF RectFromPanel(float x, float y, float width, float height, float panelWidth, float panelHeight)
    {
        return new RectangleF(x / panelWidth, y / panelHeight, width / panelWidth, height / panelHeight);
    }

    private static void SaveRegionImage(Bitmap image, string? regionImagePath)
    {
        if (string.IsNullOrWhiteSpace(regionImagePath))
        {
            return;
        }

        string? directory = Path.GetDirectoryName(regionImagePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        image.Save(regionImagePath, ImageFormat.Png);
    }

    private sealed record RegionLayoutProfile(string Name, RegionFieldRectangles Fields);

    private sealed record RegionFieldRectangles(
        RectangleF Name,
        RectangleF Slot,
        RectangleF MainStat,
        RectangleF Level,
        RectangleF Lock,
        RectangleF Substats,
        RectangleF Equipped);

    private sealed record FieldCrops(
        Bitmap Name,
        Bitmap Slot,
        Bitmap MainStat,
        Bitmap Level,
        Bitmap Lock,
        Bitmap Substats,
        Bitmap Equipped,
        Dictionary<string, string> Rectangles) : IDisposable
    {
        public void Dispose()
        {
            Name.Dispose();
            Slot.Dispose();
            MainStat.Dispose();
            Level.Dispose();
            Lock.Dispose();
            Substats.Dispose();
            Equipped.Dispose();
        }
    }
}
