# Build C++ and launch the Editor with the Realistic06 importer; keeps previous maps intact.
[CmdletBinding()]
param(
    [string]$EngineRoot = 'D:\UE_5.8',
    [switch]$AllowUnverifiedEngine
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$project = Join-Path $repoRoot 'game\ProjectFerry.uproject'
$editor = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
if (-not (Test-Path -LiteralPath $editor)) { throw "UnrealEditor.exe not found under $EngineRoot" }
if (Get-Process -Name UnrealEditor -ErrorAction SilentlyContinue) {
    throw 'Close Unreal Editor before building C++ and importing the new level. Save your work first.'
}
# An external PowerShell process preserves this wrapper when Build-Project.ps1 calls exit.
$buildArgs = @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'Build-Project.ps1'), '-EngineRoot', $EngineRoot)
if ($AllowUnverifiedEngine) { $buildArgs += '-AllowUnverifiedEngine' }
& powershell @buildArgs
if ($LASTEXITCODE -ne 0) { throw 'C++ build failed; level import was not launched. Send the latest build.log and result.json.' }
$script = Join-Path $repoRoot 'game\Content\Python\build_realistic_level_0_6.py'
$logPath = Join-Path $repoRoot 'game\Saved\Logs\Realistic06-import.log'
# No shell invocation: each argument is explicitly quoted for paths containing spaces.
$editorArgs = @(('"{0}"' -f $project), ('-ExecutePythonScript="{0}"' -f $script), ('-abslog="{0}"' -f $logPath), '-log')
Start-Process -FilePath $editor -ArgumentList $editorArgs
Write-Host 'Editor is importing Realistic06. First import may take several minutes.'
Write-Host 'Wait for [realistic06] READY before pressing Play.'
Write-Host "Import log: $logPath"
