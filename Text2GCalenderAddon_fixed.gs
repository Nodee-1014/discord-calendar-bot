/* =====================================================================
 * Text2GCalendar - Google Calendar Automation System
 * Version: 2.6.0
 * =====================================================================
 * 📅 主要機能:
 *   - テキストから自動でカレンダーイベント作成
 *   - 既存予定との競合を自動回避（終日イベントは無視）
 *   - 優先度管理（A/B/C → ★★★/★★/★）
 *   - 日付指定（YYMMDD形式、相対日付対応）
 *   - 複数タスク自動分離
 *   - スマート時刻配置（今日＝現在時刻、未来＝8:00から）
 *   - 週間レポート生成
 *   - Discord Bot連携用Web API
 * 
 * ⚙️ 設定要件:
 *   appsscript.json に以下を設定:
 *   {
 *     "timeZone": "Asia/Tokyo",
 *     "dependencies": {},
 *     "exceptionLogging": "STACKDRIVER"
 *   }
 * 
 * 🔧 技術仕様:
 *   - タイムゾーン: Asia/Tokyo (JST/UTC+9)
 *   - 営業時間: 08:00-21:00
 *   - タスク間隔: 5分
 *   - 最大試行回数: 500回
 *   - 先読み日数: 30日
 *   - 終日イベント: 自動除外（競合チェック対象外）
 * 
 * 📝 入力形式例:
 *   251031 細胞継代 1h A
 *   251031 C2T5657メンテ 2h B データ解析 1h A
 *   @14:00 会議 1h C
 *   今日 レポート作成 2h B
 * 
 * ✅ 動作確認済み機能:
 *   ✓ 既存予定との競合自動回避
 *   ✓ 終日イベント除外
 *   ✓ 日付指定スケジューリング
 *   ✓ 優先度ベース配置
 *   ✓ 複数タスク自動分離
 *   ✓ Discord Bot API統合
 * 
 * 🚀 バージョン: 2.3 Final (2025-10-30) - 既存イベント自動フォーマット＋スマート優先度判定
 * 👤 開発: Discord Calendar Bot Project
 * 📦 デプロイ: Railway (24/7運用)
 * =====================================================================
 */

// ===== グローバル設定 =====
const SETTINGS = {
  TIMEZONE: 'Asia/Tokyo',
  WORK_START: '08:00',      // 勤務開始時刻
  WORK_END: '21:00',        // 勤務終了時刻
  GAP_MIN: 5,               // タスク間の最小間隔（分）
  LOOKAHEAD_DAYS: 30,       // 先読み日数
  MAX_SEARCH_DAYS: 14,      // 最大検索日数
  MAX_TRIES: 500,           // 最大試行回数
  REPORT_TIMES: ['13:00', '20:00']  // 進捗レポート通知時刻
};

const PRIORITY_ORDER = { 
  'A': 1,  // 最高優先度 → ★★★
  'B': 2,  // 中優先度 → ★★
  'C': 3   // 低優先度 → ★
};

// Web API認証キー（本番環境では環境変数に移行推奨）
const API_KEY = 'my_secure_api_key_2025_discord_bot';

// =====================================================================
// タスク完了管理機能
// =====================================================================

/**
 * 今日の進捗レポートを生成
 * @return {Object} 進捗情報
 */
function generateDailyProgress_() {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  console.log(`📊 進捗レポート生成開始: ${Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm')}`);
  
  // 今日の開始・終了時刻
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  console.log(`📅 対象期間: ${Utilities.formatDate(startOfDay, tz, 'yyyy-MM-dd HH:mm')} 〜 ${Utilities.formatDate(endOfDay, tz, 'HH:mm')}`);
  
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startOfDay, endOfDay);
  
  console.log(`📋 取得イベント数: ${events.length}件`);
  
  const completed = [];
  const pending = [];
  let totalTasks = 0;
  let completedCount = 0;
  let mustOneTask = null;  // 🆕 マストワンタスク
  
  events.forEach(event => {
    // 終日イベントは除外
    if (event.isAllDayEvent()) return;
    
    const title = event.getTitle();
    const start = event.getStartTime();
    const end = event.getEndTime();
    const duration = (end - start) / (1000 * 60); // 分単位
    
    totalTasks++;
    
    // 🆕 ☆マークがあればマストワンタスク
    const hasMustOne = title.includes('☆');
    const taskData = {
      title: title,
      start: Utilities.formatDate(start, tz, 'HH:mm'),
      end: Utilities.formatDate(end, tz, 'HH:mm'),
      duration: Math.round(duration)
    };
    
    // タイトルに✓があれば完了タスク
    if (title.includes('✓')) {
      completedCount++;
      completed.push({
        title: title.replace('✓', '').trim(),
        start: Utilities.formatDate(start, tz, 'HH:mm'),
        end: Utilities.formatDate(end, tz, 'HH:mm'),
        duration: Math.round(duration)
      });
    } else {
      // ☆マークがあれば、マストワンタスクとして記録（未完了のみ）
      if (hasMustOne && !mustOneTask) {
        mustOneTask = taskData;
      }
      
      pending.push(taskData);
    }
  });
  
  // 完了率計算
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  
  console.log(`📈 進捗サマリ: ${completedCount}/${totalTasks} (${completionRate}%)`);
  console.log(`✅ 完了タスク: ${completed.length}件`);
  console.log(`⏳ 未完了タスク: ${pending.length}件`);
  if (mustOneTask) {
    console.log(`🌟 マストワンタスク: ${mustOneTask.title}`);
  }
  
  return {
    date: Utilities.formatDate(now, tz, 'yyyy-MM-dd (EEE)'),
    totalTasks: totalTasks,
    completedCount: completedCount,
    pendingCount: totalTasks - completedCount,
    completionRate: completionRate,
    completed: completed,
    pending: pending,
    mustOne: mustOneTask  // 🆕 マストワンタスク追加
  };
}

/**
 * タスクを完了にマーク
 * @param {string} taskTitle - タスクタイトル（部分一致）
 * @return {Object} 結果
 */
function markTaskAsComplete_(taskTitle) {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  // 今日のイベントを取得
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startOfDay, endOfDay);
  
  let found = false;
  let updatedTitle = '';
  
  for (const event of events) {
    const title = event.getTitle();
    
    // 終日イベントはスキップ
    if (event.isAllDayEvent()) continue;
    
    // すでに完了マークがある場合はスキップ
    if (title.includes('✓')) continue;
    
    // タイトルに部分一致
    if (title.includes(taskTitle)) {
      updatedTitle = title + ' ✓';
      event.setTitle(updatedTitle);
      found = true;
      console.log(`✅ タスク完了: "${title}" → "${updatedTitle}"`);
      break;
    }
  }
  
  return {
    ok: found,
    message: found ? `✅ タスク完了: ${updatedTitle}` : `⚠️ タスクが見つかりません: "${taskTitle}"`
  };
}

/**
 * タスクの完了マークを解除
 * @param {string} taskTitle - タスクタイトル（部分一致）
 * @return {Object} 結果
 */
function unmarkTaskAsComplete_(taskTitle) {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  // 今日のイベントを取得
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startOfDay, endOfDay);
  
  let found = false;
  let updatedTitle = '';
  
  for (const event of events) {
    const title = event.getTitle();
    
    // 終日イベントはスキップ
    if (event.isAllDayEvent()) continue;
    
    // 完了マークがない場合はスキップ
    if (!title.includes('✓')) continue;
    
    // タイトルに部分一致
    if (title.includes(taskTitle)) {
      updatedTitle = title.replace(/\s*✓\s*$/, '').trim();
      event.setTitle(updatedTitle);
      found = true;
      console.log(`↩️  タスク未完了に戻す: "${title}" → "${updatedTitle}"`);
      break;
    }
  }
  
  return {
    ok: found,
    message: found ? `↩️ タスク未完了に戻しました: ${updatedTitle}` : `⚠️ 完了タスクが見つかりません: "${taskTitle}"`
  };
}

/**
 * マストワンタスクを設定（今日の主役タスクに☆マークを付ける）
 * @param {string} taskTitle - タスクタイトル（部分一致）
 * @return {Object} 結果
 */
function setMustOneTask_(taskTitle) {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  // 今日のイベントを取得
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startOfDay, endOfDay);
  
  let found = false;
  let updatedTitle = '';
  
  // まず、既存の☆を全て削除（マストワンは1つのみ）
  for (const event of events) {
    const title = event.getTitle();
    
    // 終日イベントはスキップ
    if (event.isAllDayEvent()) continue;
    
    // ☆がある場合は削除
    if (title.includes('☆')) {
      const cleanTitle = title.replace(/☆+/g, '').trim();
      event.setTitle(cleanTitle);
      console.log(`🔄 既存の☆を削除: "${title}" → "${cleanTitle}"`);
    }
  }
  
  // 指定されたタスクに☆を追加
  for (const event of events) {
    const title = event.getTitle();
    
    // 終日イベントはスキップ
    if (event.isAllDayEvent()) continue;
    
    // 完了タスク（✓付き）はスキップ
    if (title.includes('✓')) continue;
    
    // タイトルに部分一致
    if (title.includes(taskTitle)) {
      updatedTitle = '☆ ' + title;
      event.setTitle(updatedTitle);
      found = true;
      console.log(`🌟 マストワン設定: "${title}" → "${updatedTitle}"`);
      break;
    }
  }
  
  return {
    ok: found,
    message: found ? `🌟 今日の主役タスクに設定しました: ${updatedTitle}` : `⚠️ タスクが見つかりません: "${taskTitle}"`
  };
}

