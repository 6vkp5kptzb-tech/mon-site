@echo off
chcp 65001 >nul
rem Convertit data\musique.xlsx en data\musique.json (page Musique)
python "%~dp0outils\excel-vers-json.py"
if errorlevel 9009 py "%~dp0outils\excel-vers-json.py"
echo.
pause
