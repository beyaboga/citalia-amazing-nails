<#
.SYNOPSIS
  Respaldo diario de la base de datos (pg_dump dentro del contenedor Docker),
  con rotación (borra respaldos automáticos más viejos que $RetentionDays).

.NOTES
  Pensado para correr sin supervisión (Programador de Tareas de Windows).
  Los respaldos manuales (ej. antes de una migración) no llevan el prefijo
  "auto_" y esta rotación nunca los toca.
#>

$ErrorActionPreference = 'Stop'

$ContainerName = 'amazing_nails_db'
$DbUser = 'amazing_nails_admin'
$DbName = 'amazing_nails'
$BackupDir = Join-Path $PSScriptRoot '..\db\backups' | Resolve-Path
$RetentionDays = 30

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$fileName = "auto_$timestamp.dump"
$containerPath = "/tmp/$fileName"
$localPath = Join-Path $BackupDir $fileName

Write-Host "Respaldando $DbName ($ContainerName) -> $fileName"

docker exec $ContainerName pg_dump -U $DbUser -d $DbName -F c -f $containerPath
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló con código $LASTEXITCODE" }

docker cp "${ContainerName}:${containerPath}" $localPath
if ($LASTEXITCODE -ne 0) { throw "docker cp falló con código $LASTEXITCODE" }

docker exec $ContainerName rm -f $containerPath

$sizeKb = [math]::Round((Get-Item $localPath).Length / 1KB, 1)
Write-Host "Respaldo guardado: $localPath ($sizeKb KB)"

# Rotación: solo borra respaldos AUTOMÁTICOS (prefijo auto_) más viejos que $RetentionDays.
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter 'auto_*.dump' |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  ForEach-Object {
    Write-Host "Eliminando respaldo viejo: $($_.Name)"
    Remove-Item $_.FullName -Force
  }

Write-Host 'Respaldo completado.'