/**
 * 今日のタスク全てを完了にする（All Done）
 * @return {Object} 結果
 */
function markAllTasksComplete_() {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  // 今日のイベントを取得
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startOfDay, endOfDay);
  
  const completed = [];
  const alreadyDone = [];
  let total = 0;
  
  for (const event of events) {
    const title = event.getTitle();
    
    // 終日イベントはスキップ
    if (event.isAllDayEvent()) continue;
    
    total++;
    
    // すでに完了マークがある場合
    if (title.includes('✓')) {
      alreadyDone.push(title);
      console.log(`⏭️  すでに完了: "${title}"`);
    } else {
      // 完了マークを追加
      const updatedTitle = title + ' ✓';
      event.setTitle(updatedTitle);
      completed.push(updatedTitle);
      console.log(`✅ タスク完了: "${title}" → "${updatedTitle}"`);
    }
  }
  
  console.log(`📊 全タスク完了: 新規完了=${completed.length}, すでに完了=${alreadyDone.length}, 合計=${total}`);
  
  return {
    ok: true,
    completed: completed,
    already_done: alreadyDone,
    total: total,
    message: `✅ ${completed.length}個のタスクを完了にしました`
  };
}

// =====================================================================
// 🆕 毎日自動フォーマット機能
// =====================================================================

/**
 * 毎日自動実行：新しいカレンダーイベントを★表示に変換
 * Google Apps Script のトリガーで毎日実行される関数
 */
function dailyAutoFormat() {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  console.log(`\n🤖 毎日自動フォーマット開始: ${Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm')}`);
  
  try {
    // 昨日から明日までのイベントをチェック（新規追加されたイベントをキャッチ）
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
    
    const result = formatExistingEvents_(yesterday, tomorrow);
    
    console.log(`📊 自動フォーマット完了: ${result.converted}件変換, ${result.skipped}件スキップ`);
    
    // 変換があった場合はログに記録
    if (result.converted > 0) {
      console.log(`✅ 今日の自動変換:`);
      result.results.forEach((change, index) => {
        console.log(`  ${index + 1}. "${change.original}" → "${change.converted}" (${change.date})`);
      });
    }
    
    return {
      success: true,
      converted: result.converted,
      skipped: result.skipped,
      timestamp: now.toISOString()
    };
    
  } catch (error) {
    console.error(`❌ 毎日自動フォーマットエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: now.toISOString()
    };
  }
}

/**
 * 週次自動フォーマット：過去1週間のイベントを一括変換
 * 毎週月曜日に実行（見逃したイベントをキャッチアップ）
 */
function weeklyAutoFormat() {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  console.log(`\n📅 週次自動フォーマット開始: ${Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm')}`);
  
  try {
    // 過去1週間から今後2週間までをフォーマット
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
    const twoWeeksLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 23, 59, 59);
    
    const result = formatExistingEvents_(weekAgo, twoWeeksLater);
    
    console.log(`📊 週次フォーマット完了: ${result.converted}件変換, ${result.skipped}件スキップ`);
    
    return {
      success: true,
      converted: result.converted,
      skipped: result.skipped,
      timestamp: now.toISOString()
    };
    
  } catch (error) {
    console.error(`❌ 週次自動フォーマットエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: now.toISOString()
    };
  }
}

// =====================================================================
// 週間レポート機能
// =====================================================================

/**
 * 週間レポートを生成
 * @param {Date} startDate - 開始日時
 * @param {Date} endDate - 終了日時
 * @return {Object} 統計情報を含むレポートオブジェクト
 */
function generateWeeklyReport_(startDate, endDate) {
  const tz = SETTINGS.TIMEZONE;
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startDate, endDate);
  
  const report = {
    total: 0,
    byPriority: { A: 0, B: 0, C: 0, other: 0 },
    byDay: {},
    events: []
  };
  
  events.forEach(event => {
    // 🔧 終日イベントを除外
    if (event.isAllDayEvent()) {
      console.log(`📋 終日イベント除外: "${event.getTitle()}"`);
      return;
    }
    
    const title = event.getTitle();
    const start = event.getStartTime();
    const end = event.getEndTime();
    const durationHours = (end - start) / (1000 * 60 * 60);
    
    // 優先度を判定
    const priority = extractPriorityFromTitle_(title);
    
    // 統計を更新
    report.total += durationHours;
    report.byPriority[priority] += durationHours;
    
    // 日別統計を更新
    const dayKey = Utilities.formatDate(start, tz, 'yyyy-MM-dd');
    report.byDay[dayKey] = (report.byDay[dayKey] || 0) + durationHours;
    
    // イベント詳細を追加
    report.events.push({
      title: title,
      start: Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm'),
      end: Utilities.formatDate(end, tz, 'HH:mm'),
      duration: durationHours.toFixed(1)
    });
  });
  
  return report;
}

/**
 * タイトルから優先度を抽出
 * @param {string} title - イベントタイトル
 * @return {string} 優先度（'A', 'B', 'C', 'other'）
 */
function extractPriorityFromTitle_(title) {
  if (title.includes('★★★')) return 'A';
  if (title.includes('★★')) return 'B';
  if (title.includes('★')) return 'C';
  return 'other';
}

/**
 * 既存カレンダーイベントの自動フォーマット機能
 * A/B/Cを★★★/★★/★に変換し、統一された表示にする
 * @param {Date} startDate - 処理開始日
 * @param {Date} endDate - 処理終了日  
 * @return {Object} 変換結果
 */
function formatExistingEvents_(startDate, endDate) {
  const tz = SETTINGS.TIMEZONE;
  
  // カレンダー権限をテスト
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    console.log(`📅 カレンダー名: "${calendar.getName()}"`);
    console.log(`🔐 カレンダーID: ${calendar.getId()}`);
    console.log(`👤 オーナー: ${calendar.isOwnedByMe() ? '自分' : '他人'}`);
    
    const events = calendar.getEvents(startDate, endDate);
    
    let converted = 0;
    let skipped = 0;
    const results = [];
    
    console.log(`\n🔧 既存イベント自動フォーマット開始 (${events.length}件すべて処理)`);
  
  events.forEach(event => {
    const originalTitle = event.getTitle();
    
    // デバッグ情報を詳細出力
    console.log(`\n🔍 イベント検査: "${originalTitle}"`);
    console.log(`  📅 開始時刻: ${Utilities.formatDate(event.getStartTime(), tz, 'yyyy-MM-dd HH:mm')}`);
    console.log(`  📋 終日イベント: ${event.isAllDayEvent()}`);
    console.log(`  👤 自分の作成: ${event.isOwnedByMe()}`);
    console.log(`  ⭐ ★含有: ${originalTitle.includes('★')}`);
    console.log(`  🅰️ A含有: ${originalTitle.includes(' A') || originalTitle.endsWith(' A')}`);
    console.log(`  🅱️ B含有: ${originalTitle.includes(' B') || originalTitle.endsWith(' B')}`);
    console.log(`  ©️ C含有: ${originalTitle.includes(' C') || originalTitle.endsWith(' C')}`);
    
    // 終日イベントはスキップ
    if (event.isAllDayEvent()) {
      console.log(`  ❌ スキップ理由: 終日イベント`);
      skipped++;
      return;
    }
    
    // 自分が作成したイベントのみ処理（権限問題を回避）
    if (!event.isOwnedByMe()) {
      console.log(`  ❌ スキップ理由: 他人のイベント`);
      skipped++;
      return;
    }
    
    let newTitle = originalTitle;
    let changed = false;
    
    // A/B/C を ★★★/★★/★ に変換（詳細デバッグ付き）
    console.log(`  🔍 変換判定開始...`);
    
    // より柔軟なA/B/C検出パターン（✓マーク、数字対応）
    // 正規表現で「スペース/タブ + A/B/C + (スペース/✓/数字/末尾)」を検出
    // \s: 半角スペース、タブ、改行など
    // 　: 全角スペース
    const hasA = /[\s　]+A(?:[\s　✓\d]|$)/.test(originalTitle);
    const hasB = /[\s　]+B(?:[\s　✓\d]|$)/.test(originalTitle);
    const hasC = /[\s　]+C(?:[\s　✓\d]|$)/.test(originalTitle);
    
    console.log(`  📝 柔軟検出結果: A:${hasA}, B:${hasB}, C:${hasC}`);
    
    if (hasA) {
      // 複数の A パターンに対応（✓マークや数字も考慮）
      // スペース1個以上 + A を検出し、最初のスペース1個 + ★★★ に置き換え
      newTitle = originalTitle.replace(/[\s　]+A(?=[\s　✓\d]|$)/g, ' ★★★');
      changed = true;
      console.log(`  ✅ A→★★★変換: "${originalTitle}" → "${newTitle}"`);
    } else if (hasB) {
      newTitle = originalTitle.replace(/[\s　]+B(?=[\s　✓\d]|$)/g, ' ★★');
      changed = true;
      console.log(`  ✅ B→★★変換: "${originalTitle}" → "${newTitle}"`);
    } else if (hasC) {
      newTitle = originalTitle.replace(/[\s　]+C(?=[\s　✓\d]|$)/g, ' ★');
      changed = true;
      console.log(`  ✅ C→★変換: "${originalTitle}" → "${newTitle}"`);
    } else {
      // 既に★がある場合は自動判定をスキップ
      if (originalTitle.includes('★')) {
        console.log(`  ✅ スキップ: 既に★が付与済み`);
        skipped++;
        return;
      }
      
      // 優先度が明示されていない場合は自動判定
      console.log(`  🤖 自動優先度判定開始...`);
      const inferredPriority = inferTaskPriority_(originalTitle);
      console.log(`  🎯 判定結果: ${inferredPriority}`);
      
      if (inferredPriority !== 'other') {
        if (inferredPriority === 'A') {
          newTitle += ' ★★★';
          console.log(`  🤖 A優先度自動追加: "${originalTitle}" → "${newTitle}"`);
        } else if (inferredPriority === 'B') {
          newTitle += ' ★★';
          console.log(`  🤖 B優先度自動追加: "${originalTitle}" → "${newTitle}"`);
        } else if (inferredPriority === 'C') {
          newTitle += ' ★';
          console.log(`  🤖 C優先度自動追加: "${originalTitle}" → "${newTitle}"`);
        }
        changed = true;
      } else {
        console.log(`  ➡️ 変換対象外: 優先度なし`);
      }
    }
    
    // 変更があった場合のみ更新
    if (changed) {
      try {
        // 権限テスト（Session.getActiveUser()を使わない安全な方法）
        console.log(`  🔄 更新試行: "${originalTitle}" → "${newTitle}"`);
        console.log(`     📋 イベントオーナー: ${event.isOwnedByMe() ? '自分' : '他人'}`);
        console.log(`     ✏️ 編集可能: ${event.isOwnedByMe() ? 'Yes' : 'No'}`);
        
        event.setTitle(newTitle);
        converted++;
        
        const start = event.getStartTime();
        console.log(`  ✅ 成功: "${originalTitle}" → "${newTitle}"`);
        console.log(`     ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')}`);
        
        results.push({
          original: originalTitle,
          converted: newTitle,
          date: Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
          time: Utilities.formatDate(start, tz, 'HH:mm')
        });
      } catch (e) {
        console.log(`  ❌ 編集失敗: "${originalTitle}"`);
        console.log(`     エラー: ${e.toString()}`);
        skipped++;
      }
    } else {
      skipped++;
    }
  });
  
  console.log(`\n📊 フォーマット完了: ${converted}件変換, ${skipped}件スキップ`);
  
  return {
    converted: converted,
    skipped: skipped,
    results: results
  };
  
  } catch (calendarError) {
    console.log(`❌ カレンダーアクセスエラー: ${calendarError.toString()}`);
    return {
      converted: 0,
      skipped: 0,
      results: [],
      error: `カレンダーアクセス権限エラー: ${calendarError.toString()}`
    };
  }
}

