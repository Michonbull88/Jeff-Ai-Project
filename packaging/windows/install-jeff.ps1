$ErrorActionPreference = 'Stop'
$app = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$winget = Get-Command winget.exe -ErrorAction SilentlyContinue
if (-not $winget) { throw 'Windows Package Manager (winget) is required. Install App Installer from Microsoft Store and run Setup again.' }
foreach ($package in @('OpenJS.NodeJS.LTS', 'Python.Python.3.13', 'Ollama.Ollama')) {
  & winget.exe install --id $package -e --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "Could not install $package" }
}
$env:Path = "$env:ProgramFiles\nodejs;$env:LOCALAPPDATA\Programs\Python\Python313;$env:LOCALAPPDATA\Programs\Python\Python313\Scripts;$env:LOCALAPPDATA\Programs\Ollama;$env:Path"

$envFile = Join-Path $app '.env.local'
if (-not (Test-Path -LiteralPath $envFile)) {
  $secretBytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($secretBytes)
  $secret = -join ($secretBytes | ForEach-Object { $_.ToString('x2') })
  @(
    "JEFF_AUTH_SECRET=$secret"
    'APP_ORIGIN=http://localhost:3000'
    'OLLAMA_BASE_URL=http://127.0.0.1:11434'
    'OLLAMA_MODEL=qwen3:1.7b'
  ) | Set-Content -LiteralPath $envFile -Encoding UTF8
}

& node.exe "$app\scripts\windows-portable.mjs" setup
if ($LASTEXITCODE -ne 0) { throw 'JEFF setup did not complete.' }
