#! THIS IS USED PURELY FOR DEVELOPMENT PURPOSES.
#! PRODUCTION VARIABLES SHOULD BE STORED IN THE ENVIRONMENT VARIABLES OF THE PRODUCTION CONTAINER.

param (
  [string]$Path = ".env"
)

if (-Not (Test-Path $Path)) {
  Write-Error "No .env file found at $Path"
  exit 1
}

Get-Content $Path | ForEach-Object {
  if ($_ -match "^\s*#") { return }   
  if ($_ -match "^\s*$") { return }      
  $name, $value = $_ -split "=", 2
  $name = $name.Trim()
  $value = $value.Trim('"').Trim()
  Set-Item -Path Env:$name -Value $value
  Write-Output "Set $name"
}

Set-Item -Path Env:NODE_ENV -Value production