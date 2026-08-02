@echo off
setlocal

echo ===============================================================
echo  Reajustar fechas de pagos/comisiones a la fecha de la cita
echo ===============================================================
echo.
echo Esto corrige el historico que hayas registrado con fecha de hoy
echo para que los pagos, comisiones y recibos queden con la fecha
echo REAL de la cita. Es seguro correrlo varias veces.
echo.
set /p CONFIRM="Escribe S y Enter para continuar (cualquier otra tecla cancela): "
if /I not "%CONFIRM%"=="S" (
  echo.
  echo Cancelado. No se hizo ningun cambio.
  pause
  exit /b 0
)

echo.
echo Verificando que Docker este corriendo...
docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Docker no esta corriendo. Abre Docker Desktop e intenta de nuevo.
  pause
  exit /b 1
)

echo Verificando que el contenedor de la base de datos este activo...
docker ps --filter "name=amazing_nails_db" --format "{{.Names}}" | findstr /I "amazing_nails_db" >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: El contenedor "amazing_nails_db" no esta corriendo.
  echo Inicia el contenedor de PostgreSQL y vuelve a intentar.
  pause
  exit /b 1
)

echo.
echo Ejecutando el script...
echo.
docker exec -i amazing_nails_db psql -U amazing_nails_admin -d amazing_nails -f - < "%~dp0realign_dates_to_appointment.sql"

echo.
echo ===============================================================
echo  Listo. Si todas las filas de arriba dicen "restante = 0",
echo  quedo todo alineado correctamente.
echo ===============================================================
echo.
pause
