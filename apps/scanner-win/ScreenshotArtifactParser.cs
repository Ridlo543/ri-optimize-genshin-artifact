using System.Drawing;
using System.Drawing.Imaging;

namespace GenshinArtifactScanner.Win;

internal sealed class ScreenshotArtifactParser(ArtifactOcrService ocrService)
{
    private static ScreenshotLayoutProfile CreateBagProfile()
    {
        return new ScreenshotLayoutProfile(
            "bag-inventory-card",
            RectFromScreen(1308, 120, 494, 962),
            new ScreenshotFieldRectangles(
                Name: RectFromCard(0, 0, 494, 57),
                Slot: RectFromCard(31, 57, 234, 77),
                MainStat: RectFromCard(31, 151, 225, 32),
                Level: RectFromCard(31, 312, 69, 33),
                Lock: RectFromCard(369, 303, 47, 47),
                Substats: RectFromCard(31, 350, 409, 151),
                Equipped: RectFromCard(31, 904, 420, 55)))
        {
            FixedPanelHeight = 962
        };
    }

    private static ScreenshotLayoutProfile CreateCharacterProfile()
    {
        return new ScreenshotLayoutProfile(
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
    }

    private static ScreenshotLayoutProfile CreateCharacterLongTitleProfile()
    {
        return new ScreenshotLayoutProfile(
            "equipped-character-panel-long-title",
            null,
            new ScreenshotFieldRectangles(
                Name: RectFromScreen(1463, 119, 420, 96),
                Slot: RectFromScreen(1463, 218, 360, 42),
                MainStat: RectFromScreen(1463, 250, 260, 42),
                Level: RectFromScreen(1463, 328, 120, 58),
                Lock: RectFromScreen(1784, 169, 47, 47),
                Substats: RectFromScreen(1463, 376, 455, 224),
                Equipped: RectFromScreen(1463, 1030, 420, 60)));
    }

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

        bool isBag = screenState.Code == ScreenStateCodes.ArtifactBagDetail;

        // First pass: proportional scaling (no yShift)
        FieldReadResult fields = isBag
            ? ReadFields(screenshot, CreateBagProfile(), writeDebugImage)
            : ReadFields(screenshot, CreateCharacterProfile(), writeDebugImage);

        if (!isBag)
        {
            // Long-title merge reuses Lock and Location from primary:
            // their crop rectangles are identical between profiles,
            // and MergeCharacterFields always inherits them from primary.
            FieldReadResult alternateFields = ReadFields(screenshot, CreateCharacterLongTitleProfile(), writeDebugImage,
                precomputedLocked: fields.Locked, precomputedLocation: fields.Location);
            fields = MergeCharacterFields(fields, alternateFields);
        }

        // Second pass: if slot or mainStat are missing at non-1200p, try with yShift
        if (!isBag && screenshot.Height != 1200 && (string.IsNullOrWhiteSpace(fields.Slot.Value) || string.IsNullOrWhiteSpace(fields.MainStat.Value)))
        {
            int yShift = (1200 - screenshot.Height) * 7 / 20;
            fields = ApplyShiftedFallback(fields, screenshot, yShift, writeDebugImage);
        }

        string? panelImagePath = writeDebugImage && fields.Panel is not null
            ? SaveDebugCrop(fields.Panel, "artifact-panel")
            : null;
        fields.Panel?.Dispose();

        OcrFieldResult<string> slot = fields.Slot;
        OcrFieldResult<string> mainStat = fields.MainStat;
        OcrFieldResult<int> level = fields.Level;
        OcrFieldResult<bool> locked = fields.Locked;
        OcrFieldResult<string> location = fields.Location;
        OcrSubstatsResult substats = fields.Substats;
        ArtifactSetResolution setResolution = ArtifactSetResolver.Resolve(fields.ItemNameSetKey, substats);
        OcrFieldResult<string> setKey = setResolution.Field;

        int rarity = fields.Rarity;
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
                Layout = fields.ProfileName,
                ScreenshotImagePath = screenshotPath,
                ArtifactPanelImagePath = panelImagePath,
                ScreenshotHash = screenshotHash
            },
            Diagnostics = new ScanDiagnostics
            {
                ScreenshotPath = screenshotPath,
                RawText = BuildRawText(setKey, slot, mainStat, level, location, substats),
                CropRectangles = fields.Rectangles,
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
            // Bag inventory card has fixed pixel dimensions (494×962). At non-standard
            // heights the normalized height would be wrong; restore the actual card height.
            if (profile.FixedPanelHeight is int fixedHeight)
            {
                absolutePanel = new Rectangle(absolutePanel.X, absolutePanel.Y, absolutePanel.Width, fixedHeight);
            }

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

    private FieldReadResult ReadFields(Bitmap screenshot, ScreenshotLayoutProfile profile, bool writeDebugImage,
        OcrFieldResult<bool>? precomputedLocked = null, OcrFieldResult<string>? precomputedLocation = null)
    {
        using FieldCrops crops = CropFields(screenshot, profile);
        OcrFieldResult<string> slot = ocrService.ReadSlotKey(crops.Slot, writeDebugImage: writeDebugImage);
        OcrFieldResult<string> mainStat = ocrService.ReadMainStatKey(crops.MainStat, slot.Value, writeDebugImage: writeDebugImage);
        OcrFieldResult<int> level = ocrService.ReadLevel(crops.Level, writeDebugImage: writeDebugImage);
        OcrSubstatsResult substats = ocrService.ReadSubstats(crops.Substats, writeDebugImage: writeDebugImage);
        level = PreferLeadingLevelFromSubstats(level, substats, profile.Name.StartsWith("equipped-character-panel", StringComparison.Ordinal));

        return new FieldReadResult(
            ProfileName: profile.Name,
            Panel: crops.Panel is null ? null : new Bitmap(crops.Panel),
            ItemNameSetKey: ocrService.ReadSetKey(crops.Name, writeDebugImage: writeDebugImage),
            Slot: slot,
            MainStat: mainStat,
            Level: level,
            Locked: precomputedLocked ?? ArtifactVisualClassifier.ReadLock(crops.Lock),
            Location: precomputedLocation ?? ocrService.ReadLocation(crops.Equipped, writeDebugImage: writeDebugImage),
            Substats: substats,
            Rarity: ArtifactVisualClassifier.EstimateRarity(crops.Name),
            Rectangles: crops.Rectangles);
    }

    private FieldReadResult ApplyShiftedFallback(FieldReadResult fields, Bitmap screenshot, int yShift, bool writeDebugImage)
    {
        bool slotMissing = string.IsNullOrWhiteSpace(fields.Slot.Value);
        bool mainStatMissing = string.IsNullOrWhiteSpace(fields.MainStat.Value);
        if (!slotMissing && !mainStatMissing)
        {
            return fields;
        }

        if (!fields.Rectangles.TryGetValue("slot", out string? slotRectStr) ||
            !fields.Rectangles.TryGetValue("mainStat", out string? mainStatRectStr))
        {
            return fields;
        }

        OcrFieldResult<string> slot = fields.Slot;
        OcrFieldResult<string> mainStat = fields.MainStat;
        Dictionary<string, string> newRects = new(fields.Rectangles);

        if (slotMissing && slotRectStr is not null)
        {
            int[] r = slotRectStr.Split(',').Select(int.Parse).ToArray();
            Rectangle shifted = new(r[0], r[1] + yShift, r[2], r[3]);
            using Bitmap slotCrop = ImageCropper.Crop(screenshot, shifted);
            OcrFieldResult<string> slotResult = ocrService.ReadSlotKey(slotCrop, writeDebugImage: writeDebugImage);
            if (!string.IsNullOrWhiteSpace(slotResult.Value))
            {
                slot = slotResult;
                newRects["slot"] = ImageCropper.Format(shifted);
            }
        }

        if (mainStatMissing && mainStatRectStr is not null)
        {
            int[] r = mainStatRectStr.Split(',').Select(int.Parse).ToArray();
            Rectangle shifted = new(r[0], r[1] + yShift, r[2], r[3]);
            using Bitmap mainStatCrop = ImageCropper.Crop(screenshot, shifted);
            OcrFieldResult<string> mainStatResult = ocrService.ReadMainStatKey(mainStatCrop, slot.Value, writeDebugImage: writeDebugImage);
            if (!string.IsNullOrWhiteSpace(mainStatResult.Value))
            {
                mainStat = mainStatResult;
                newRects["mainStat"] = ImageCropper.Format(shifted);
            }
        }

        return fields with { Slot = slot, MainStat = mainStat, Rectangles = newRects };
    }

    private static OcrFieldResult<int> PreferLeadingLevelFromSubstats(OcrFieldResult<int> level, OcrSubstatsResult substats, bool inferZeroFromUnactivated)
    {
        int? parsed = ArtifactTextParser.ParseLeadingLevel(substats.RawText);
        if (!parsed.HasValue || level.Confidence >= 0.55)
        {
            return inferZeroFromUnactivated && level.Value < 0 && substats.UnactivatedSubstats.Count > 0
                ? new OcrFieldResult<int>
                {
                    Field = "level",
                    Value = 0,
                    RawText = string.IsNullOrWhiteSpace(level.RawText) ? "unactivated-substat" : level.RawText,
                    Confidence = Math.Max(level.Confidence, 0.62),
                    ImagePath = level.ImagePath,
                    DebugImagePath = level.DebugImagePath
                }
                : level;
        }

        return new OcrFieldResult<int>
        {
            Field = "level",
            Value = parsed.Value,
            RawText = string.IsNullOrWhiteSpace(level.RawText) ? substats.RawText.Split('\n').FirstOrDefault() : level.RawText,
            Confidence = Math.Max(level.Confidence, 0.72),
            ImagePath = level.ImagePath,
            DebugImagePath = level.DebugImagePath
        };
    }

    private static FieldReadResult MergeCharacterFields(FieldReadResult primary, FieldReadResult alternate)
    {
        OcrFieldResult<string> itemNameSetKey = PreferTextField(primary.ItemNameSetKey, alternate.ItemNameSetKey);
        OcrFieldResult<string> slot = PreferTextField(primary.Slot, alternate.Slot);
        OcrFieldResult<string> mainStat = PreferTextField(primary.MainStat, alternate.MainStat);
        OcrFieldResult<int> level = PreferLevelField(primary.Level, alternate.Level);
        OcrSubstatsResult substats = alternate.Substats.Substats.Count > primary.Substats.Substats.Count ? alternate.Substats : primary.Substats;
        bool usedAlternate =
            !ReferenceEquals(itemNameSetKey, primary.ItemNameSetKey) ||
            !ReferenceEquals(slot, primary.Slot) ||
            !ReferenceEquals(mainStat, primary.MainStat) ||
            !ReferenceEquals(level, primary.Level) ||
            !ReferenceEquals(substats, primary.Substats);
        if (!usedAlternate)
        {
            alternate.Panel?.Dispose();
            return primary;
        }

        primary.Panel?.Dispose();
        Dictionary<string, string> rectangles = new(primary.Rectangles)
        {
            ["layout"] = "equipped-character-panel-merged",
            ["alternateLayout"] = alternate.ProfileName,
            ["alternateSlot"] = alternate.Rectangles["slot"],
            ["alternateMainStat"] = alternate.Rectangles["mainStat"],
            ["alternateLevel"] = alternate.Rectangles["level"]
        };

        return primary with
        {
            ProfileName = "equipped-character-panel-merged",
            Panel = alternate.Panel,
            ItemNameSetKey = itemNameSetKey,
            Slot = slot,
            MainStat = mainStat,
            Level = level,
            Substats = substats,
            Rectangles = rectangles
        };
    }

    private static OcrFieldResult<string> PreferTextField(OcrFieldResult<string> primary, OcrFieldResult<string> alternate)
    {
        if (string.IsNullOrWhiteSpace(primary.Value) && !string.IsNullOrWhiteSpace(alternate.Value))
        {
            return alternate;
        }
        if (string.IsNullOrWhiteSpace(primary.Value) &&
            string.IsNullOrWhiteSpace(alternate.Value) &&
            !string.IsNullOrWhiteSpace(alternate.RawText))
        {
            return alternate;
        }
        if (!string.IsNullOrWhiteSpace(alternate.Value) && alternate.Confidence > primary.Confidence + 0.2)
        {
            return alternate;
        }

        return primary;
    }

    private static OcrFieldResult<int> PreferLevelField(OcrFieldResult<int> primary, OcrFieldResult<int> alternate)
    {
        if (primary.Value < 0 && alternate.Value >= 0)
        {
            return alternate;
        }
        if (alternate.Value >= 0 && alternate.Confidence > primary.Confidence + 0.2)
        {
            return alternate;
        }

        return primary;
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

    private sealed record ScreenshotLayoutProfile(string Name, RectangleF? PanelRect, ScreenshotFieldRectangles Fields, int? FixedPanelHeight = null);

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

    private sealed record FieldReadResult(
        string ProfileName,
        Bitmap? Panel,
        OcrFieldResult<string> ItemNameSetKey,
        OcrFieldResult<string> Slot,
        OcrFieldResult<string> MainStat,
        OcrFieldResult<int> Level,
        OcrFieldResult<bool> Locked,
        OcrFieldResult<string> Location,
        OcrSubstatsResult Substats,
        int Rarity,
        Dictionary<string, string> Rectangles);
}
