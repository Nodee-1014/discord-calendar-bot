# 🔍 Google Apps Script バージョン確認手順

## PC再起動後の問題
- `/progress` → ✅ 動作正常
- `/format` → ❌ 「A」が「★★★」に変換されない

## 原因
Google Apps Scriptが古いバージョンに戻っている可能性

---

## ✅ 確認手順

### 1. GASエディタを開く
1. https://script.google.com にアクセス
2. 「Text2GCalenderAddon」プロジェクトを開く

### 2. バージョンを確認
**ファイルの先頭（1-10行目）を確認:**

```javascript
/* =====================================================================
 * Text2GCalendar - Google Calendar Automation System
 * Version: 2.4.3  ← これを確認！
 * =====================================================================
```

**または 463-467行目を確認:**

```javascript
// 正規表現で「半角/全角スペース + A/B/C + その後に何か（スペース、✓、末尾など）」を検出
const hasA = /[\s　]A(?:[\s　✓]|$)/.test(originalTitle);
const hasB = /[\s　]B(?:[\s　✓]|$)/.test(originalTitle);
const hasC = /[\s　]C(?:[\s　✓]|$)/.test(originalTitle);
```

---

## 🔧 修正手順（古いバージョンの場合）

### オプション1: 最新版を再デプロイ（推奨）

1. **ローカルファイルをコピー:**
   - `Text2GCalenderAddon_fixed.gs` の全内容をコピー

2. **GASに貼り付け:**
   - Google Apps Scriptエディタで全選択 (Ctrl+A)
   - 削除して新しいコードを貼り付け
   - 保存 (Ctrl+S)

3. **デプロイ:**
   ```
   デプロイ → デプロイを管理 → 鉛筆アイコン(編集)
   → バージョン: 新バージョン
   → 説明: "v2.4 - 数字パターン対応と★スキップ条件削除"
   → デプロイ
   ```

4. **テスト:**
   - Discordで `/format` を実行
   - 「A」が「★★★」に変換されるか確認

---

### オプション2: 特定の行だけ修正

**463-467行目を以下に置き換え:**

```javascript
// 正規表現で「半角/全角スペース + A/B/C + その後に何か（スペース、✓、末尾など）」を検出
const hasA = /[\s　]A(?:[\s　✓]|$)/.test(originalTitle);
const hasB = /[\s　]B(?:[\s　✓]|$)/.test(originalTitle);
const hasC = /[\s　]C(?:[\s　✓]|$)/.test(originalTitle);
```

**472-494行目を以下に置き換え:**

```javascript
if (hasA) {
  // 複数の A パターンに対応（✓マークも考慮）
  newTitle = originalTitle.replace(/[\s　]A(?=[\s　✓]|$)/g, function(match) {
    return match.charAt(0) + '★★★';
  });
  changed = true;
  console.log(`  ✅ A→★★★変換: "${originalTitle}" → "${newTitle}"`);
} else if (hasB) {
  newTitle = originalTitle.replace(/[\s　]B(?=[\s　✓]|$)/g, function(match) {
    return match.charAt(0) + '★★';
  });
  changed = true;
  console.log(`  ✅ B→★★変換: "${originalTitle}" → "${newTitle}"`);
} else if (hasC) {
  newTitle = originalTitle.replace(/[\s　]C(?=[\s　✓]|$)/g, function(match) {
    return match.charAt(0) + '★';
  });
  changed = true;
  console.log(`  ✅ C→★変換: "${originalTitle}" → "${newTitle}"`);
}
```

---

## 🎯 よくある原因

1. **デプロイの選択ミス**
   - 古いバージョンを選択してデプロイしてしまった

2. **保存し忘れ**
   - コードを編集したが保存せずにデプロイ

3. **キャッシュ問題**
   - Googleのサーバー側でキャッシュが残っている

---

## 📞 サポートが必要な場合

確認結果を教えてください:
1. GASの何行目に何が書かれていますか？
2. スクリーンショットを共有できますか？

すぐに修正方法を案内します！
