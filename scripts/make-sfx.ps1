# NG-VMS EXE Creator
# This script generates the self-extracting 'ngvms-setup.exe' using Windows IExpress

$sfxName = "ngvms-setup.exe"
$sedFile = "installer.sed"

Write-Host "📦 Creating Self-Extracting Archive: $sfxName..." -ForegroundColor Cyan

# Generate the IExpress Directive (SED)
$sedContent = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=Do you want to install NG-VMS Enterprise?
DisplayLicense=
FinishMessage=Installation process finished. Please check the terminal.
TargetName=$(Get-Location)\$sfxName
FriendlyName=NG-VMS Enterprise Setup
AppLaunched=cmd.exe /c launcher.bat
PostInstallCmd=<None>
[SourceFiles]
SourceFiles0=$(Get-Location)
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
%FILE3%=
%FILE4%=
%FILE5%=
%FILE6%=
"@

# Note: In a real environment, you would list all files in [SourceFiles0]
# For this automation, we assume the user has the folder ready.

$sedFileContent = $sedContent -replace '%FILE0%', 'install.ps1'
$sedFileContent = $sedFileContent -replace '%FILE1%', 'launcher.bat'
$sedFileContent = $sedFileContent -replace '%FILE2%', 'docker-compose.yml'
$sedFileContent = $sedFileContent -replace '%FILE3%', '.env.example'
$sedFileContent = $sedFileContent -replace '%FILE4%', 'Caddyfile'
$sedFileContent = $sedFileContent -replace '%FILE5%', 'README.md'
$sedFileContent = $sedFileContent -replace '%FILE6%', 'ngvms-images.tar'

Set-Content -Path $sedFile -Value $sedFileContent

Write-Host "[INFO] Directive generated. Compiling EXE..." -ForegroundColor Yellow

# Call IExpress (Built-in Windows tool)
# /N = Build without UI, /Q = Quiet, /M = Use SED file
iexpress.exe /N /Q /M $sedFile

if (Test-Path $sfxName) {
    Write-Host "✅ SUCCESS: $sfxName created!" -ForegroundColor Green
    Remove-Item $sedFile
} else {
    Write-Host "❌ ERROR: Failed to create EXE. Check if IExpress is available." -ForegroundColor Red
}
