# Discord Calendar Bot 🤖📅

**1行のテキストでGoogleカレンダーにタスクを追加！進捗管理も自動化！**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Discord.py](https://img.shields.io/badge/discord.py-2.0+-green.svg)](https://discordpy.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ v2.3 最新アップデート
- 🔧 **A/B/C → ★変換機能改善**: 完了マーク（✓）付きイベントも正しく変換
- ⚡ **Discord応答速度改善**: タイムアウトエラーを完全解決
- 🎯 **安定性向上**: すべてのコマンドで確実な応答を実現

## 🎯 これができます

```
/t2g 会議 1h A
```
↓
📅 **Googleカレンダーに自動追加**
- ✅ 既存予定との競合回避
- 🌟 優先度表示（★★★/★★/★）
- 📊 進捗レポート生成
- 🔗 カレンダー直接リンク
- 🔄 既存イベントの自動フォーマット

---

## 🚀 **超簡単セットアップ（5分）**

### **方法1: 自動セットアップ（推奨）**

1. **このリポジトリをダウンロード**
   ```bash
   git clone https://github.com/Nodee-1014/discord-calendar-bot.git
   cd discord-calendar-bot
   ```

2. **自動セットアップ実行**
   ```bash
   python setup.py
   ```
   
3. **案内に従って設定**
   - Discord Bot Token
   - Googleカレンダー連携
   - 完了！

### **方法2: 手動セットアップ**

<details>
<summary>📋 手動セットアップの詳細手順</summary>

#### **ステップ1: Google Apps Scriptの設定**
1. 🔗 [Google Apps Script](https://script.google.com/) にアクセス
2. 📄 「新しいプロジェクト」をクリック
3. 📋 [Text2GCalendarAddon_fixed.gs](Text2GCalenderAddon_fixed.gs) の全内容をコピー＆ペースト
4. 💾 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」として公開
5. 🔗 **デプロイURL**をコピーして保存

#### **ステップ2: Discord Botの作成**
1. 🔗 [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 🆕 「New Application」→ Bot名を入力
3. 🤖 「Bot」タブ → 「Add Bot」→ **TOKEN**をコピー
4. 🔑 「OAuth2」→「URL Generator」→「bot」＋「applications.commands」をチェック
5. 🔗 生成されたURLでサーバーに招待

#### **ステップ3: 環境変数設定**
`.env.example`をコピーして`.env`に名前変更し、以下を設定：
```env
DISCORD_TOKEN='YOUR_BOT_TOKEN_HERE'
GAS_ENDPOINT='YOUR_GAS_URL_HERE'
API_KEY='my_secure_api_key_2025_discord_bot'
```

</details>

---

## 🎮 **使い方**

### **📅 タスク作成**
```
/t2g 明日 レポート作成 2h A
/t2g @14:00 会議 1h B
/t2g 251101 プレゼン準備 3h A
```

### **📊 進捗管理**
```
/progress        # 今日の進捗表示
/done レポート    # タスク完了マーク
/undone 会議      # 完了解除
```

### **📈 レポート**
```
/schedule        # 今日の予定
/report          # 週間作業時間
```

---

## 🌐 **他のサーバーで使用する**

### **パブリックBot招待（簡単）**
🔗 **[このBotを招待](https://discord.com/api/oauth2/authorize?client_id=1432964411584155760&permissions=2048&scope=bot%20applications.commands)**

> ⚠️ **注意**: 招待先サーバーでもGoogleカレンダー連携が必要です

### **自分専用Botを作成（推奨）**
1. 上記セットアップ手順でBot作成
2. 複数サーバーに同じBotを招待可能
3. 各ユーザーが個別にGoogleカレンダー連携

---

## 🚀 **24/7クラウド稼働**

### **Railway（無料枠あり）**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/discord-calendar-bot)

1. Railwayアカウント作成
2. このリポジトリを連携
3. 環境変数を設定
4. 自動デプロイ完了！

### **Heroku**
```bash
heroku create your-calendar-bot
git push heroku main
heroku config:set DISCORD_TOKEN=your_token
```

---

## 📋 **必要な権限**

### **Discord Bot権限**
- ✅ スラッシュコマンドを使用
- ✅ メッセージを送信
- ✅ 埋め込みリンク

### **Googleカレンダー権限**
- ✅ カレンダーの読み取り
- ✅ イベントの作成・編集

---

## 🆘 **よくある質問**

<details>
<summary>❓ コマンドが表示されない</summary>

1. Botがサーバーに招待されているか確認
2. 「スラッシュコマンドを使用」権限があるか確認  
3. Botを一度キック→再招待

</details>

<details>
<summary>❓ Googleカレンダーに反映されない</summary>

1. Google Apps ScriptのURLが正しいか確認
2. スクリプトが「ウェブアプリ」として公開されているか確認
3. カレンダーのタイムゾーンがAsia/Tokyoか確認

</details>

<details>
<summary>❓ 24/7で動かしたい</summary>

**Railway/Heroku等のクラウドサービス利用がおすすめ**
- 無料枠でも十分動作
- 自動再起動機能付き
- 設定は環境変数のみ

</details>

---

## 🤝 **コミュニティ・サポート**

- 🐛 **バグ報告**: [Issues](https://github.com/Nodee-1014/discord-calendar-bot/issues)
- 💡 **機能要望**: [Discussions](https://github.com/Nodee-1014/discord-calendar-bot/discussions)
- 📖 **詳細ドキュメント**: [Wiki](https://github.com/Nodee-1014/discord-calendar-bot/wiki)

---

## 📄 ライセンス

MIT License - 自由に使用・改変可能

---

**🎉 あなたのDiscordライフを効率化しましょう！**