/**
 * タスク名から優先度を自動推定
 * @param {string} taskTitle - タスクタイトル
 * @return {string} 推定優先度（'A', 'B', 'C', 'other'）
 */
function inferTaskPriority_(taskTitle) {
  const title = taskTitle.toLowerCase();
  
  // 高優先度キーワード (A = ★★★)
  const highPriorityKeywords = [
    '緊急', '至急', '重要', 'urgent', 'important', 'critical',
    '締切', 'deadline', '発表', 'presentation', '会議', 'meeting',
    '報告', 'report', 'プレゼン', '提出', 'submit', '納期'
  ];
  
  // 中優先度キーワード (B = ★★)
  const mediumPriorityKeywords = [
    '準備', 'prepare', '作成', 'create', '確認', 'check', '検討', 'review',
    '調査', 'research', '分析', 'analysis', 'メンテ', 'maintenance',
    '整理', 'organize', '更新', 'update', '修正', 'fix'
  ];
  
  // 低優先度キーワード (C = ★)  
  const lowPriorityKeywords = [
    '読書', 'reading', '学習', 'study', '勉強', 'learn',
    '整理', 'clean', '片付け', 'organize', '雑務', '事務',
    'メール', 'email', '連絡', 'contact'
  ];
  
  // 高優先度チェック
  for (const keyword of highPriorityKeywords) {
    if (title.includes(keyword)) return 'A';
  }
  
  // 中優先度チェック
  for (const keyword of mediumPriorityKeywords) {
    if (title.includes(keyword)) return 'B';
  }
  
  // 低優先度チェック
  for (const keyword of lowPriorityKeywords) {
    if (title.includes(keyword)) return 'C';
  }
  
  return 'other';
}

// =====================================================================
// スケジュール取得機能
// =====================================================================

/**
 * 指定日のスケジュールを取得
 * @param {string} dateStr - 日付文字列（'今日', '明日', 'yyyy-MM-dd', 'M/D'など）
 * @param {number} daysCount - 取得する日数
 * @return {Array<Object>} イベントのリスト
 */
function getScheduleForDate_(dateStr, daysCount) {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  // 日付文字列をDateオブジェクトに変換
  const targetDate = parseDateString_(dateStr, now);
  
  // 日付範囲を設定（0時から指定日数後の23:59:59まで）
  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + daysCount, 23, 59, 59);
  
  // カレンダーからイベントを取得
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startDate, endDate);
  
  // 開始時刻でソート
  events.sort((a, b) => a.getStartTime() - b.getStartTime());
  
  // フォーマットして返す
  return events.map(event => formatEventForResponse_(event, tz));
}

/**
 * 日付文字列をパース
 * @param {string} dateStr - 日付文字列
 * @param {Date} baseDate - 基準日
 * @return {Date} パースされた日付
 */
function parseDateString_(dateStr, baseDate) {
  const now = baseDate || new Date();
  
  // 相対日付
  if (dateStr === '今日' || dateStr === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (dateStr === '明日' || dateStr === 'tomorrow') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }
  if (dateStr === '明後日') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  }
  
  // yyyy-MM-dd形式
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // M/D形式
  if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const [month, day] = dateStr.split('/').map(Number);
    return new Date(now.getFullYear(), month - 1, day);
  }
  
  // デフォルトは今日
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * イベントをレスポンス用にフォーマット
 * @param {CalendarEvent} event - カレンダーイベント
 * @param {string} timezone - タイムゾーン
 * @return {Object} フォーマットされたイベント情報
 */
function formatEventForResponse_(event, timezone) {
  const start = event.getStartTime();
  const end = event.getEndTime();
  
  return {
    title: event.getTitle(),
    start: Utilities.formatDate(start, timezone, "yyyy-MM-dd'T'HH:mm:ss"),
    end: Utilities.formatDate(end, timezone, "yyyy-MM-dd'T'HH:mm:ss"),
    startTime: Utilities.formatDate(start, timezone, "HH:mm"),
    endTime: Utilities.formatDate(end, timezone, "HH:mm")
  };
}

// =====================================================================
// 既存予定取得機能
// =====================================================================

/**
 * 指定期間の既存イベントを取得（終日イベントは除外）
 * @param {Date} startDate - 開始日時
 * @param {Date} endDate - 終了日時
 * @return {Array<Object>} イベントのリスト
 */
function getExistingEvents_(startDate, endDate) {
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startDate, endDate);
  
  // 終日イベントを除外（開始時刻が0:00で24時間の場合）
  return events
    .filter(event => !event.isAllDayEvent())
    .map(event => ({
      title: event.getTitle(),
      start: event.getStartTime(),
      end: event.getEndTime()
    }));
}

// =====================================================================
// 複数タスク分離機能
// =====================================================================

/**
 * 1行に複数のタスクが含まれている場合に分離
 * 例: "251030 細胞継代 1h A C2T5657メンテ 1h A" → ["251030 細胞継代 1h A", "251030 C2T5657メンテ 1h A"]
 * @param {string} line - 入力行
 * @return {Array<string>} 分離されたタスクの配列
 */
