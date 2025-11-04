@echo off
echo ================================
echo Discord Calendar Bot - Windows Setup
echo ================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found
echo.

echo Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed
echo.

echo Creating .env file...
if exist ".env.template" (
    copy ".env.template" ".env"
    echo ✅ Created .env from template
) else if exist ".env.example" (
    copy ".env.example" ".env" 
    echo ✅ Created .env from example
) else (
    echo # Discord Calendar Bot Configuration > .env
    echo DISCORD_TOKEN='YOUR_DISCORD_BOT_TOKEN_HERE' >> .env
    echo GAS_ENDPOINT='YOUR_GAS_DEPLOY_URL_HERE' >> .env
    echo API_KEY='my_secure_api_key_2025_discord_bot' >> .env
    echo CHANNEL_ID='YOUR_CHANNEL_ID' >> .env
    echo ✅ Created basic .env file
)

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Edit .env file with your tokens
echo 2. Set up Google Apps Script (see DEPLOYMENT.md)
echo 3. Create Discord Bot (see DEPLOYMENT.md)  
echo 4. Run: python main.py
echo.
echo 📚 Documentation: README.md
echo 🚀 Cloud Deploy: DEPLOYMENT.md
echo.
pause