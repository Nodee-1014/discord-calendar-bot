# 🚀 Discord Calendar Bot - デプロイメントガイド

24/7でBotを稼働させるためのクラウドデプロイ手順

---

## 🌟 推奨: Railway（無料枠あり）

### **ワンクリックデプロイ**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/discord-calendar-bot)

### **手動デプロイ手順**
1. **Railway アカウント作成**
   - [Railway.app](https://railway.app) にアクセス
   - GitHub アカウントでサインアップ

2. **プロジェクト作成**
   ```bash
   # GitHubリポジトリを連携
   railway login
   railway link
   railway up
   ```

3. **環境変数設定**
   Railway Dashboard で以下を設定：
   ```
   DISCORD_TOKEN=あなたのDiscordボットトークン
   GAS_ENDPOINT=GoogleAppsScriptのWebアプリURL
   API_KEY=my_secure_api_key_2025_discord_bot
   CHANNEL_ID=進捗レポート送信先チャンネルID
   ```

4. **デプロイ完了**
   - 自動ビルド・デプロイ開始
   - ログで「Bot is ready!」を確認

---

## 🔷 Heroku

### **デプロイ手順**
```bash
# Heroku CLI インストール後
heroku create your-calendar-bot-name
git push heroku main

# 環境変数設定
heroku config:set DISCORD_TOKEN=your_token
heroku config:set GAS_ENDPOINT=your_gas_url
heroku config:set API_KEY=my_secure_api_key_2025_discord_bot
heroku config:set CHANNEL_ID=your_channel_id

# デプロイ状況確認
heroku logs --tail
```

### **Procfile**（既に含まれています）
```
web: python main.py
```

---

## 🖥️ VPS / 自前サーバー

### **Ubuntu/Debian**
```bash
# 依存関係インストール
sudo apt update
sudo apt install python3 python3-pip git

# プロジェクトクローン
git clone https://github.com/Nodee-1014/discord-calendar-bot.git
cd discord-calendar-bot

# 仮想環境作成
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 環境変数設定
cp .env.template .env
nano .env  # 設定値を入力

# systemd サービス作成
sudo nano /etc/systemd/system/discord-calendar-bot.service
```

### **systemd サービスファイル例**
```ini
[Unit]
Description=Discord Calendar Bot
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/discord-calendar-bot
Environment=PATH=/path/to/discord-calendar-bot/.venv/bin
ExecStart=/path/to/discord-calendar-bot/.venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### **サービス開始**
```bash
sudo systemctl enable discord-calendar-bot
sudo systemctl start discord-calendar-bot
sudo systemctl status discord-calendar-bot
```

---

## 🐳 Docker

### **Dockerfile**（既に含まれています）
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

### **Docker実行**
```bash
# ビルド
docker build -t discord-calendar-bot .

# 実行
docker run -d \
  -e DISCORD_TOKEN=your_token \
  -e GAS_ENDPOINT=your_gas_url \
  -e API_KEY=my_secure_api_key_2025_discord_bot \
  -e CHANNEL_ID=your_channel_id \
  --name calendar-bot \
  discord-calendar-bot
```

---

## 🔧 トラブルシューティング

### **よくある問題**

#### **❌ ビルドが失敗する**
```bash
# 依存関係の確認
pip install -r requirements.txt

# Python バージョン確認（3.8以上が必要）
python --version
```

#### **❌ Bot が起動しない**
1. **Discord Token 確認**
   ```bash
   # Token が正しく設定されているか
   echo $DISCORD_TOKEN
   ```

2. **GAS Endpoint 確認**
   ```bash
   # URL が正しくアクセス可能か
   curl -X GET "$GAS_ENDPOINT?key=my_secure_api_key_2025_discord_bot"
   ```

#### **❌ コマンドが動作しない**
1. **Bot権限確認**
   - 「スラッシュコマンドを使用」権限
   - 「メッセージを送信」権限

2. **コマンド同期確認**
   ```
   ログで "6 個のコマンドを同期しました" を確認
   ```

### **成功指標**
✅ ビルド完了（エラーなし）
✅ "Bot is ready!" がログに表示
✅ Discord でBot がオンライン表示
✅ `/t2g` コマンドが応答
✅ Google Calendar にイベント作成成功

### **ログ確認方法**

#### **Railway**
```bash
railway logs
```

#### **Heroku**
```bash
heroku logs --tail
```

#### **Docker**
```bash
docker logs calendar-bot
```

#### **systemd**
```bash
sudo journalctl -u discord-calendar-bot -f
```

---

## 💰 コスト比較

| サービス | 無料枠 | 月額料金 | 特徴 |
|---------|--------|---------|------|
| **Railway** | 500時間/月 | $5〜 | 簡単設定、自動スケール |
| **Heroku** | 550時間/月 | $7〜 | 老舗、豊富なアドオン |
| **VPS** | - | $5〜 | 自由度高、技術知識要 |
| **Docker** | - | サーバー代 | 軽量、ポータブル |

---

## 🆘 サポート

問題が発生した場合：
1. **ログを確認** - エラーメッセージをチェック
2. **環境変数を確認** - 設定値が正しいかチェック  
3. **GitHub Issues** - バグ報告・質問
4. **Discord サーバー** - コミュニティサポート

---

**🎉 デプロイが完了したら、他のサーバーでも同じBotを使用できます！**