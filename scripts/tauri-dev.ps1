param(
    [switch] $PreflightOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoRootText = $repoRoot.Path.ToLowerInvariant()

function Stop-ProcessTree([int] $ProcessId) {
    Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId } | ForEach-Object {
        Stop-ProcessTree ([int]$_.ProcessId)
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Ensure-CargoOnPath {
    $cargo = Get-Command cargo -ErrorAction SilentlyContinue
    if ($cargo) {
        return
    }

    $cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
    $cargoExe = Join-Path $cargoBin "cargo.exe"
    if (Test-Path -LiteralPath $cargoExe) {
        $env:PATH = "$cargoBin;$env:PATH"
        return
    }

    throw "cargo was not found on PATH, and $cargoExe does not exist. Install Rust with rustup, then rerun pnpm tauri:dev."
}

function Stop-RepoViteOnPort([int] $Port) {
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
        if ($null -eq $process) {
            continue
        }

        $commandLineSource = $process.CommandLine
        if ($null -eq $commandLineSource) {
            $commandLineSource = ""
        }
        $commandLine = $commandLineSource.ToLowerInvariant()
        $isRepoVite = $commandLine.Contains($repoRootText) -and $commandLine.Contains("vite")
        if (-not $isRepoVite) {
            throw "Port $Port is already used by PID $($listener.OwningProcess), but it is not this repo's Vite server. Stop that process or change the dev port before running Tauri."
        }

        Write-Host "Stopping existing Vite dev server on port $Port (PID $($listener.OwningProcess))."
        Stop-ProcessTree ([int]$listener.OwningProcess)
    }
}

Ensure-CargoOnPath
Stop-RepoViteOnPort 5173

if ($PreflightOnly) {
    $cargo = Get-Command cargo -ErrorAction Stop
    Write-Host "Tauri dev preflight OK. Cargo: $($cargo.Source)"
    return
}

pnpm --filter "@ri-genshin/desktop" tauri dev