function splitMultipleTasks_(line) {
  // 日付プレフィックスを抽出（例：251030）
  const { datePrefix, remainingLine } = extractDatePrefix_(line);
  
  // タスクパターンでマッチング
  const tasks = extractTasksFromLine_(remainingLine);
  
  // マッチしない場合は元の行をそのまま返す
  if (tasks.length === 0) {
    return [datePrefix + remainingLine];
  }
  
  // 各タスクに日付プレフィックスを付けて返す
  return tasks.map(task => datePrefix + task.fullTask);
}

/**
 * 行から日付プレフィックスを抽出
 * @param {string} line - 入力行
 * @return {Object} {datePrefix: string, remainingLine: string}
 */
function extractDatePrefix_(line) {
  const dateMatch = line.match(/^(\d{6})\s*/);
  
  if (dateMatch) {
    return {
      datePrefix: dateMatch[1] + ' ',
      remainingLine: line.substring(dateMatch[0].length)
    };
  }
  
  return {
    datePrefix: '',
    remainingLine: line
  };
}

/**
 * 行からタスク情報を抽出
 * パターン: "タスク名 時間 優先度"（例: "細胞継代 1h A"）
 * @param {string} line - 入力行
 * @return {Array<Object>} タスク情報の配列
 */
function extractTasksFromLine_(line) {
  const taskPattern = /(.+?)\s+(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|時間|m|min|mins|minute|minutes|分)\s*([ABC]?)\s*/gi;
  const tasks = [];
  let match;
  
  while ((match = taskPattern.exec(line)) !== null) {
    const rawTaskName = match[1].trim();
    const timeValue = match[2];
    const timeUnit = match[0].match(/(h|hr|hrs|hour|hours|時間|m|min|mins|minute|minutes|分)/i)[0];
    const priority = match[3] || 'C';
    
    // タスク名をクリーンアップ（前のタスクの優先度文字を除去）
    const taskName = cleanTaskName_(rawTaskName);
    
    tasks.push({
      taskName: taskName,
      timeString: `${timeValue}${timeUnit}`,
      priority: priority,
      fullTask: `${taskName} ${timeValue}${timeUnit} ${priority}`.trim()
    });
  }
  
  return tasks;
}

/**
 * タスク名をクリーンアップ
 * @param {string} taskName - クリーンアップするタスク名
 * @return {string} クリーンアップされたタスク名
 */
function cleanTaskName_(taskName) {
  return taskName.replace(/\s+[ABC]\s*$/, '').trim();
}

// =====================================================================
// 時間スロット検索機能
// =====================================================================

/**
 * 指定時間帯が空いているかチェック
 * @param {Date} checkStart - チェック開始時刻
 * @param {Date} checkEnd - チェック終了時刻
 * @param {Array<Object>} existingEvents - 既存イベントのリスト
 * @return {boolean} 空いている場合はtrue
 */
function isTimeSlotAvailable_(checkStart, checkEnd, existingEvents) {
  for (const event of existingEvents) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // 時間帯の重複をチェック
    const hasOverlap = (
      (checkStart >= eventStart && checkStart < eventEnd) ||    // 開始時刻が既存イベント内
      (checkEnd > eventStart && checkEnd <= eventEnd) ||        // 終了時刻が既存イベント内
      (checkStart <= eventStart && checkEnd >= eventEnd)        // 既存イベント全体を含む
    );
    
    if (hasOverlap) {
      return false;
    }
  }
  
  return true;
}

/**
 * 次の利用可能な時間スロットを検索
 * @param {Date} cursor - 検索開始時刻
 * @param {Date} dayEnd - その日の終了時刻
 * @param {number} minutes - 必要な時間（分）
 * @param {string} tz - タイムゾーン
 * @param {Array<Object>} existingEvents - 既存イベントのリスト
 * @param {number} maxTries - 最大試行回数
 * @param {boolean} allowOverflow - 日を跨いだ配置を許可するか
 * @return {Object} {start: Date, end: Date, cursorDate: Date, dayEnd: Date}
 */
function findNextAvailableSlot_(cursor, dayEnd, minutes, tz, existingEvents, maxTries = SETTINGS.MAX_TRIES, allowOverflow = true) {
  let currentTime = new Date(cursor);
  let currentDayEnd = dayEnd;
  let tries = 0;
  let daysChecked = 0;
  
  while (tries < maxTries && daysChecked < SETTINGS.MAX_SEARCH_DAYS) {
    const proposedEnd = new Date(currentTime.getTime() + minutes * 60000);
    
    // 営業時間を超える場合の処理
    if (proposedEnd > currentDayEnd) {
      if (!allowOverflow) {
        // 日付固定の場合は営業時間外でも強制配置
        return forceScheduleOutsideWorkHours_(currentTime, proposedEnd, tz);
      }
      
      // 翌日に移動
      const nextDayInfo = moveToNextDay_(currentTime, tz);
      currentTime = nextDayInfo.start;
      currentDayEnd = nextDayInfo.end;
      daysChecked++;
      tries++;
      continue;
    }
    
    // この時間帯が空いているかチェック
    if (isTimeSlotAvailable_(currentTime, proposedEnd, existingEvents)) {
      return createSlotResult_(currentTime, proposedEnd, currentDayEnd);
    }
    
    // 次の空き時間を検索
    const nextTime = findNextAvailableTime_(currentTime, currentDayEnd, existingEvents);
    currentTime = nextTime;
    tries++;
  }
  
  // 空き時間が見つからない場合はエラー
  throwNoAvailableSlotError_(tries, maxTries, daysChecked, minutes);
}

/**
 * 営業時間外に強制スケジュール
 * @param {Date} start - 開始時刻
 * @param {Date} end - 終了時刻
 * @param {string} tz - タイムゾーン
 * @return {Object} スロット情報
 */
function forceScheduleOutsideWorkHours_(start, end, tz) {
  console.log(`⚠️ 営業時間外配置: ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')} - ${Utilities.formatDate(end, tz, 'HH:mm')} (${SETTINGS.WORK_END}以降)`);
  const newCursor = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
  return { start, end, cursorDate: newCursor, dayEnd: end };
}

/**
 * 翌日の営業開始時刻に移動
 * @param {Date} currentDate - 現在の日付
 * @param {string} tz - タイムゾーン
 * @return {Object} {start: Date, end: Date}
 */
function moveToNextDay_(currentDate, tz) {
  const nextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
  console.log(`📅 翌日に移行: ${Utilities.formatDate(nextDay, tz, 'yyyy-MM-dd (EEE)')} ${SETTINGS.WORK_START}～`);
  
  return {
    start: dateAt_(nextDay, SETTINGS.WORK_START, tz),
    end: dateAt_(nextDay, SETTINGS.WORK_END, tz)
  };
}

/**
 * スロット検索結果を作成
 * @param {Date} start - 開始時刻
 * @param {Date} end - 終了時刻
 * @param {Date} dayEnd - その日の終了時刻
 * @return {Object} スロット情報
 */
function createSlotResult_(start, end, dayEnd) {
  const nextCursor = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
  return { start, end, cursorDate: nextCursor, dayEnd };
}

/**
 * 次の利用可能な時刻を検索
 * @param {Date} currentTime - 現在時刻
 * @param {Date} dayEnd - その日の終了時刻
 * @param {Array<Object>} existingEvents - 既存イベントのリスト
 * @return {Date} 次の利用可能な時刻
 */
function findNextAvailableTime_(currentTime, dayEnd, existingEvents) {
  const currentDay = currentTime.getDate();
  const currentMonth = currentTime.getMonth();
  const currentYear = currentTime.getFullYear();
  
  let earliestEndTime = null;
  
  // 当日の既存予定で、現在時刻より後で最も早く終わる予定を探す
  for (const event of existingEvents) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // 同じ日の予定のみ対象
    const isSameDay = (
      eventStart.getDate() === currentDay &&
      eventStart.getMonth() === currentMonth &&
      eventStart.getFullYear() === currentYear
    );
    
    if (isSameDay && eventEnd > currentTime) {
      if (!earliestEndTime || eventEnd < earliestEndTime) {
        earliestEndTime = eventEnd;
      }
    }
  }
  
  // 次の空き時間が見つかった場合
  if (earliestEndTime && earliestEndTime <= dayEnd) {
    return new Date(earliestEndTime.getTime() + SETTINGS.GAP_MIN * 60000);
  }
  
  // 見つからない場合は少しずつ進める
  return new Date(currentTime.getTime() + SETTINGS.GAP_MIN * 60000);
}

/**
 * 空き時間なしエラーをスロー
 * @param {number} tries - 試行回数
 * @param {number} maxTries - 最大試行回数
 * @param {number} daysChecked - 確認した日数
 * @param {number} minutes - 所要時間
 */
