@echo off
rem Compila y publica PlumaViva en Firebase Hosting.
cd /d "%~dp0"

rem 1) Quitar la pagina de bienvenida de Firebase que tapa la aplicacion
if exist "public\index.html" del /q "public\index.html"

rem 2) Limpiar compilaciones anteriores
if exist "dist" rmdir /s /q "dist"
if exist ".angular" rmdir /s /q ".angular"

call npm.cmd install
if errorlevel 1 goto error
call npm.cmd run build:firebase
if errorlevel 1 goto error

rem 3) Verificar que lo compilado es la aplicacion y no la pagina de bienvenida
findstr /c:"app-root" "dist\plumaviva\browser\index.html" >nul
if errorlevel 1 (
  echo ERROR: dist\plumaviva\browser\index.html no es el de la aplicacion. No se publica.
  goto error
)
findstr /c:"Firebase Hosting Setup Complete" "dist\plumaviva\browser\index.html" >nul
if not errorlevel 1 (
  echo ERROR: se detecto la pagina de bienvenida de Firebase. No se publica.
  goto error
)
echo.
echo Compilacion correcta. Publicando...
call firebase deploy --only hosting
if errorlevel 1 goto error
echo.
echo Listo: https://pluma-viva-a3369.web.app  (abra con Ctrl+F5)
pause
exit /b 0
:error
echo.
echo Hubo un error. Revise los mensajes de arriba.
pause
exit /b 1
