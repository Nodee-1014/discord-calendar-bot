# Railway Deployment Troubleshooting

## Common Issues and Solutions

### Issue 1: Build Failed
- Check if all environment variables are set correctly
- Verify Dockerfile syntax
- Check requirements.txt for package compatibility

### Issue 2: Bot Not Starting  
- Verify DISCORD_TOKEN is valid
- Check GAS_ENDPOINT URL is accessible
- Ensure API_KEY matches between bot and GAS

### Issue 3: Commands Not Working
- Verify bot has proper Discord permissions
- Check if slash commands are synced
- Test GAS endpoint directly

## Environment Variables Required:
```
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
GAS_ENDPOINT=YOUR_GAS_DEPLOYMENT_URL_HERE
API_KEY=my_secure_api_key_2025_discord_bot
```

## Success Indicators:
✅ Build completes without errors
✅ "Bot is ready!" appears in logs
✅ Bot shows online in Discord
✅ /t2g command responds properly