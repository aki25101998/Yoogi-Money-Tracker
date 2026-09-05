$ErrorActionPreference = "Stop"

$workspace = "d:\Project\Yoogi Money Tracker\yoogi-money-tracker"
$toolsDir = "D:\Project\Yoogi Money Tracker\build-tools"
if (-not (Test-Path $toolsDir)) { New-Item -ItemType Directory -Path $toolsDir | Out-Null }

$jdkZip = "$toolsDir\openjdk21.zip"
$jdkDir = "$toolsDir\jdk-21.0.2"
if (-not (Test-Path $jdkDir)) {
    Write-Host "Downloading OpenJDK 21..."
    Invoke-WebRequest -Uri "https://download.java.net/java/GA/jdk21.0.2/f2283984656d49d69e91c558476027ac/13/GPL/openjdk-21.0.2_windows-x64_bin.zip" -OutFile $jdkZip
    Write-Host "Extracting OpenJDK 21..."
    Expand-Archive -Path $jdkZip -DestinationPath $toolsDir -Force
}

$sdkZip = "$toolsDir\cmdline-tools.zip"
$sdkDir = "$toolsDir\android-sdk"
$cmdlineDir = "$sdkDir\cmdline-tools\latest"
if (-not (Test-Path $cmdlineDir)) {
    Write-Host "Downloading Android SDK Command-line Tools..."
    Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $sdkZip
    Write-Host "Extracting Android SDK Command-line Tools..."
    New-Item -ItemType Directory -Path "$sdkDir\cmdline-tools" -Force | Out-Null
    Expand-Archive -Path $sdkZip -DestinationPath "$sdkDir\cmdline-tools" -Force
    Rename-Item -Path "$sdkDir\cmdline-tools\cmdline-tools" -NewName "latest"
}

# Set ENV for this session
$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $sdkDir
$env:PATH = "$jdkDir\bin;$cmdlineDir\bin;$env:PATH"

Write-Host "Accepting Android SDK licenses..."
$y = "y`n" * 100
$y | & "$cmdlineDir\bin\sdkmanager.bat" --licenses | Out-Null

Write-Host "Building web assets..."
Set-Location -Path $workspace
cmd.exe /c "npm run build"

Write-Host "Syncing capacitor..."
cmd.exe /c "npx cap sync android"

Write-Host "Building APK..."
Set-Location -Path "$workspace\android"
cmd.exe /c "gradlew.bat assembleDebug"

$apkSource = "$workspace\android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = "D:\Project\Yoogi Money Tracker\yoogi-money-tracker.apk"
if (Test-Path $apkSource) {
    Copy-Item -Path $apkSource -Destination $apkDest -Force
    Write-Host "Done! APK has been copied to: $apkDest"
} else {
    Write-Host "Failed to build APK."
}
