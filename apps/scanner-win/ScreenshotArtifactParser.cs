using System.Drawing;
using System.Drawing.Imaging;

namespace GenshinArtifactScanner.Win;

internal sealed class ScreenshotArtifactParser(ArtifactOcrService ocrService)
{
    private static readonly ScreenshotLayoutProfile BagInventoryProfile = new(
        "bag-inventory-card",
        new RectangleF(1308f / 1920f, 120f / 1200f, 494f / 1920f, 962f / 1200f),
        new ScreenshotFieldRectangles(
            Name: RectFromCard(0, 0, 494, 57),
            Slot: RectFromCard(31, 57, 234, 77),
            MainStat: RectFromCard(31, 151, 225, 32),
            Level: RectFromCard(31, 312, 69, 33),
            Lock: RectFromCard(369, 303, 47, 47),
            Substats: RectFromCard(31, 350, 409, 151),
            Equipped: RectFromCard(31, 904, 420, 55)));

    private static readonly ScreenshotLayoutProfile EquippedCharacterProfile = new(
        "equipped-character-panel",
        null,
        new ScreenshotFieldRectangles(
            Name: RectFromScreen(1463, 119, 420, 60),
            Slot: RectFromScreen(1463, 176, 360, 42),
            MainStat: RectFromScreen(1463, 210, 260, 58),
            Level: RectFromScreen(1463, 303, 120, 50),
            Lock: RectFromScreen(1784, 169, 47, 47),
            Substats: RectFromScreen(1463, 348, 455, 180),
            Equipped: RectFromScreen(1463, 1030, 420, 60)));

    private readonly ArtifactOcrService ocrService = ocrService ?? throw new ArgumentNullException(nameof(ocrService));

