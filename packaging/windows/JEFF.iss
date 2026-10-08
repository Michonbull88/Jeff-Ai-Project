#define AppName "JEFF"
#define AppVersion "1.0.0"
[Setup]
AppId={{6D7F2287-571E-4F75-A07E-01AE4830D765}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\JEFF
DefaultGroupName=JEFF
OutputDir=..\..\dist
OutputBaseFilename=JEFF-Setup-Windows-x64
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
WizardStyle=modern

[Files]
Source: "..\..\*"; DestDir: "{app}\app"; Flags: recursesubdirs ignoreversion; Excludes: "node_modules\*,.next\*,test-results\*,.jeff-data\*,.env,.env.*,.git\*,dist\*,tests\*,playwright-report\*,packaging\macos\*,packaging\linux\*"
Source: "start-installed.cmd"; DestDir: "{app}"; DestName: "Start JEFF.cmd"; Flags: ignoreversion

[Icons]
Name: "{group}\JEFF"; Filename: "{app}\Start JEFF.cmd"
Name: "{autodesktop}\JEFF"; Filename: "{app}\Start JEFF.cmd"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: checkedonce

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\app\packaging\windows\install-jeff.ps1"""; StatusMsg: "Installing JEFF and its local AI components..."; Flags: waituntilterminated
Filename: "{app}\Start JEFF.cmd"; Description: "Start JEFF"; Flags: postinstall nowait skipifsilent