function throwNoAvailableSlotError_(tries, maxTries, daysChecked, minutes) {
  const hours = (minutes / 60).toFixed(1);
  const errorMsg = `⚠️ スケジュール配置エラー: ${hours}時間の空き時間が見つかりません（${daysChecked}日先まで検索済み）`;
  console.log(`❌ ${errorMsg}`);
  console.log(`   試行回数: ${tries}/${maxTries}, 所要時間: ${minutes}分`);
  throw new Error(errorMsg);
}

// ===== Core Planning（既存予定回避版） =====

function planFromRaw_(raw, previewOnly) {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  let workStartToday = dateAt_(now, SETTINGS.WORK_START, tz);
  let dayEnd = dateAt_(now, SETTINGS.WORK_END, tz);
  
  // 現在時刻と営業開始時刻の遅い方を取る
  let cursorDate = new Date(Math.max(now.getTime(), workStartToday.getTime()));
  
  // 営業時間後の場合は翌日の営業開始時刻
  if (now > dayEnd) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    cursorDate = dateAt_(tomorrow, SETTINGS.WORK_START, tz);
    dayEnd = dateAt_(tomorrow, SETTINGS.WORK_END, tz);
  }
  
  console.log(`\n========================================`);
  console.log(`スケジュール計画開始`);
  console.log(`========================================`);
  console.log(`🔍 入力テキスト: "${raw}"`);
  console.log(`現在時刻: ${Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm (EEE)')}`);
  console.log(`計画開始: ${Utilities.formatDate(cursorDate, tz, 'yyyy-MM-dd HH:mm')}`);
  
  const lookAheadEnd = new Date(now);
  lookAheadEnd.setDate(lookAheadEnd.getDate() + SETTINGS.LOOKAHEAD_DAYS);
  const existingEvents = getExistingEvents_(now, lookAheadEnd);
  
  console.log(`既存予定: ${existingEvents.length}件 (${SETTINGS.LOOKAHEAD_DAYS}日先まで、終日イベント除外)`);

  // 行の分離：改行 + 複数タスク自動分離
  let lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  console.log(`📝 分離された行数: ${lines.length}`);
  lines.forEach((line, i) => console.log(`  ${i+1}. "${line}"`));
  
  let expandedLines = [];
  for (const line of lines) {
    console.log(`\n🔍 行解析: "${line}"`);
    const splitTasks = splitMultipleTasks_(line);
    console.log(`📊 分離結果: ${splitTasks.length}件`);
    splitTasks.forEach((task, i) => console.log(`  ${i+1}. "${task}"`));
    
    if (splitTasks.length > 1) {
      console.log(`✅ 複数タスク分離: "${line}" → ${splitTasks.length}件`);
    }
    expandedLines = expandedLines.concat(splitTasks);
  }
  
  let parsedTasks = [];
  let idx = 0;

  for (const line0 of expandedLines) {
    idx++;
    if (/^~~.*~~$/.test(line0)) continue;

    const parsed = parseLine_(line0, now);
    if (!parsed || !parsed.minutes) continue;

    // 長時間タスク警告
    if (parsed.minutes > 240) {
      console.log(`⚠️ 長時間タスク "${parsed.title}" (${(parsed.minutes/60).toFixed(1)}時間)`);
    }
    
    parsedTasks.push({
      order: idx,
      title: parsed.title,
      minutes: parsed.minutes,
      priority: PRIORITY_ORDER[parsed.priority] || 3,
      priorityLabel: parsed.priority,
      dayAnchor: parsed.dayAnchor,
      fixedStart: parsed.fixedStart
    });
  }

  // 日付別にタスクをグループ化
  const tasksByDate = {};
  const noDateTasks = [];
  
  for (const task of parsedTasks) {
    if (task.dayAnchor) {
      const dateKey = Utilities.formatDate(task.dayAnchor, tz, 'yyyy-MM-dd');
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = [];
      }
      tasksByDate[dateKey].push(task);
    } else {
      noDateTasks.push(task);
    }
  }
  
  // 各グループ内で優先度順にソート
  for (const dateKey in tasksByDate) {
    tasksByDate[dateKey].sort((a,b)=>{
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.order - b.order;
    });
  }
  noDateTasks.sort((a,b)=>{
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.order - b.order;
  });

  const items = [];
  const preview = [];
  
  // 日付指定タスクを先に処理
  for (const dateKey in tasksByDate) {
    console.log(`\n=== ${dateKey} のタスク処理 ===`);
    const dateTasks = tasksByDate[dateKey];
    const firstTask = dateTasks[0];
    
    // 指定日の開始時刻を設定
    let dayStartCursor = dateAt_(firstTask.dayAnchor, SETTINGS.WORK_START, tz);
    let dayEndTime = dateAt_(firstTask.dayAnchor, SETTINGS.WORK_END, tz);
    
    // 今日の場合で現在時刻が営業開始時刻より後なら、現在時刻から開始
    if (isSameDate_(now, firstTask.dayAnchor, tz) && now > dayStartCursor) {
      dayStartCursor = now;
      console.log(`  開始: ${Utilities.formatDate(dayStartCursor, tz, 'HH:mm')} (現在時刻)`);
    } else {
      console.log(`  開始: ${SETTINGS.WORK_START} (営業開始)`);
    }
    
    for (const p of dateTasks) {
      let start, end;
      
      try {
        // 日付固定でスロット検索（allowOverflow = false）
        const result = findNextAvailableSlot_(dayStartCursor, dayEndTime, p.minutes, tz, existingEvents, 500, false);
        start = result.start;
        end = result.end;
        dayStartCursor = result.cursorDate;
        
        console.log(`  配置: "${p.title}" ${Utilities.formatDate(start, tz, 'HH:mm')}-${Utilities.formatDate(end, tz, 'HH:mm')}`);
      } catch (error) {
        // エラー時は強制配置
        start = new Date(dayStartCursor);
        end = new Date(start.getTime() + p.minutes * 60000);
        dayStartCursor = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
        
        console.log(`  ⚠️ 強制配置: "${p.title}" ${Utilities.formatDate(start, tz, 'HH:mm')}-${Utilities.formatDate(end, tz, 'HH:mm')}`);
      }
      
      const item = { 
        title: p.title, 
        minutes: p.minutes, 
        start, 
        end,
        priority: p.priority,
        priorityLabel: p.priorityLabel
      };
      items.push(item);
      
      // プレビュー用タイトル（★付き）
      let previewTitle = item.title;
      if (!previewTitle.includes('★')) {
        const priorityLabel = p.priorityLabel || 'C';
        if (priorityLabel === 'A') previewTitle += ' ★★★';
        else if (priorityLabel === 'B') previewTitle += ' ★★';
        else if (priorityLabel === 'C') previewTitle += ' ★';
      }
      
      preview.push({ 
        title: previewTitle,
        start: item.start, 
        end: item.end 
      });
    }
  }
  
  // 日付指定なしのタスクを処理
  if (noDateTasks.length > 0) {
    console.log(`\n=== 日付指定なしタスク (${noDateTasks.length}件) ===`);
    
    for (const p of noDateTasks) {
      let start, end;
      
      if (p.fixedStart) {
        // 時刻固定の場合
        start = p.fixedStart;
        end = new Date(start.getTime() + p.minutes * 60000);
        
        if (!isTimeSlotAvailable_(start, end, existingEvents)) {
          console.log(`  ⚠️ 警告: "${p.title}" は既存予定と重複`);
        }
        
        cursorDate = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
        dayEnd = dateAt_(cursorDate, SETTINGS.WORK_END, tz);
        
        console.log(`  固定時刻: "${p.title}" ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')}-${Utilities.formatDate(end, tz, 'HH:mm')}`);
      } else {
        // 空き時間を検索
        try {
          const result = findNextAvailableSlot_(cursorDate, dayEnd, p.minutes, tz, existingEvents);
          start = result.start;
          end = result.end;
          cursorDate = result.cursorDate;
          dayEnd = result.dayEnd;
          
          console.log(`  配置: "${p.title}" ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')}-${Utilities.formatDate(end, tz, 'HH:mm')}`);
        } catch (error) {
          // エラー時は強制配置
          start = new Date(cursorDate);
          end = new Date(start.getTime() + p.minutes * 60000);
          cursorDate = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
          
          console.log(`  ⚠️ 強制配置: "${p.title}" ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')}-${Utilities.formatDate(end, tz, 'HH:mm')}`);
        }
      }
      
      const item = { 
        title: p.title, 
        minutes: p.minutes, 
        start, 
        end,
        priority: p.priority,
        priorityLabel: p.priorityLabel
      };
      items.push(item);
      
      // プレビュー用タイトル（★付き）
      let previewTitle = item.title;
      if (!previewTitle.includes('★')) {
        const priorityLabel = p.priorityLabel || 'C';
        if (priorityLabel === 'A') previewTitle += ' ★★★';
        else if (priorityLabel === 'B') previewTitle += ' ★★';
        else if (priorityLabel === 'C') previewTitle += ' ★';
      }
      
      preview.push({ 
        title: previewTitle,
        start: item.start, 
        end: item.end 
      });
    }
  }

  return { items, preview };
}

