# Discord Bot - Text to Google Calendar

Discord上でテキストからGoogle Calendarにイベントを作成するDiscord Botです。

## 機能

- `/t2g` スラッシュコマンドでテキストからGoogle Calendarイベントを作成
- プレビュー機能でイベントを事前確認
- Google Apps Scriptとの連携

## セットアップ

1. 必要なパッケージをインストール:
   ```
   pip install -r requirements.txt
   ```

2. `.env` ファイルに設定を記入:
   ```
   DISCORD_TOKEN='your_discord_bot_token'
   GAS_ENDPOINT='your_google_apps_script_endpoint'
   API_KEY='your_api_key'
   GUILD_ID='your_discord_server_id'  # オプション
   ```

3. Botを実行:
   ```
   python main.py
   ```

## 使用方法

Discord上で `/t2g` コマンドを使用:

- **プレビューモード**: `/t2g mode:preview text:会議 1h`
- **作成モード**: `/t2g mode:create text:会議 1h`

### 📝 テキスト形式

- **時間指定**: `1h`, `30min`, `1時間`, `30分`
- **優先度**: `A`, `B`, `C` (行末に追加)
- **日時指定**: `@今日`, `@明日`, `@19:00`
- **複数タスク**: 改行で区切り

### 🎯 使用例

**シンプル:**
```
/t2g mode:create text:会議 1h
```

**優先度付き:**
```
/t2g mode:create text:重要会議 2h A
```

**複数タスク:**
```
/t2g mode:preview text:会議 1h A
ランチ 30min
コーディング 2h B
ジム 1h @19:00
```

## 必要な権限

- Discordボット権限: `applications.commands`, `Send Messages`
- Google Calendar API アクセス権限