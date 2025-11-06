# Discord Calendar Bot 🤖📅

**1行のテキストでGoogleカレンダーにタスクを追加！進捗管理も自動化！**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Discord.py](https://img.shields.io/badge/discord.py-2.0+-green.svg)](https://discordpy.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ v2.5.0 最新アップデート
- 🌟 **マストワンシステム**: 今日の主役タスクに☆マークで集中！（`/must_one`）
- 📋 **タスクリストのコピー機能改善**: コードブロック表示で他チャンネルへの共有が簡単に
- � **A/B/C → ★変換の完全対応**: `"A 2h"`, `"B 30m"` など数字が続くパターンにも対応
- ⚡ **全イベント処理**: 30件制限を解除、すべてのタスクを表示
- 🎯 **トリガー実行の安定性**: 権限エラーを完全解決、自動フォーマットが確実に動作

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
/must_one レポート # 今日の主役タスクに☆マーク（1つだけ）
/done レポート    # タスク完了マーク
/undone 会議      # 完了解除
/ad              # 今日のタスク全て完了（All Done）
```

### **📈 レポート**
```
/schedule        # 今日の予定
/report          # 週間作業時間
```

---

## 🌐 **他の人が使う方法**

### 📌 **3つの方法から選択**

#### **方法1: 友達のBotを招待（最も簡単）**
既にセットアップ済みの友達のBotを自分のサーバーに招待

✅ **メリット:**
- セットアップ不要
- すぐに使える

❌ **デメリット:**
- 全員が同じGoogleカレンダーを共有
- プライバシーの問題
- 友達のBotが停止すると使えない

**手順:**
1. 友達からBot招待リンクをもらう
   ```
   https://discord.com/api/oauth2/authorize?client_id=BOT_ID&permissions=2048&scope=bot%20applications.commands
   ```
2. リンクをクリックして自分のサーバーに招待
3. 完了！（ただし友達のGoogleカレンダーに追加されます）

---

#### **方法2: 自分専用Botを作成（推奨）⭐**
自分のGoogleカレンダーで完全に独立したBotを作成

✅ **メリット:**
- 自分専用のGoogleカレンダー
- プライバシー保護
- カスタマイズ自由
- 複数サーバーに招待可能

❌ **デメリット:**
- 初回セットアップが必要（5分程度）
- PCまたはクラウドで常時起動が必要

**手順:**
1. **このリポジトリをダウンロード**
   ```bash
   git clone https://github.com/Nodee-1014/discord-calendar-bot.git
   cd discord-calendar-bot
   ```

2. **自動セットアップ実行**
   ```bash
   python setup.py
   ```
   
3. **Google Apps Scriptを設定**
   - [詳細手順](#方法2-手動セットアップ)を参照
   - 自分のGoogleカレンダーと連携

4. **Botを起動**
   ```bash
   python main.py
   ```

5. **招待リンクを使って複数サーバーに招待可能**

---

#### **方法3: クラウドで24/7稼働（本格運用）**
Railway/Herokuなどで常時稼働

✅ **メリット:**
- 24時間365日稼働
- PCを閉じても動作継続
- 自動再起動機能

❌ **デメリット:**
- クラウドサービスの登録が必要
- 無料枠に制限あり

**推奨サービス:**
- **Railway** - 無料枠で十分、設定簡単
- **Heroku** - 有名だが無料枠廃止
- **Google Cloud Run** - 上級者向け

**Railway セットアップ手順:**
1. [Railway.app](https://railway.app) でアカウント作成
2. GitHub連携でこのリポジトリを選択
3. 環境変数を設定:
   ```
   DISCORD_TOKEN=あなたのBotトークン
   GAS_ENDPOINT=Google Apps Script URL
   API_KEY=my_secure_api_key_2025_discord_bot
   ```
4. デプロイ！

---

### 🔄 **使用パターンの比較**

| 方法 | セットアップ | カレンダー | 稼働時間 | コスト | 推奨度 |
|------|------------|----------|---------|-------|-------|
| 友達のBotを招待 | ⚡ 1分 | 共有 | 友達次第 | 無料 | ⭐⭐ |
| 自分でBotを作成 | ⚙️ 5分 | 個別 | PC起動時 | 無料 | ⭐⭐⭐⭐⭐ |
| クラウド稼働 | 🚀 15分 | 個別 | 24/7 | 無料〜 | ⭐⭐⭐⭐ |

---

### 💡 **シナリオ別のおすすめ**

**👨‍👩‍👧 家族/友達グループで使う**
→ 方法1（誰か1人がセットアップ、全員で共有）

**👤 個人で使う**
→ 方法2（自分専用Bot、PCで起動）

**🏢 チーム/組織で使う**
→ 方法3（クラウド稼働、各メンバーが個別Bot）

**🎓 勉強会/イベントで紹介**
→ 方法2（各自セットアップして学習）

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