# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.4] - 2025-11-05

### Changed
- **進捗レポートの5個制限を解除**: `/progress`コマンドで全タスクを表示
  - 以前は完了/未完了タスクを各5個まで表示していた制限を解除
  - すべてのタスクが確認できるように改善
  - "... 他○個" 表示を削除

### Technical Details
- Display Limit: Removed `[:5]` slice
- User Experience: Complete task visibility

## [2.4.3] - 2025-11-05

### Changed
- **30件制限を解除**: formatExistingEvents_()で全イベントを処理するように変更
  - 以前は30件に制限していたが、全イベントを処理するように改善
  - より包括的な自動フォーマットを実現
  - 今日のイベントも確実に変換

### Technical Details
- Removed: `maxEvents = 30` limit
- Processing: All events in date range
- Performance: GAS 6-minute limit内で動作

## [2.4.2] - 2025-11-05

### Fixed
- **トリガー実行時の権限エラー修正**: `Session.getActiveUser()` が原因の権限不足エラーを解消
  - トリガー実行時に "Specified permissions are not sufficient" エラーが発生していた問題を修正
  - `Session.getActiveUser().getEmail()` の呼び出しを削除
  - より安全な `event.isOwnedByMe()` のみを使用

### Technical Details
- Removed: `Session.getActiveUser()` calls (line 516, 1738)
- Permission Check: `event.isOwnedByMe()` only
- Trigger Compatibility: 自動トリガー実行でも正常動作

## [2.4.1] - 2025-11-05

### Fixed
- **★重複追加の防止**: 自動判定で既に★があるイベントに重複して★が追加される問題を修正
  - `"資料準備 ★★"` → `"資料準備 ★★ ★★"` になってしまう不具合を解消
  - 自動判定前に★の存在をチェックするロジックを追加
- **A/B/C検出の改善**: スペースの数に関係なく検出できるように改善
  - `/[\s　]A/` → `/[\s　]+A/` に変更（スペース1個以上に対応）
- **置換ロジックの簡素化**: 常に「スペース1個 + ★」に統一
  - `"タスク  A"` (スペース2個) → `"タスク ★★★"` に正規化

### Technical Details
- Detection Pattern: `/[\s　]+A(?:[\s　✓\d]|$)/` でスペース複数対応
- Replacement: `/[\s　]+A(?=[\s　✓\d]|$)/g` → ` ★★★` で統一
- Auto Priority Skip: `if (originalTitle.includes('★'))` で重複防止

## [2.4.0] - 2025-11-05

### Fixed
- **A/B/C変換の完全対応**: 数字が続くパターン（`"A 2h"`, `"B 30m"` など）にも対応
  - 正規表現に `\d` を追加: `/[\s　]A(?:[\s　✓\d]|$)/`
  - `"Tissue construct C2T60 A 2h"` → `"Tissue construct C2T60 ★★★ 2h"` が正常に動作
- **既存イベントフォーマットの改善**: ★を含むイベントがあっても他のイベントを正しく変換
  - 不適切な「★スキップ条件」を削除
  - 各イベントを個別に判定するように修正

### Technical Details
- Detection Pattern: `/[\s　]A(?:[\s　✓\d]|$)/` で数字・✓マーク・スペース・末尾に対応
- Replacement Pattern: `/[\s　]A(?=[\s　✓\d]|$)/g` で正確な位置指定変換
- Skip Condition: 全体の★チェックを削除し、個別イベントごとにA/B/C判定

## [2.3.0] - 2025-11-04

### Fixed
- **A/B/C → ★変換の改善**: 完了マーク（✓）付きイベントも正しく変換されるように修正
  - 正規表現パターンを `/[\s　]A(?:[\s　✓]|$)/` に改善
  - `"タスク A ✓"` → `"タスク ★★★ ✓"` が正常に動作
- **Discord Interaction Timeout解決**: すべてのコマンドでタイムアウトエラーを完全解決
  - `defer() + followup.send()` → `send_message() + edit_original_response()` に変更
  - `/progress`, `/format`, `/check` コマンドの安定性が大幅向上
- **エラーハンドリング改善**: RuntimeError発生時のフォールバック処理を追加

### Changed
- タイムアウト設定を30秒から15-20秒に短縮して、より早い失敗検出を実現
- GASログに詳細なデバッグ情報を追加

### Technical Details
- Discord Interaction: 3秒以内の初期応答が必須
- GAS Detection Pattern: `/[\s　]A(?:[\s　✓]|$)/` で✓マーク対応
- Response Pattern: 即座の `send_message()` + 後続の `edit_original_response()`

## [2.2.0] - 2025-11-03

### Added
- **自動フォーマット機能**: `/format` コマンドで既存カレンダーイベントのA/B/Cを★に一括変換
- **確認コマンド**: `/check` で変換対象のA/B/C付きイベントを確認
- **進捗レポート**: `/progress` で今日のタスク達成率を表示

### Changed
- 優先度システムを統一: A→★★★, B→★★, C→★
- 新規イベント作成時に自動的に★を付与

## [2.1.0] - 2025-10-15

### Added
- 週次レポート機能 (`/report`)
- 作業時間の自動集計
- タスク完了マーク (`/done`, `/undone`)

### Changed
- スケジュール表示の改善
- タイムゾーン処理の最適化

## [2.0.0] - 2025-09-20

### Added
- Discord Slash Commands対応
- インテリジェントな競合回避システム
- 優先度システム (A/B/C)
- プライベート応答機能

### Changed
- コマンド形式を `/t2g` に統一
- 応答速度の大幅改善

## [1.0.0] - 2025-08-01

### Added
- 初回リリース
- 基本的なテキスト→カレンダー変換機能
- Googleカレンダー統合
- 時間解析機能