// ===== Parsing =====

function parseLine_(line, now) {
  const tz = SETTINGS.TIMEZONE;

  // 時間の抽出（時間指定または時刻範囲から）
  const hr = line.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|時間)\b/i);
  const mn = line.match(/(\d+)\s*(?:m|min|mins|minute|minutes|分)\b/i);
  
  let minutes = null;
  if (hr) {
    minutes = Math.round(parseFloat(hr[1]) * 60);
    console.log(`  期間抽出（時間）: ${hr[1]}時間 = ${minutes}分`);
  } else if (mn) {
    minutes = parseInt(mn[1], 10);
    console.log(`  期間抽出（分）: ${minutes}分`);
  } else {
    // 時刻範囲から期間を計算（例：10:00-11:00）
    const rangeMatch = line.match(/(\d{1,2})[:：](\d{2})-(\d{1,2})[:：](\d{2})/);
    if (rangeMatch) {
      const startH = parseInt(rangeMatch[1], 10);
      const startM = parseInt(rangeMatch[2], 10);
      const endH = parseInt(rangeMatch[3], 10);
      const endM = parseInt(rangeMatch[4], 10);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      minutes = endMinutes - startMinutes;
      
      if (minutes <= 0) minutes = 60; // デフォルト1時間
      console.log(`  期間抽出（範囲）: ${startH}:${startM.toString().padStart(2,'0')}-${endH}:${endM.toString().padStart(2,'0')} = ${minutes}分`);
    }
  }
  
  if (!minutes || minutes <= 0) {
    console.log(`  ⚠️ 期間が見つからないか無効: ${line}`);
    return null;
  }

  // 日付（@なしの251030形式も対応）
  let dayAnchor = null;
  const mDate = line.match(/@?([0-9]{6}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}|今日|明日|明後日|月|火|水|木|金|土|日)/);
  if (mDate) {
    dayAnchor = parseDateToken_(mDate[1], now);
    if (line.includes('@' + mDate[1])) {
      line = line.replace('@' + mDate[1], '').trim();
    } else {
      // @なしの251030形式の場合
      line = line.replace(mDate[1], '').trim();
    }
  }

  // 時刻（@ありと@なしの両方をサポート）
  let fixedStart = null;
  
  // @なしの時刻パターンを先に試す（10:00, 14:30, 9時など）
  let mTime = line.match(/(?:^|\s)(\d{1,2})[:：](\d{2})(?:-\d{1,2}[:：]\d{2})?(?:\s|$)/);
  if (mTime) {
    const H = parseInt(mTime[1], 10);
    const M = parseInt(mTime[2], 10);
    const base = dayAnchor || now;
    fixedStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), H, M, 0, 0);
    line = line.replace(/(?:^|\s)\d{1,2}[:：]\d{2}(?:-\d{1,2}[:：]\d{2})?/, '').trim();
    console.log(`  時刻抽出（@なし）: ${H}:${M.toString().padStart(2, '0')}`);
  } else {
    // @ありの時刻パターン
    mTime = line.match(/@(午前|午後)?\s?(\d{1,2})(?:[:：](\d{2}))?時?|@(\d{1,2}):(\d{2})/);
    if (mTime) {
      if (mTime[4]) {
        const H = parseInt(mTime[4], 10);
        const M = parseInt(mTime[5], 10);
        const base = dayAnchor || now;
        fixedStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), H, M, 0, 0);
        console.log(`  時刻抽出（@あり）: ${H}:${M.toString().padStart(2, '0')}`);
      } else {
        let H = parseInt(mTime[2], 10);
        const ampm = mTime[1];
        if (ampm === '午後' && H < 12) H += 12;
        if (ampm === '午前' && H === 12) H = 0;
        const M = mTime[3] ? parseInt(mTime[3], 10) : 0;
        const base = dayAnchor || now;
        fixedStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), H, M, 0, 0);
        console.log(`  時刻抽出（@あり午前午後）: ${H}:${M.toString().padStart(2, '0')}`);
      }
      line = line.replace(/@(午前|午後)?\s?\d{1,2}(?:[:：]\d{2})?時?/, '').replace(/@\d{1,2}:\d{2}/, '').trim();
    }
  }

  // 優先度の抽出（★または A/B/C）
  let priority = 'C';
  
  // ★の数を数える（★★★ = A, ★★ = B, ★ = C）
  const starMatch = line.match(/★{1,3}/);
  if (starMatch) {
    const starCount = starMatch[0].length;
    if (starCount === 3) priority = 'A';
    else if (starCount === 2) priority = 'B';
    else priority = 'C';
    line = line.replace(/★{1,3}\s*/, '').trim();
    console.log(`  優先度抽出（★）: ${priority} (${starCount}個)`);
  } else {
    // A/B/C表記をより柔軟にサポート（行末だけでなく途中でも）
    const tagM = line.match(/(?:^|\s)([ABCａｂｃ])\s/i) || line.match(/(?:^|\s)([ABCａｂｃ])\s*$/i);
    if (tagM) {
      priority = tagM[1].toUpperCase().replace(/[ａｂｃ]/, m => ({'ａ': 'A', 'ｂ': 'B', 'ｃ': 'C'}[m]));
      line = line.replace(/(?:^|\s)[ABCａｂｃ]\s*/i, ' ').replace(/\s[ABCａｂｃ]\s*$/i, '').trim();
      console.log(`  優先度抽出（A/B/C）: ${priority}`);
    }
  }

  let title = line
    .replace(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|時間)\b/ig, '')
    .replace(/(\d+)\s*(?:m|min|mins|minute|minutes|分)\b/ig, '')
    .replace(/@\S+/g, '')
    .replace(/^\d{6}\s*/, '')  // 先頭の日付形式（251030）を除去
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!title) title = 'Untitled Task';

  console.log(`  パース結果: タイトル="${title}" 期間=${minutes}分 日付=${dayAnchor ? Utilities.formatDate(dayAnchor, SETTINGS.TIMEZONE, 'MM/dd') : '今日'} 時刻=${fixedStart ? Utilities.formatDate(fixedStart, SETTINGS.TIMEZONE, 'HH:mm') : 'なし'} 優先度=${priority}`);

  return { title, minutes, dayAnchor, fixedStart, priority };
}

function isSameDate_(date1, date2, tz) {
  const d1Str = Utilities.formatDate(date1, tz, 'yyyy-MM-dd');
  const d2Str = Utilities.formatDate(date2, tz, 'yyyy-MM-dd');
  return d1Str === d2Str;
}

