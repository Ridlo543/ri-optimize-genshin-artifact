param(
    [int] $TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logsDir = Join-Path $repoRoot "logs\native-window-smoke"
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public sealed class NativeWindowInfo {
    public string Title { get; set; }
    public bool Visible { get; set; }
    public bool TopMost { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public int ClientWidth { get; set; }
    public int ClientHeight { get; set; }
}

public static class NativeWindowAudit {
    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out Rect rect);

    [DllImport("user32.dll")]
    private static extern bool GetClientRect(IntPtr hWnd, out Rect rect);

    [DllImport("user32.dll")]
    private static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);

    [DllImport("user32.dll")]
    private static extern bool SetProcessDpiAwarenessContext(IntPtr dpiContext);

    [DllImport("user32.dll")]
    private static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr window);

    [DllImport("user32.dll")]
    private static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);

    public static void EnablePerMonitorDpiAwareness() {
        SetProcessDpiAwarenessContext(new IntPtr(-4));
    }

    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero);
        mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
    }

    public static int GetForegroundProcessId() {
        uint processId;
        GetWindowThreadProcessId(GetForegroundWindow(), out processId);
        return (int)processId;
    }

    public static bool ActivateWindow(long window) {
        return SetForegroundWindow(new IntPtr(window));
    }

    public static NativeWindowInfo[] GetWindows(int processId) {
        var windows = new List<NativeWindowInfo>();
        EnumWindows((hWnd, lParam) => {
            uint owner;
            GetWindowThreadProcessId(hWnd, out owner);
            if (owner != processId) {
                return true;
            }

            var title = new StringBuilder(512);
            GetWindowText(hWnd, title, title.Capacity);
            Rect rect;
            GetWindowRect(hWnd, out rect);
            Rect clientRect;
            GetClientRect(hWnd, out clientRect);
            windows.Add(new NativeWindowInfo {
                Title = title.ToString(),
                Visible = IsWindowVisible(hWnd),
                TopMost = IsTopMost(hWnd),
                X = rect.Left,
                Y = rect.Top,
                Width = rect.Right - rect.Left,
                Height = rect.Bottom - rect.Top,
                ClientWidth = clientRect.Right - clientRect.Left,
                ClientHeight = clientRect.Bottom - clientRect.Top
            });
            return true;
        }, IntPtr.Zero);
        return windows.ToArray();
    }

    private static bool IsTopMost(IntPtr hWnd) {
        const int GWL_EXSTYLE = -20;
        const long WS_EX_TOPMOST = 0x00000008L;
        return (((long)GetWindowLongPtr(hWnd, GWL_EXSTYLE)) & WS_EX_TOPMOST) == WS_EX_TOPMOST;
    }
}
"@

[NativeWindowAudit]::EnablePerMonitorDpiAwareness()

function Stop-ProcessTree([int] $ProcessId) {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ParentProcessId -eq $ProcessId } |
        ForEach-Object { Stop-ProcessTree ([int]$_.ProcessId) }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-RepoDevProcesses {
    $repoRootText = $repoRoot.ToLowerInvariant()
    $candidates = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $commandLine = if ($_.CommandLine) { $_.CommandLine.ToLowerInvariant() } else { "" }
        $commandLine.Contains($repoRootText) -and (
            $commandLine.Contains("@tauri-apps\cli\tauri.js") -or
            $commandLine.Contains("\vite\bin\vite.js") -or
            $commandLine.Contains("scripts\tauri-dev.ps1")
        )
    }

    foreach ($candidate in $candidates) {
        Stop-ProcessTree ([int]$candidate.ProcessId)
    }

    Get-Process -Name "genshin-artifact-desktop" -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-ProcessTree $_.Id
    }
}

function Assert-Condition([bool] $Condition, [string] $Message) {
    if (-not $Condition) {
        throw $Message
    }
}

