#! ONLY USED FOR DEVELOPMENT PURPOSES

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
  Remove-Item -Path Env:$name
  Write-Output "Cleared $name"
}