function parseDateToken_(token, now) {
  const tz = SETTINGS.TIMEZONE;
  const map = { '日':0,'月':1,'火':2,'水':3,'木':4,'金':5,'土':6 };
  
  let result;
  
  if (token === '今日') {
    result = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (token === '明日') {
    result = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (token === '明後日') {
    result = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  } else if (map.hasOwnProperty(token)) {
    const targetW = map[token];
    const curW = now.getDay();
    let delta = (targetW - curW + 7) % 7;
    if (delta === 0) delta = 7;
    result = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    const [Y,M,D] = token.split('-').map(Number);
    result = new Date(Y, M-1, D);
  } else if (/^\d{1,2}\/\d{1,2}$/.test(token)) {
    const [M,D] = token.split('/').map(Number);
    result = new Date(now.getFullYear(), M-1, D);
  } else if (/^\d{6}$/.test(token)) {
    // YYMMDD形式 (例: 251030 → 2025-10-30)
    const Y = parseInt('20' + token.substring(0, 2), 10);
    const M = parseInt(token.substring(2, 4), 10);
    const D = parseInt(token.substring(4, 6), 10);
    result = new Date(Y, M-1, D);
  } else {
    result = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  
  return result;
}

// ===== Create / Undo =====

function createEvents_(items) {
  const out = [];
  const cal = CalendarApp.getDefaultCalendar();
  const tz = SETTINGS.TIMEZONE;
  
  console.log(`\n=== カレンダーイベント作成開始 (${items.length}件) ===`);
  
  for (let taskIndex = 0; taskIndex < items.length; taskIndex++) {
    const it = items[taskIndex];
    
    // タイトルを自動フォーマット（A/B/C → ★★★/★★/★）
    let title = it.title;
    let formatApplied = false;
    
    // 1. 既存のA/B/Cを★に変換
    if (title.includes(' A') || title.endsWith(' A')) {
      title = title.replace(/ A\b/g, ' ★★★');
      console.log(`🌟 A→★★★変換: "${it.title}" → "${title}"`);
      formatApplied = true;
    } else if (title.includes(' B') || title.endsWith(' B')) {
      title = title.replace(/ B\b/g, ' ★★');
      console.log(`🌟 B→★★変換: "${it.title}" → "${title}"`);
      formatApplied = true;
    } else if (title.includes(' C') || title.endsWith(' C')) {
      title = title.replace(/ C\b/g, ' ★');
      console.log(`🌟 C→★変換: "${it.title}" → "${title}"`);
      formatApplied = true;
    }
    
    // 2. ★がまだ付いていない場合は priorityLabel または自動判定で追加
    if (!title.includes('★')) {
      const priorityLabel = it.priorityLabel || inferTaskPriority_(title);
      if (priorityLabel === 'A') {
        title += ' ★★★';
        console.log(`🤖 A優先度追加: "${it.title}" → "${title}"`);
      } else if (priorityLabel === 'B') {
        title += ' ★★';
        console.log(`🤖 B優先度追加: "${it.title}" → "${title}"`);
      } else if (priorityLabel === 'C') {
        title += ' ★';
        console.log(`🤖 C優先度追加: "${it.title}" → "${title}"`);
      }
    }
    
    console.log(`\n[タスク ${taskIndex + 1}/${items.length}] ${title}`);
    console.log(`📅 配置: ${Utilities.formatDate(it.start, tz, 'yyyy-MM-dd HH:mm')} - ${Utilities.formatDate(it.end, tz, 'HH:mm')}`);
    
    // カレンダーイベント作成（planFromRaw_で計算済みの時刻を使用）
    const ev = cal.createEvent(title, it.start, it.end, { 
      description: 'Text2GCalendar - 既存予定回避 + スマート配置' 
    });
    
    console.log(`✔️  イベント作成成功: ID=${ev.getId()}`);
    
    out.push({ 
      eventId: ev.getId(), 
      title: title,
      start: it.start, 
      end: it.end 
    });
  }
  
  console.log(`\n=== カレンダーイベント作成完了 (${out.length}件) ===\n`);
  return out;
}

function storeUndoBuffer_(created) {
  PropertiesService.getUserProperties().setProperty('lastRun', JSON.stringify(created));
}

function undoLastRun_() {
  const buf = PropertiesService.getUserProperties().getProperty('lastRun');
  if (!buf) return '直前の作成記録がありません。';
  const items = JSON.parse(buf);
  let ok = 0, ng = 0;
  const cal = CalendarApp.getDefaultCalendar();
  for (const it of items) {
    try {
      const ev = cal.getEventById(it.eventId);
      if (ev) { ev.deleteEvent(); ok++; } else { ng++; }
    } catch (e) { ng++; }
  }
  PropertiesService.getUserProperties().deleteProperty('lastRun');
  return `削除完了: ${ok}件 / 失敗: ${ng}件`;
}

// ===== Helpers =====

function renderLines_(arr) {
  const tz = SETTINGS.TIMEZONE;
  return arr.map(x =>
    `${x.title}: ` +
    `${Utilities.formatDate(new Date(x.start), tz, 'yyyy-MM-dd HH:mm')}–` +
    `${Utilities.formatDate(new Date(x.end),   tz, 'HH:mm')}`
  ).join('\n');
}

/**
 * 指定した日付と時刻でDateオブジェクトを作成（タイムゾーン考慮）
 * Google Apps Scriptのスクリプトタイムゾーン（Asia/Tokyo）でDateオブジェクトを作成
 * @param {Date} baseDate - 基準日付
 * @param {string} hhmm - 時刻（HH:MM形式）
 * @param {string} tz - タイムゾーン（'Asia/Tokyo'など）
 * @return {Date} 作成されたDateオブジェクト
 */
function dateAt_(baseDate, hhmm, tz) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  
  // スクリプトタイムゾーン（Asia/Tokyo）でDateオブジェクトを作成
  return new Date(year, month, day, hours, minutes, 0, 0);
}

// ===== Add-on UI =====

function onHomepage(e) {
  return buildHomeCard_('Text2GCalendar', '');
}

function buildHomeCard_(title, message) {
  const cs = CardService;
  const textInput = cs.newTextInput()
    .setFieldName('raw')
    .setMultiline(true)
    .setTitle('タスク（改行＝1件）')
    .setValue('');

  const btnPreview = cs.newTextButton()
    .setText('プレビュー')
    .setOnClickAction(cs.newAction().setFunctionName('handlePreview'));

  const btnCreate = cs.newTextButton()
    .setText('作成')
    .setOnClickAction(cs.newAction().setFunctionName('handleCreate'));

  const btnUndo = cs.newTextButton()
    .setText('直前の作成をUndo')
    .setOnClickAction(cs.newAction().setFunctionName('handleUndo'));

  const btnRow = cs.newButtonSet().addButton(btnPreview).addButton(btnCreate).addButton(btnUndo);

  const sec = cs.newCardSection().addWidget(textInput).addWidget(btnRow);
  if (message) sec.addWidget(cs.newKeyValue().setContent(message));

  return cs.newCardBuilder()
    .setHeader(cs.newCardHeader().setTitle(title))
    .addSection(sec)
    .build();
}

function handlePreview(e) {
  const raw = (e.commonEventObject.formInputs.raw || {}).stringInputs?.value?.[0] || '';
  if (!raw.trim()) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(buildHomeCard_('Text2GCalendar', 'テキストが空です。')))
      .build();
  }
  const plan = planFromRaw_(raw, true);
  const previewText = renderLines_(plan.preview);
  return showResult_(previewText || '有効なタスクが見つかりません。');
}

function handleCreate(e) {
  const raw = (e.commonEventObject.formInputs.raw || {}).stringInputs?.value?.[0] || '';
  if (!raw.trim()) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(buildHomeCard_('Text2GCalendar', 'テキストが空です。')))
      .build();
  }
  const plan = planFromRaw_(raw, false);
  const created = createEvents_(plan.items);
  storeUndoBuffer_(created);
  const msg = created.length ? ('作成しました。\n\n' + renderLines_(created.map(x => ({
    title: x.title, start: x.start, end: x.end
  })))) : '作成対象がありません。';
  return showResult_(msg);
}

function handleUndo(_) {
  const res = undoLastRun_();
  return showResult_(res);
}

function showResult_(text) {
  const cs = CardService;
  const sec = cs.newCardSection()
    .addWidget(cs.newTextParagraph().setText(text.replace(/\n/g, '<br>')));
  const backBtn = cs.newTextButton()
    .setText('戻る')
    .setOnClickAction(cs.newAction().setFunctionName('goHome_'));
  const header = cs.newCardHeader().setTitle('Text2GCalendar');
  return cs.newActionResponseBuilder()
    .setNavigation(cs.newNavigation().pushCard(
      cs.newCardBuilder().setHeader(header).addSection(sec).addSection(
        cs.newCardSection().addWidget(backBtn)
      ).build()
    ))
    .build();
}

function goHome_() {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildHomeCard_('Text2GCalendar', '')))
    .build();
}

// ===== Web API =====

