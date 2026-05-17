@echo off
setlocal enabledelayedexpansion

REM TaskFlow - Automated Setup Script for Windows
REM This script sets up the entire development environment

cls
echo.
echo ============================================================
echo           TaskFlow - Development Environment Setup
echo            AI-Powered Productivity Dashboard
echo ============================================================
echo.

REM Check Node.js
echo Checking Prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION%

REM Check PostgreSQL
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo Warning: PostgreSQL is not installed
    echo Please install PostgreSQL from https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo [OK] PostgreSQL detected
echo.

REM Setup environment files
echo Setting up environment files...

if not exist .env (
    copy .env.example .env
    echo [OK] Created .env
    echo Warning: Edit .env with your settings if needed
) else (
    echo [OK] .env already exists
)

if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo [OK] Created backend\.env
    echo Warning: Edit backend\.env with your database URL
    echo   DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
) else (
    echo [OK] backend\.env already exists
)

echo.
echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Setting up database...

REM Create database if it doesn't exist
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'taskflow'" | findstr /r "1" >nul
if %errorlevel% equ 0 (
    echo Database 'taskflow' already exists
    set /p RESET="Reset database? (y/n): "
    if /i "!RESET!"=="y" (
        psql -U postgres -c "DROP DATABASE IF EXISTS taskflow;"
        psql -U postgres -c "CREATE DATABASE taskflow;"
        echo [OK] Database reset
    )
) else (
    psql -U postgres -c "CREATE DATABASE taskflow;"
    echo [OK] Created 'taskflow' database
)

echo.
echo Running database migrations...
cd backend
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo Error: Failed to run migrations
    pause
    exit /b 1
)
cd ..

echo.
echo.
echo ============================================================
echo                      Setup Complete!
echo ============================================================
echo.

echo Next Steps:
echo.
echo 1. Start Frontend (Terminal 1):
echo    npm run dev
echo.
echo 2. Start Backend (Terminal 2):
echo    cd backend
echo    npm run dev
echo.
echo 3. Open in Browser:
echo    http://localhost:5173
echo.
echo Documentation:
echo   - Setup Guide: SETUP_GUIDE.md
echo   - Architecture: ARCHITECTURE.md
echo   - Deployment: DEPLOYMENT.md
echo.
echo Happy coding!
echo.

pause