    public ScanResult ParseFile(string screenshotPath, bool writeDebugImage = false)
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
        return ParseBitmap(screenshot, "fixture", "screenshot-artifact", Path.GetFullPath(screenshotPath), writeDebugImage);
    }

    public ScanResult ParseBitmap(Bitmap screenshot, string source, string mode, string? screenshotPath = null, bool writeDebugImage = false)
    {
        ArgumentNullException.ThrowIfNull(screenshot);

        string screenshotHash = ImageFingerprint.ComputeHash(screenshot);
        ScreenStateInfo screenState = ScreenStateDetector.Detect(screenshot);
        if (!screenState.ReadyForArtifactOcr)
        {
            return CreateNotReadyResult(screenshot, source, mode, screenshotPath, screenshotHash, screenState);
        }

        ScreenshotLayoutProfile profile = screenState.Code == ScreenStateCodes.ArtifactBagDetail
            ? BagInventoryProfile
            : EquippedCharacterProfile;
        using FieldCrops crops = CropFields(screenshot, profile);

        string? panelImagePath = writeDebugImage && crops.Panel is not null
            ? SaveDebugCrop(crops.Panel, "artifact-panel")
            : null;

        OcrFieldResult<string> slot = ocrService.ReadSlotKey(crops.Slot, writeDebugImage: writeDebugImage);
        OcrFieldResult<string> mainStat = ocrService.ReadMainStatKey(crops.MainStat, slot.Value, writeDebugImage: writeDebugImage);
        OcrFieldResult<int> level = ocrService.ReadLevel(crops.Level, writeDebugImage: writeDebugImage);
        OcrFieldResult<string> itemNameSetKey = ocrService.ReadSetKey(crops.Name, writeDebugImage: writeDebugImage);
        OcrFieldResult<bool> locked = ArtifactVisualClassifier.ReadLock(crops.Lock);
        OcrFieldResult<string> location = ocrService.ReadLocation(crops.Equipped, writeDebugImage: writeDebugImage);
        OcrSubstatsResult substats = ocrService.ReadSubstats(crops.Substats, writeDebugImage: writeDebugImage);
        ArtifactSetResolution setResolution = ArtifactSetResolver.Resolve(itemNameSetKey, substats);
        OcrFieldResult<string> setKey = setResolution.Field;

        int rarity = ArtifactVisualClassifier.EstimateRarity(crops.Name);
        double substatsConfidence = rarity == 2 && level.Value == 0 && substats.Substats.Count == 0
            ? 0.9
            : substats.Confidence;
        GoodArtifactDraft artifactDraft = CreateArtifactDraft(setKey, slot, mainStat, level, substats, locked, location, rarity);
        List<string> missingFields = FindMissingFields(slot, mainStat, level, substats, rarity);
        GoodArtifact? artifact = missingFields.Count == 0
            ? new GoodArtifact
            {
                SetKey = setKey.Value,
                SlotKey = slot.Value ?? string.Empty,
                Rarity = rarity,
                Level = level.Value,
                MainStatKey = mainStat.Value ?? string.Empty,
                Substats = substats.Substats,
                UnactivatedSubstats = substats.UnactivatedSubstats,
                Lock = locked.Value,
                Location = location.Value ?? string.Empty
            }
            : null;

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
                Substats = substatsConfidence,
                Lock = locked.Confidence,
                Equipped = string.IsNullOrWhiteSpace(location.Value) ? 0.75 : location.Confidence,
                Location = location.Confidence
            },
            Artifact = artifact,
            ArtifactDraft = artifactDraft,
            MissingFields = missingFields,
            OptionalWarnings = setResolution.Warnings,
            ScreenState = screenState,
            Capture = new CaptureInfo
            {
                Resolution = $"{screenshot.Width}x{screenshot.Height}",
                CapturedAt = DateTimeOffset.UtcNow.ToString("O"),
                Layout = profile.Name,
                ScreenshotImagePath = screenshotPath,
                ArtifactPanelImagePath = panelImagePath,
                ScreenshotHash = screenshotHash
            },
            Diagnostics = new ScanDiagnostics
            {
                ScreenshotPath = screenshotPath,
                RawText = BuildRawText(setKey, slot, mainStat, level, location, substats),
                CropRectangles = crops.Rectangles,
                SetIdentity = setResolution.Diagnostics
            },
            Error = missingFields.Count == 0 ? null : $"Screenshot OCR missing required fields: {string.Join(", ", missingFields)}."
        };
    }

    public static ScanResult ClassifyBitmap(Bitmap screenshot, string source, string mode, string? screenshotPath = null)
    {
        ArgumentNullException.ThrowIfNull(screenshot);

        string screenshotHash = ImageFingerprint.ComputeHash(screenshot);
        ScreenStateInfo screenState = ScreenStateDetector.Detect(screenshot);
        return CreateClassificationResult(screenshot, source, mode, screenshotPath, screenshotHash, screenState);
    }

    public static ScanResult ClassifyFile(string screenshotPath)
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
        return ClassifyBitmap(screenshot, "fixture", "screen-classification", Path.GetFullPath(screenshotPath));
    }

    private static ScanResult CreateNotReadyResult(Bitmap screenshot, string source, string mode, string? screenshotPath, string screenshotHash, ScreenStateInfo screenState)
    {
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
                Layout = screenState.Code,
                ScreenshotImagePath = screenshotPath,
                ScreenshotHash = screenshotHash
            },
            Diagnostics = new ScanDiagnostics
            {
                ScreenshotPath = screenshotPath,
                CropRectangles = new Dictionary<string, string>
                {
                    ["layout"] = screenState.Code
                }
            },
            Error = screenState.Message
        };
    }

    private static ScanResult CreateClassificationResult(Bitmap screenshot, string source, string mode, string? screenshotPath, string screenshotHash, ScreenStateInfo screenState)
    {
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
                Layout = screenState.Code,
                ScreenshotImagePath = screenshotPath,
                ScreenshotHash = screenshotHash
            },
            Diagnostics = new ScanDiagnostics
            {
                ScreenshotPath = screenshotPath,
                CropRectangles = new Dictionary<string, string>
                {
                    ["layout"] = screenState.Code
                }
            }
        };
    }

    private static FieldCrops CropFields(Bitmap screenshot, ScreenshotLayoutProfile profile)
    {
        Bitmap? panel = null;
        Func<RectangleF, Rectangle> scaler;

        if (profile.PanelRect is RectangleF panelRect)
        {
            Rectangle absolutePanel = ImageCropper.Scale(panelRect, screenshot.Width, screenshot.Height);
            panel = ImageCropper.Crop(screenshot, absolutePanel);
            scaler = rect => ImageCropper.Scale(rect, panel.Width, panel.Height);
        }
        else
        {
            scaler = rect => ImageCropper.Scale(rect, screenshot.Width, screenshot.Height);
        }

        Bitmap source = panel ?? screenshot;
        Rectangle name = scaler(profile.Fields.Name);
        Rectangle slot = scaler(profile.Fields.Slot);
        Rectangle mainStat = scaler(profile.Fields.MainStat);
        Rectangle level = scaler(profile.Fields.Level);
        Rectangle locked = scaler(profile.Fields.Lock);
        Rectangle substats = scaler(profile.Fields.Substats);
        Rectangle equipped = scaler(profile.Fields.Equipped);

        return new FieldCrops(
            Panel: panel,
            Name: ImageCropper.Crop(source, name),
            Slot: ImageCropper.Crop(source, slot),
            MainStat: ImageCropper.Crop(source, mainStat),
            Level: ImageCropper.Crop(source, level),
            Lock: ImageCropper.Crop(source, locked),
            Substats: ImageCropper.Crop(source, substats),
            Equipped: ImageCropper.Crop(source, equipped),
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
        OcrFieldResult<string> slot,
        OcrFieldResult<string> mainStat,
        OcrFieldResult<int> level,
        OcrSubstatsResult substats,
        int rarity)
    {
        List<string> missing = [];
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
        if (rarity > 2 && substats.Substats.Count == 0)
        {
            missing.Add("substats");
        }

        return missing;
    }

    private static GoodArtifactDraft CreateArtifactDraft(
        OcrFieldResult<string> setKey,
        OcrFieldResult<string> slot,
        OcrFieldResult<string> mainStat,
        OcrFieldResult<int> level,
        OcrSubstatsResult substats,
        OcrFieldResult<bool> locked,
        OcrFieldResult<string> location,
        int rarity)
    {
        return new GoodArtifactDraft
        {
            SetKey = string.IsNullOrWhiteSpace(setKey.Value) ? null : setKey.Value,
            SlotKey = string.IsNullOrWhiteSpace(slot.Value) ? null : slot.Value,
            Rarity = rarity,
            Level = level.Value >= 0 ? level.Value : null,
            MainStatKey = string.IsNullOrWhiteSpace(mainStat.Value) ? null : mainStat.Value,
            Substats = substats.Substats,
            UnactivatedSubstats = substats.UnactivatedSubstats,
            Lock = locked.Value,
            Location = location.Value ?? string.Empty
        };
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

    private static string SaveDebugCrop(Bitmap image, string fieldName)
    {
        Directory.CreateDirectory(Path.Combine("logs", "scanner", "debug"));
        string outputPath = Path.Combine("logs", "scanner", "debug", $"{fieldName}.png");
        image.Save(outputPath, ImageFormat.Png);
        return Path.GetFullPath(outputPath);
    }

    private static RectangleF RectFromCard(float x, float y, float width, float height)
    {
        return new RectangleF(x / 494f, y / 962f, width / 494f, height / 962f);
    }

    private static RectangleF RectFromScreen(float x, float y, float width, float height)
    {
        return new RectangleF(x / 1920f, y / 1200f, width / 1920f, height / 1200f);
    }

    private sealed record ScreenshotLayoutProfile(string Name, RectangleF? PanelRect, ScreenshotFieldRectangles Fields);

    private sealed record ScreenshotFieldRectangles(
        RectangleF Name,
        RectangleF Slot,
        RectangleF MainStat,
        RectangleF Level,
        RectangleF Lock,
        RectangleF Substats,
        RectangleF Equipped);

    private sealed record FieldCrops(
        Bitmap? Panel,
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
            Panel?.Dispose();
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