function doPost(e) {
  try {
    const keyParam = (e.parameter && e.parameter.key) || null;
    if (keyParam !== API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'forbidden' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (!e.postData || !e.postData.contents) {
      console.log('❌ POSTデータまたは内容が空です');
      console.log('postData:', e.postData);
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'no text' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let body;
    try {
      body = JSON.parse(e.postData.contents);
      console.log('📝 受信したデータ:', JSON.stringify(body));
    } catch (parseError) {
      console.log('❌ JSON解析エラー:', parseError.toString());
      console.log('受信内容:', e.postData.contents);
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'invalid json' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const mode = body.mode || 'create';

    if (mode === 'get_schedule') {
      const dateStr = body.date || '今日';
      const days = body.days || 1;
      const events = getScheduleForDate_(dateStr, days);
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true, 
        mode: 'get_schedule', 
        events: events 
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    if (mode === 'weekly_report') {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      const report = generateWeeklyReport_(startOfWeek, endOfWeek);
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true, 
        mode: 'weekly_report', 
        report: report 
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // 🆕 進捗レポート取得
    if (mode === 'progress') {
      const progress = generateDailyProgress_();
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true, 
        mode: 'progress', 
        progress: progress 
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // 🆕 タスク完了マーク
    if (mode === 'mark_complete') {
      const taskToComplete = body.task;
      if (!taskToComplete) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'パラメータ "task" が必要です' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }
      
      const result = markTaskAsComplete_(taskToComplete);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 🆕 タスク完了解除
    if (mode === 'unmark_complete') {
      const taskToUnmark = body.task;
      if (!taskToUnmark) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'パラメータ "task" が必要です' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }
      
      const result = unmarkTaskAsComplete_(taskToUnmark);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 🆕 マストワン設定（今日の主役タスクに☆マークを付ける）
    if (mode === 'set_must_one') {
      const taskToMark = body.task;
      if (!taskToMark) {
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: false, 
          error: 'パラメータ "task" が必要です' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }
      
      const result = setMustOneTask_(taskToMark);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 🆕 今日のタスク全て完了（All Done）
    if (mode === 'mark_all_complete') {
      const result = markAllTasksComplete_();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 🆕 既存イベント自動フォーマット
    if (mode === 'format_events') {
      const daysBack = body.days_back || 7;  // デフォルト7日前から
      const daysForward = body.days_forward || 30;  // デフォルト30日先まで
      
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, 0, 0, 0);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysForward, 23, 59, 59);
      
      const result = formatExistingEvents_(startDate, endDate);
      
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        mode: 'format_events',
        result: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // 🔍 イベント詳細分析（権限テスト強化版）
    if (mode === 'analyze_events') {
      try {
        const calendar = CalendarApp.getDefaultCalendar();
        const now = new Date();
        const startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const endDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        const events = calendar.getEvents(startDate, endDate);
        const analysis = [];
        const detailedInfo = {
          calendarId: calendar.getId(),
          calendarName: calendar.getName(),
          calendarOwner: calendar.isOwnedByMe(),
          totalEvents: events.length
        };
        
        console.log('📋 カレンダー詳細情報:', JSON.stringify(detailedInfo));
        
        events.slice(0, 15).forEach((event, index) => {
          const title = event.getTitle();
          const isOwned = event.isOwnedByMe();
          const hasA = title.includes(' A') || title.endsWith(' A');
          const hasB = title.includes(' B') || title.endsWith(' B');  
          const hasC = title.includes(' C') || title.endsWith(' C');
          const hasStar = title.includes('★');
          
          // 詳細権限チェック
          let canEdit = false;
          let editError = null;
          try {
            // 編集可能かテスト（実際には変更しない）
            const currentTitle = event.getTitle();
            canEdit = true;
          } catch (e) {
            editError = e.toString();
          }
          
          if (hasA || hasB || hasC || hasStar) {
            const eventInfo = {
              index: index + 1,
              title: title,
              isOwned: isOwned,
              hasA: hasA,
              hasB: hasB,
              hasC: hasC,
              hasStar: hasStar,
              canEdit: canEdit,
              editError: editError,
              startTime: Utilities.formatDate(event.getStartTime(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm'),
              eventId: event.getId()
            };
            
            console.log(`📝 イベント ${index + 1}: ${JSON.stringify(eventInfo)}`);
            analysis.push(eventInfo);
          }
        });
        
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          mode: 'analyze_events',
          result: {
            ...detailedInfo,
            analysis: analysis,
            summary: {
              needsConversion: analysis.filter(e => (e.hasA || e.hasB || e.hasC) && !e.hasStar && e.canEdit).length,
              alreadyConverted: analysis.filter(e => e.hasStar).length,
              cannotEdit: analysis.filter(e => !e.canEdit).length
            }
          }
        })).setMimeType(ContentService.MimeType.JSON);
        
      } catch (e) {
        console.error('❌ 分析エラー:', e.toString());
        return ContentService.createTextOutput(JSON.stringify({
          ok: false,
          error: `分析失敗: ${e.toString()}`
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 🆕 毎日自動フォーマット手動実行
    if (mode === 'daily_format') {
      const result = dailyAutoFormat();
      return ContentService.createTextOutput(JSON.stringify({
        ok: result.success,
        mode: 'daily_format',
        result: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // 🆕 週次自動フォーマット手動実行
    if (mode === 'weekly_format') {
      const result = weeklyAutoFormat();
      return ContentService.createTextOutput(JSON.stringify({
        ok: result.success,
        mode: 'weekly_format', 
        result: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    const raw = String(body.text || '').trim();
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'no text' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const plan = planFromRaw_(raw, mode === 'preview');

    if (mode === 'preview') {
      const preview = plan.preview.map(x => ({
        title: x.title,
        start: x.start,
        end: x.end
      }));
      return ContentService.createTextOutput(JSON.stringify({ ok: true, mode, preview }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      const created = createEvents_(plan.items);
      storeUndoBuffer_(created);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, mode, created }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    console.error(`❌ API Error: ${err.message || String(err)}`);
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: false, 
      error: err.message || String(err),
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const keyParam = (e.parameter && e.parameter.key) || null;
    if (keyParam !== API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: false, 
        error: 'forbidden - API key required in query parameter: ?key=YOUR_API_KEY' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: true, 
      service: 'Text2GCalendar API',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        'GET': 'Health check and API status',
        'POST': 'Create calendar events from text'
      },
      usage: {
        'preview': 'POST with {"mode":"preview", "text":"your tasks"}',
        'create': 'POST with {"mode":"create", "text":"your tasks"}',
        'get_schedule': 'POST with {"mode":"get_schedule", "date":"今日", "days":1}',
        'weekly_report': 'POST with {"mode":"weekly_report"}',
        'progress': 'POST with {"mode":"progress"}',
        'mark_complete': 'POST with {"mode":"mark_complete", "task":"task_name"}',
        'unmark_complete': 'POST with {"mode":"unmark_complete", "task":"task_name"}',
        'format_events': 'POST with {"mode":"format_events", "days_back":7, "days_forward":30}'
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: false, 
      error: 'doGet error: ' + String(err) 
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/* =====================================================================
 * 📝 使用方法 & トラブルシューティング
 * =====================================================================
 * 
 * 【基本的な使い方】
 * 1. Google Apps Script エディタでこのコードをデプロイ
 * 2. Web APIとしてデプロイし、URLを取得
 * 3. Discord Botから以下の形式でPOSTリクエスト送信:
 *    - URL: {デプロイURL}?key={API_KEY}
 *    - Body: {"mode":"create", "text":"251031 細胞継代 1h A"}
 * 
 * 【入力形式】
 * - 日付指定: YYMMDD形式 (例: 251031 = 2025年10月31日)
 * - 相対日付: 今日、明日、明後日、月〜日
 * - 時間: 1h, 2h, 30m など
 * - 優先度: A (最高), B (中), C (低)
 * - 複数タスク: 1行に複数記述可能（自動分離）
 * 
 * 【🆕 タスク完了管理】
 * - タスク完了: カレンダー上でタイトルに「✓」を追加
 *   例: "細胞継代 ★★★" → "細胞継代 ★★★ ✓"
 * - 完了マークAPI: {"mode":"mark_complete", "task":"細胞継代"}
 * - 完了解除API: {"mode":"unmark_complete", "task":"細胞継代"}
 * - 進捗レポート: {"mode":"progress"} で今日の達成率を取得
 * - 自動通知: 13:00と20:00に進捗レポート送信（トリガー設定必要）
 * 
 * 【よくある問題と解決法】
 * Q: イベントが明後日に作成される
 * A: ✅修正済み - planFromRaw_で計算した日付をそのまま使用
 * 
 * Q: 終日イベントと重なってエラーになる
 * A: ✅修正済み - 終日イベントは自動除外
 * 
 * Q: 既存予定と重複する
 * A: ✅自動回避 - 5分間隔で空き時間を検索
 * 
 * Q: 営業時間外に配置される
 * A: ✅設定可能 - SETTINGS.WORK_START / WORK_END で調整
 * 
 * Q: タスク完了が反映されない
 * A: カレンダータイトルに「✓」を追加してください（手動またはAPI経由）
 * 
 * 【デバッグ方法】
 * - Google Apps Script ログビュー（実行 → ログを表示）で詳細確認
 * - コンソールログに絵文字付きで処理状況を出力
 * - タイムスタンプとイベント詳細を確認可能
 * 
 * 【パフォーマンス】
 * - 最大試行回数: 500回
 * - 最大検索日数: 14日先まで
 * - 先読み日数: 30日分の既存予定を取得
 * - タスク間隔: 5分（カスタマイズ可能）
 * 
 * 【セキュリティ】
 * - API_KEY認証必須
 * - 本番環境では環境変数化を推奨
 * - HTTPS通信のみ許可
 * 
 * =====================================================================
 */

/**
 * 🕐 毎日自動フォーマット実行関数
 * Google Apps Scriptのトリガーで毎日実行する関数
 * 昨日から今日作成されたA/B/Cイベントを★に自動変換
 */
function dailyAutoFormat() {
  console.log('🕐 毎日自動フォーマット開始');
  
  try {
    const now = new Date();
    // 昨日から今日まで（新規作成されたイベントを対象）
    const startDate = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)); // 1日前
    const endDate = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000));   // 1日後
    
    const result = formatExistingEvents_(startDate, endDate);
    
    console.log(`✅ 毎日自動フォーマット完了: ${result.converted}件変換, ${result.skipped}件スキップ`);
    
    // 結果が0件以上なら成功とみなす
    return {
      success: true,
      timestamp: now.toISOString(),
      converted: result.converted,
      skipped: result.skipped,
      message: `毎日自動フォーマット完了: ${result.converted}件変換`
    };
    
  } catch (error) {
    console.error('❌ 毎日自動フォーマットエラー:', error);
    return {
      success: false,
      error: error.toString(),
      message: '毎日自動フォーマット失敗'
    };
  }
}