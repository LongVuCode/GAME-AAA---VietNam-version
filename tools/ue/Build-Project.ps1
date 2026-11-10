# Run from Windows PowerShell 5.1+ or PowerShell 7. No administrator rights required.
# Builds the existing project; does not change EngineAssociation or install anything.
[CmdletBinding()]
param(
    [string]$EngineRoot,
    [ValidateSet('Editor', 'Game')][string]$Target = 'Editor',
    [switch]$PreflightOnly
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$project = Join-Path $repoRoot 'game\ProjectFerry.uproject'
$projectData = Get-Content -LiteralPath $project -Raw | ConvertFrom-Json
if (-not $EngineRoot) {
    $candidate = Join-Path ${env:ProgramFiles} ('Epic Games\UE_' + $projectData.EngineAssociation)
    if (Test-Path -LiteralPath (Join-Path $candidate 'Engine\Build\BatchFiles\Build.bat')) {
        $EngineRoot = $candidate
    } else {
        throw 'Engine was not found at the standard project-associated path. Re-run with -EngineRoot pointing to your UE installation. No engine version was changed.'
    }
}
$EngineRoot = (Resolve-Path -LiteralPath $EngineRoot).Path
$buildBat = Join-Path $EngineRoot 'Engine\Build\BatchFiles\Build.bat'
$versionFile = Join-Path $EngineRoot 'Engine\Build\Build.version'
if (-not (Test-Path -LiteralPath $buildBat)) { throw 'Build.bat not found in EngineRoot.' }
$version = Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
$actualVersion = '{0}.{1}' -f $version.MajorVersion, $version.MinorVersion
if ($actualVersion -ne [string]$projectData.EngineAssociation) {
    throw "Project association is $($projectData.EngineAssociation), installed engine is $actualVersion. Send these versions for compatibility review; this script will not convert the project."
}
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) { throw 'vswhere.exe not found. Check the Visual Studio C++ workload installation.' }
$vsJson = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -format json
if ($LASTEXITCODE -ne 0) { throw 'Visual Studio discovery failed.' }
$vs = @($vsJson | ConvertFrom-Json)
if ($vs.Count -eq 0) { throw 'No Visual Studio installation with MSVC x64/x86 tools was found.' }
$runId = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$outDir = Join-Path $repoRoot ('build\ue-onboarding\' + $runId)
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$targetName = if ($Target -eq 'Editor') { 'ProjectFerryEditor' } else { 'ProjectFerry' }
$revision = 'unknown'
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitHead = & git -C $repoRoot rev-parse HEAD 2>$null
    if ($LASTEXITCODE -eq 0) { $revision = [string]$gitHead }
}
$report = [ordered]@{
    schema_version = 1
    timestamp = (Get-Date).ToString('o')
    source_commit = $revision
    engine_version = ('{0}.{1}.{2}' -f $version.MajorVersion, $version.MinorVersion, $version.PatchVersion)
    project_association = [string]$projectData.EngineAssociation
    visual_studio_version = [string]$vs[0].installationVersion
    target = $targetName
    platform = 'Win64'
    configuration = 'Development'
    state = 'preflight_passed_build_not_run'
    exit_code = $null
}
$reportPath = Join-Path $outDir 'result.json'
$report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportPath -Encoding UTF8
Write-Host "Preflight report: $reportPath"
Write-Host 'SDK/compiler compatibility is ultimately checked by UnrealBuildTool, not this preflight.'
if ($PreflightOnly) { exit 0 }
$logPath = Join-Path $outDir 'build.log'
$report.state = 'building'
$report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportPath -Encoding UTF8
# Windows PowerShell treats native stderr as ErrorRecord; preserve all log lines and native exit code.
$previousPreference = $ErrorActionPreference
$buildExit = 1
$LASTEXITCODE = $null
try {
    $ErrorActionPreference = 'Continue'
    & $buildBat $targetName Win64 Development "-Project=$project" -WaitMutex -NoHotReloadFromIDE *>&1 | Tee-Object -FilePath $logPath -ErrorAction Stop
    if ($null -ne $LASTEXITCODE) { $buildExit = $LASTEXITCODE }
} catch {
    $buildExit = 1
    $report.launch_or_log_error = $_.Exception.Message
} finally {
    $ErrorActionPreference = $previousPreference
}
if ($null -eq $buildExit) { $buildExit = 1 }
$report.exit_code = $buildExit
$report.state = if ($buildExit -eq 0) { 'compiled_not_runtime_validated' } else { 'build_failed' }
$report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportPath -Encoding UTF8
Write-Host "Result: $reportPath"
Write-Host "Build log: $logPath"
exit $buildExit
