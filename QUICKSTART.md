# 🚀 クイックスタートガイド

Discord Calendar Bot v2.4.5を5分でセットアップ！

## 📋 事前準備

必要なもの：
- Googleアカウント
- Discordアカウント
- Python 3.8以上

## ⚡ セットアップ（3ステップ）

### ステップ1: Google Apps Scriptの設定

1. [Google Apps Script](https://script.google.com/) にアクセス
2. 「新しいプロジェクト」を作成
3. `Text2GCalenderAddon_fixed.gs` の内容をコピー＆ペースト
4. **デプロイ → 新しいデプロイ → ウェブアプリ**
   - アクセスできるユーザー: **全員**
   - 実行ユーザー: **自分**
5. **デプロイURL**と**API_KEY**をコピー

### ステップ2: Discord Botの作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. **New Application** → Bot名を入力
3. **Bot** タブ → **Add Bot**
4. **TOKEN**をコピー（Reset Tokenで再表示可能）
5. **OAuth2 → URL Generator**:
   - ✅ `bot`
   - ✅ `applications.commands`
   - Bot Permissions: ✅ `Send Messages`
6. 生成されたURLでサーバーに招待

### ステップ3: Botの起動

1. このリポジトリをクローン：
   ```bash
   git clone https://github.com/Nodee-1014/discord-calendar-bot.git
   cd discord-calendar-bot
   ```

2. `.env`ファイルを作成：
   ```env
   DISCORD_TOKEN='your_discord_bot_token_here'
   GAS_ENDPOINT='your_gas_web_app_url_here'
   API_KEY='your_api_key_here'
   ```

3. 依存関係をインストール：
   ```bash
   pip install -r requirements.txt
   ```

4. Botを起動：
   ```bash
   python main.py
   ```

## ✅ 動作確認

Discordで以下を試してください：

```
/t2g 会議 1h A
```

成功すると：
- ✅ Googleカレンダーにイベントが作成される
- 🌟 優先度が「★★★」で表示される
- 🔗 カレンダーへの直接リンクが提供される

## 📚 主要コマンド

| コマンド | 説明 |
|---------|------|
| `/t2g` | テキストからカレンダーイベントを作成 |
| `/progress` | 今日のタスク進捗を表示 |
| `/format` | 既存イベントをA/B/C→★に変換 |
| `/schedule` | 今日/明日のスケジュールを表示 |
| `/report` | 週間レポートを取得 |
| `/done` | タスクを完了マーク |

## 🔧 トラブルシューティング

### Botが応答しない
- `.env`ファイルの設定を確認
- Discord Botがサーバーにいるかチェック
- `python main.py`でエラーメッセージを確認

### カレンダーに追加されない
- GASのデプロイURLが正しいか確認
- GASの「アクセスできるユーザー」が「全員」になっているか確認
- GASの実行ログでエラーを確認

### タイムアウトエラー
- インターネット接続を確認
- GASのレスポンス時間を確認（通常1秒以内）

## 📖 詳細ドキュメント

- [README.md](README.md) - 完全なドキュメント
- [CHANGELOG.md](CHANGELOG.md) - 変更履歴
- [PROGRESS_FIX_EXPLANATION.md](PROGRESS_FIX_EXPLANATION.md) - 技術詳細
- [DEPLOYMENT.md](DEPLOYMENT.md) - デプロイガイド

## 🆘 サポート

問題が発生した場合：
1. [Issues](https://github.com/Nodee-1014/discord-calendar-bot/issues) で報告
2. ログを添付（個人情報は削除）
3. 実行環境（OS、Pythonバージョン）を記載

## 🎉 完了！

これでDiscord Calendar Botが使えるようになりました！
テキスト一つでタスク管理を始めましょう！