function Save-WindowCapture($Window, [string] $Path) {
    Add-Type -AssemblyName System.Drawing
    $bitmap = New-Object System.Drawing.Bitmap($Window.Width, $Window.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.CopyFromScreen($Window.X, $Window.Y, 0, 0, $bitmap.Size)
        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

$existingApp = Get-Process -Name "genshin-artifact-desktop" -ErrorAction SilentlyContinue
if ($existingApp) {
    throw "A genshin-artifact-desktop process is already running. Close it before running the native smoke test."
}

$stdout = Join-Path $logsDir "tauri-stdout.log"
$stderr = Join-Path $logsDir "tauri-stderr.log"
$launcher = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "tauri-dev.ps1") `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru

try {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $app = $null
    $windows = @()

    while ((Get-Date) -lt $deadline) {
        $app = Get-Process -Name "genshin-artifact-desktop" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($app) {
            $windows = @([NativeWindowAudit]::GetWindows($app.Id))
            $titles = @($windows | ForEach-Object { $_.Title })
            if ($titles -contains "Artifact Assistant Bubble" -and $titles -contains "Genshin Artifact Assistant" -and $titles -contains "Artifact ROI Overlay") {
                break
            }
        }
        Start-Sleep -Milliseconds 500
    }

    Assert-Condition ($null -ne $app) "Tauri app did not start within $TimeoutSeconds seconds. Inspect $stderr."
    Assert-Condition ($windows.Count -gt 0) "No native windows were found for PID $($app.Id)."

    # Wait for React to invoke the physical-pixel bounds command after WebView load.
    Start-Sleep -Milliseconds 3000
    $windows = @([NativeWindowAudit]::GetWindows($app.Id))
    $windows | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $logsDir "windows.json")

    $visible = @($windows | Where-Object { $_.Visible })
    $visibleProductWindows = @($visible | Where-Object { $_.Title -in @("Artifact Assistant Bubble", "Genshin Artifact Assistant", "Artifact ROI Overlay", "Fixture Playground") })
    $visibleLargeHelpers = @($visible | Where-Object { [string]::IsNullOrWhiteSpace($_.Title) -and ($_.Width -gt 120 -or $_.Height -gt 120) })
    $bubble = @($visibleProductWindows | Where-Object { $_.Title -eq "Artifact Assistant Bubble" })
    $main = @($windows | Where-Object { $_.Title -eq "Genshin Artifact Assistant" })
    $overlay = @($windows | Where-Object { $_.Title -eq "Artifact ROI Overlay" })

    Assert-Condition ($visibleProductWindows.Count -eq 1) "Expected exactly one visible product window at startup, found $($visibleProductWindows.Count): $($visibleProductWindows.Title -join ', ')."
    Assert-Condition ($visibleLargeHelpers.Count -eq 0) "A large visible untitled helper window was found at startup."
    Assert-Condition ($bubble.Count -eq 1) "Expected the assistant bubble to be the only visible startup window."
    Assert-Condition ($bubble[0].TopMost) "Expected the assistant bubble to be topmost at startup."
    Assert-Condition ($main.Count -eq 1 -and -not $main[0].Visible) "Expected the main panel to exist but remain hidden at startup."
    Assert-Condition ($overlay.Count -eq 1 -and -not $overlay[0].Visible) "Expected the ROI overlay to exist but remain hidden at startup."
    Assert-Condition ($bubble[0].ClientWidth -ge 60 -and $bubble[0].ClientWidth -le 130) "Bubble startup client width was $($bubble[0].ClientWidth), expected about 72 CSS pixels after DPI scaling."
    Assert-Condition ($bubble[0].ClientHeight -ge 60 -and $bubble[0].ClientHeight -le 130) "Bubble startup client height was $($bubble[0].ClientHeight), expected about 72 CSS pixels after DPI scaling."
    Assert-Condition (-not ($visibleProductWindows | Where-Object { $_.ClientWidth -gt 500 -or $_.ClientHeight -gt 500 })) "A large visible Tauri product window remains at startup."

    $genshin = Get-Process -Name "GenshinImpact" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($genshin) {
        [NativeWindowAudit]::ActivateWindow($genshin.MainWindowHandle) | Out-Null
        Start-Sleep -Milliseconds 1000
    }

    $foregroundBefore = [NativeWindowAudit]::GetForegroundProcessId()
    Assert-Condition ($foregroundBefore -ne $app.Id) "Assistant bubble stole foreground focus during startup."
    [NativeWindowAudit]::Click($bubble[0].X + [int]($bubble[0].Width / 2), $bubble[0].Y + [int]($bubble[0].Height / 2))
    Start-Sleep -Milliseconds 1500
    $foregroundAfter = [NativeWindowAudit]::GetForegroundProcessId()
    Assert-Condition ($foregroundAfter -eq $foregroundBefore) "Clicking the assistant bubble changed foreground focus from PID $foregroundBefore to PID $foregroundAfter."
    $expandedWindows = @([NativeWindowAudit]::GetWindows($app.Id))
    $expandedBubble = @($expandedWindows | Where-Object { $_.Title -eq "Artifact Assistant Bubble" -and $_.Visible })
    $expandedWindows | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $logsDir "windows-expanded.json")
    Assert-Condition ($expandedBubble.Count -eq 1) "Assistant bubble disappeared after clicking the launcher."
    Assert-Condition ($expandedBubble[0].TopMost) "Expected the assistant bubble to remain topmost after expanding."
    Assert-Condition ($expandedBubble[0].ClientWidth -gt $bubble[0].ClientWidth + 100) "Assistant bubble did not expand after clicking the launcher."
    Assert-Condition ($expandedBubble[0].ClientHeight -gt $bubble[0].ClientHeight + 80) "Assistant bubble height did not expand after clicking the launcher."
    Save-WindowCapture $expandedBubble[0] (Join-Path $logsDir "assistant-expanded-native.png")

    # Click the far-right action-row button (Open Panel). Use proportional native
    # coordinates so the smoke test survives 100-150% DPI scaling.
    [NativeWindowAudit]::Click($expandedBubble[0].X + $expandedBubble[0].Width - 75, $expandedBubble[0].Y + [int]($expandedBubble[0].Height * 0.40))
    Start-Sleep -Milliseconds 1500
    $panelWindows = @([NativeWindowAudit]::GetWindows($app.Id))
    $visibleMain = @($panelWindows | Where-Object { $_.Title -eq "Genshin Artifact Assistant" -and $_.Visible })
    Assert-Condition ($visibleMain.Count -eq 1) "Open Panel did not show the main window."
    Assert-Condition ([NativeWindowAudit]::GetForegroundProcessId() -eq $foregroundBefore) "Opening the main panel changed foreground focus."
    [NativeWindowAudit]::Click($visibleMain[0].X + [int]($visibleMain[0].Width / 2), $visibleMain[0].Y + [int]($visibleMain[0].Height / 2))
    Start-Sleep -Milliseconds 500
    Assert-Condition ([NativeWindowAudit]::GetForegroundProcessId() -eq $foregroundBefore) "Clicking the passive main panel changed foreground focus."
    $panelWindows | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $logsDir "windows-main-passive.json")
    Save-WindowCapture $visibleMain[0] (Join-Path $logsDir "main-passive-native.png")
    $preferredGenshinPid = if ($genshin) { $genshin.Id } else { $null }
    [pscustomobject]@{
        PreferredGenshinPid = $preferredGenshinPid
        ForegroundBefore = $foregroundBefore
        ForegroundAfterBubble = $foregroundAfter
        ForegroundAfterMain = [NativeWindowAudit]::GetForegroundProcessId()
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logsDir "focus-proof.json")

    Write-Host "Native window smoke passed. Startup shows only the compact $($bubble[0].ClientWidth)x$($bubble[0].ClientHeight) transparent assistant host. Foreground PID $foregroundBefore was preserved."
}
finally {
    if ($launcher -and -not $launcher.HasExited) {
        Stop-ProcessTree $launcher.Id
    }
    Stop-RepoDevProcesses
}
