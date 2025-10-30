/* Text2GCalendar (Calendar Add-on) — 既存予定回避機能追加版
 * 新機能：
 * - 既存のカレンダー予定を読み込み
 * - 予定が入っている時間を自動的に回避
 * - 空き時間に自動配置
 * - ★による優先度表記サポート
 * - A/B/C指定時に自動で★追加
 * - 週間レポート機能
 */

const SETTINGS = {
  TIMEZONE: 'Asia/Tokyo',
  WORK_START: '08:00',
  WORK_END:   '21:00',
  GAP_MIN: 5,
  LOOKAHEAD_DAYS: 30,
};
const PRIORITY_ORDER = { 'A': 1, 'B': 2, 'C': 3 };
const API_KEY = 'my_secure_api_key_2025_discord_bot';

// ===== 週間レポート機能 =====

function generateWeeklyReport_(startDate, endDate) {
  const tz = SETTINGS.TIMEZONE;
  const cal = CalendarApp.getDefaultCalendar();
  const events = cal.getEvents(startDate, endDate);
  
  const stats = {
    total: 0,
    byPriority: { A: 0, B: 0, C: 0, other: 0 },
    byDay: {},
    events: []
  };
  
  events.forEach(ev => {
    const title = ev.getTitle();
    const start = ev.getStartTime();
    const end = ev.getEndTime();
    const duration = (end - start) / (1000 * 60 * 60);
    
    let priority = 'other';
    if (title.includes('★★★')) priority = 'A';
    else if (title.includes('★★')) priority = 'B';
    else if (title.includes('★')) priority = 'C';
    
    stats.total += duration;
    stats.byPriority[priority] += duration;
    
    const dayKey = Utilities.formatDate(start, tz, 'yyyy-MM-dd');
    if (!stats.byDay[dayKey]) stats.byDay[dayKey] = 0;
    stats.byDay[dayKey] += duration;
    
    stats.events.push({
      title: title,
      start: Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm'),
      end: Utilities.formatDate(end, tz, 'HH:mm'),
      duration: duration.toFixed(1)
    });
  });
  
  return stats;
}

// ===== スケジュール取得機能 =====

function getScheduleForDate_(dateStr, daysCount) {
  const tz = SETTINGS.TIMEZONE;
  const now = new Date();
  
  let targetDate;
  if (dateStr === '今日' || dateStr === 'today') {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateStr === '明日' || dateStr === 'tomorrow') {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (dateStr === '明後日') {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [Y, M, D] = dateStr.split('-').map(Number);
    targetDate = new Date(Y, M - 1, D);
  } else if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const [M, D] = dateStr.split('/').map(Number);
    targetDate = new Date(now.getFullYear(), M - 1, D);
  } else {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  
  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + daysCount, 23, 59, 59);
  
  const cal = CalendarApp.getDefaultCalendar();
  const events = cal.getEvents(startDate, endDate);
  
  events.sort((a, b) => a.getStartTime() - b.getStartTime());
  
  const result = events.map(ev => {
    const start = ev.getStartTime();
    const end = ev.getEndTime();
    
    return {
      title: ev.getTitle(),
      start: Utilities.formatDate(start, tz, "yyyy-MM-dd'T'HH:mm:ss"),
      end: Utilities.formatDate(end, tz, "yyyy-MM-dd'T'HH:mm:ss"),
      startTime: Utilities.formatDate(start, tz, "HH:mm"),
      endTime: Utilities.formatDate(end, tz, "HH:mm")
    };
  });
  
  return result;
}

// ===== 既存予定取得機能 =====

function getExistingEvents_(startDate, endDate) {
  const cal = CalendarApp.getDefaultCalendar();
  const events = cal.getEvents(startDate, endDate);
  return events.map(ev => ({
    title: ev.getTitle(),
    start: ev.getStartTime(),
    end: ev.getEndTime()
  }));
}

// ===== 複数タスク分離機能 =====

function splitMultipleTasks_(line) {
  // 日付プレフィックス（例：251030）を抽出
  let datePrefix = '';
  const dateMatch = line.match(/^(\d{6})\s*/);
  if (dateMatch) {
    datePrefix = dateMatch[1] + ' ';
    line = line.substring(dateMatch[0].length);
  }
  
  // より厳密な時間+優先度パターンでタスクを分離
  // "タスク名 1h A タスク名2 1h A" のような形式を想定
  const taskPattern = /(.+?)\s+(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|時間|m|min|mins|minute|minutes|分)\s*([ABC]?)\s*/gi;
  let matches = [];
  let match;
  
  // すべてのタスクパターンを抽出
  while ((match = taskPattern.exec(line)) !== null) {
    const taskName = match[1].trim();
    const timeValue = match[2];
    const timeUnit = match[0].match(/(h|hr|hrs|hour|hours|時間|m|min|mins|minute|minutes|分)/i)[0];
    const priority = match[3] || 'C';
    
    // タスク名を整理（前のタスクの優先度文字を除去）
    const cleanTaskName = taskName.replace(/\s+[ABC]\s*$/, '').trim();
    
    matches.push({
      taskName: cleanTaskName,
      timeString: `${timeValue}${timeUnit}`,
      priority: priority,
      fullTask: `${cleanTaskName} ${timeValue}${timeUnit} ${priority}`.trim()
    });
  }
  
  if (matches.length === 0) {
    // パターンマッチしない場合は元の行をそのまま返す
    return [datePrefix + line];
  }
  
  // 各タスクを独立した行として返す
  return matches.map(match => datePrefix + match.fullTask);
}

// findTaskBoundary_ 関数は新しい分離ロジックで不要になったため削除

function isTimeSlotAvailable_(checkStart, checkEnd, existingEvents) {
  for (const ev of existingEvents) {
    const evStart = new Date(ev.start);
    const evEnd = new Date(ev.end);
    
    if ((checkStart >= evStart && checkStart < evEnd) ||
        (checkEnd > evStart && checkEnd <= evEnd) ||
        (checkStart <= evStart && checkEnd >= evEnd)) {
      return false;
    }
  }
  return true;
}

function findNextAvailableSlot_(cursor, dayEnd, minutes, tz, existingEvents, maxTries = 500, allowOverflow = true) {
  let cur = new Date(cursor);
  let tries = 0;
  let daysChecked = 0;
  const maxDays = 14; // 最大2週間先まで検索
  
  while (tries < maxTries && daysChecked < maxDays) {
    const end = new Date(cur.getTime() + minutes * 60000);
    
    // 営業時間を超える場合の処理
    if (end > dayEnd) {
      if (!allowOverflow) {
        // 日付固定の場合は営業時間外でも強制配置
        console.log(`営業時間外への強制配置: ${Utilities.formatDate(cur, tz, 'yyyy-MM-dd HH:mm')} - ${Utilities.formatDate(end, tz, 'HH:mm')}`);
        const newCursor = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
        return { start: cur, end, cursorDate: newCursor, dayEnd };
      }
      
      daysChecked++;
      if (daysChecked >= maxDays) {
        break; // 最大日数に達した場合はループを抜ける
      }
      
      const next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      const nextStart = dateAt_(next, SETTINGS.WORK_START, tz);
      const nextEnd = dateAt_(next, SETTINGS.WORK_END, tz);
      cur = nextStart;
      dayEnd = nextEnd;
      
      console.log(`翌日に移行: ${Utilities.formatDate(next, tz, 'yyyy-MM-dd')}`);
      tries++;
      continue;
    }
    
    // この時間帯が空いているかチェック
    if (isTimeSlotAvailable_(cur, end, existingEvents)) {
      const newCursor = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
      return { start: cur, end, cursorDate: newCursor, dayEnd };
    }
    
    // 空いていない場合、次の空き時間を探す
    let nextAvailableTime = null;
    const currentDay = cur.getDate();
    
    // 当日の既存予定で、現在時刻より後で最も早く終わる予定を探す
    for (const ev of existingEvents) {
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end);
      
      // 同じ日の予定のみ対象
      if (evStart.getDate() === currentDay && evStart.getMonth() === cur.getMonth() && evStart.getFullYear() === cur.getFullYear()) {
        if (evEnd > cur && (!nextAvailableTime || evEnd < nextAvailableTime)) {
          nextAvailableTime = new Date(evEnd.getTime() + SETTINGS.GAP_MIN * 60000);
        }
      }
    }
    
    if (nextAvailableTime && nextAvailableTime <= dayEnd) {
      // 次の空き時間に移動
      cur = nextAvailableTime;
    } else {
      // 次の空き時間がない場合、少しずつ進める
      cur = new Date(cur.getTime() + SETTINGS.GAP_MIN * 60000);
    }
    
    tries++;
  }
  
  // エラーメッセージを詳細化
  const errorMsg = `空き時間が見つかりません。試行回数: ${tries}/${maxTries}, 確認日数: ${daysChecked}/${maxDays}日, 所要時間: ${minutes}分`;
  console.log(errorMsg);
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
  
  console.log(`スケジュール開始時刻: ${Utilities.formatDate(cursorDate, tz, 'yyyy-MM-dd HH:mm')}`);
  console.log(`当日終了時刻: ${Utilities.formatDate(dayEnd, tz, 'yyyy-MM-dd HH:mm')}`);
  
  const lookAheadEnd = new Date(now);
  lookAheadEnd.setDate(lookAheadEnd.getDate() + SETTINGS.LOOKAHEAD_DAYS);
  const existingEvents = getExistingEvents_(now, lookAheadEnd);
  
  console.log(`既存予定: ${existingEvents.length}件取得 (${Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm')} から ${Utilities.formatDate(lookAheadEnd, tz, 'yyyy-MM-dd')} まで)`);

  // 行の分離を改善：改行 または 複数タスクを自動分離
  let lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  
  // 単一行に複数のタスクがある場合の分離処理
  let expandedLines = [];
  for (const line of lines) {
    const splitTasks = splitMultipleTasks_(line);
    console.log(`元の行: "${line}" → 分離後: [${splitTasks.map(t => `"${t}"`).join(', ')}]`);
    expandedLines = expandedLines.concat(splitTasks);
  }
  
  let parsedTasks = [];
  let idx = 0;

  for (const line0 of expandedLines) {
    idx++;
    if (/^~~.*~~$/.test(line0)) continue;

    const parsed = parseLine_(line0, now);
    if (!parsed || !parsed.minutes) continue;

    // 長時間タスク（4時間以上）の場合は警告
    if (parsed.minutes > 240) {
      console.log(`警告: 長時間タスク "${parsed.title}" (${parsed.minutes}分) - 複数日に分割を推奨`);
    }

    console.log(`パースされたタスク: "${parsed.title}" - 日付: ${parsed.dayAnchor ? Utilities.formatDate(parsed.dayAnchor, tz, 'yyyy-MM-dd') : 'なし'} - 優先度: ${parsed.priority}`);
    
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
    console.log(`\n=== ${dateKey} のタスク処理開始 ===`);
    const dateTasks = tasksByDate[dateKey];
    const firstTask = dateTasks[0];
    
    // この日の開始時刻を設定（現在時刻も考慮）
    let dayStartCursor = dateAt_(firstTask.dayAnchor, SETTINGS.WORK_START, tz);
    let dayEndTime = dateAt_(firstTask.dayAnchor, SETTINGS.WORK_END, tz);
    
    // 現在時刻がその日の場合、現在時刻を考慮
    const now = new Date();
    if (isSameDate_(now, firstTask.dayAnchor, tz) && now > dayStartCursor) {
      dayStartCursor = now;
      console.log(`当日のため現在時刻から開始: ${Utilities.formatDate(dayStartCursor, tz, 'yyyy-MM-dd HH:mm')}`);
    }
    
    for (const p of dateTasks) {
      let start, end;
      
      try {
        // 日付指定タスクは指定日に固定（allowOverflow = false）
        const result = findNextAvailableSlot_(dayStartCursor, dayEndTime, p.minutes, tz, existingEvents, 500, false);
        start = result.start;
        end = result.end;
        dayStartCursor = result.cursorDate; // この日の次のタスク用にカーソル更新
        
        console.log(`${dateKey} タスク配置: "${p.title}" → ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')} - ${Utilities.formatDate(end, tz, 'HH:mm')}`);
      } catch (error) {
        console.log(`タスク "${p.title}" のスケジュール失敗: ${error.message}`);
        // 指定日の範囲内で強制配置
        start = new Date(dayStartCursor);
        end = new Date(start.getTime() + p.minutes * 60000);
        dayStartCursor = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
        
        console.log(`${dateKey} 強制配置: "${p.title}" → ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')} - ${Utilities.formatDate(end, tz, 'HH:mm')}`);
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
  for (const p of noDateTasks) {
    let start, end;
    
    if (p.fixedStart) {
      start = p.fixedStart;
      end = new Date(start.getTime() + p.minutes * 60000);
      
      if (!isTimeSlotAvailable_(start, end, existingEvents)) {
        console.log(`警告: "${p.title}" は既存予定と重複しています（${start} - ${end}）`);
      }
      
      cursorDate = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
      dayEnd = dateAt_(cursorDate, SETTINGS.WORK_END, tz);
    } else {
      if (p.dayAnchor) {
        // 指定された日の開始時刻に強制設定（既存のcursorDateより前でも）
        const targetDayStart = dateAt_(p.dayAnchor, SETTINGS.WORK_START, tz);
        const targetDayEnd = dateAt_(p.dayAnchor, SETTINGS.WORK_END, tz);
        
        // 日付が指定されている場合は、その日の開始時刻にリセット
        cursorDate = targetDayStart;
        dayEnd = targetDayEnd;
        
        console.log(`日付指定タスク "${p.title}": ${Utilities.formatDate(p.dayAnchor, tz, 'yyyy-MM-dd')} の ${SETTINGS.WORK_START} から配置開始`);
      }
      
      try {
        const result = findNextAvailableSlot_(cursorDate, dayEnd, p.minutes, tz, existingEvents);
        start = result.start;
        end = result.end;
        cursorDate = result.cursorDate;
        dayEnd = result.dayEnd;
        
        console.log(`タスク配置: "${p.title}" → ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')} - ${Utilities.formatDate(end, tz, 'HH:mm')}`);
      } catch (error) {
        console.log(`タスク "${p.title}" (${p.minutes}分) のスケジュール失敗: ${error.message}`);
        // エラーの場合は強制的に時間を割り当て（既存予定と重複してもOK）
        start = new Date(cursorDate);
        end = new Date(start.getTime() + p.minutes * 60000);
        cursorDate = new Date(end.getTime() + SETTINGS.GAP_MIN * 60000);
        
        console.log(`強制配置: ${Utilities.formatDate(start, tz, 'yyyy-MM-dd HH:mm')} - ${Utilities.formatDate(end, tz, 'HH:mm')}`);
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
    
    // プレビュー用のタイトルも★付きにする
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

  return { items, preview };
}

// ===== Parsing =====

function parseLine_(line, now) {
  const tz = SETTINGS.TIMEZONE;

  const hr = line.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|時間)\b/i);
  const mn = line.match(/(\d+)\s*(?:m|min|mins|minute|minutes|分)\b/i);
  let minutes = null;
  if (hr) minutes = Math.round(parseFloat(hr[1]) * 60);
  else if (mn) minutes = parseInt(mn[1], 10);
  if (!minutes || minutes <= 0) return null;

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

  // 時刻
  let fixedStart = null;
  const mTime = line.match(/@(午前|午後)?\s?(\d{1,2})(?:[:：](\d{2}))?時?|@(\d{1,2}):(\d{2})/);
  if (mTime) {
    if (mTime[4]) {
      const H = parseInt(mTime[4], 10);
      const M = parseInt(mTime[5], 10);
      const base = dayAnchor || now;
      fixedStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), H, M, 0, 0);
    } else {
      let H = parseInt(mTime[2], 10);
      const ampm = mTime[1];
      if (ampm === '午後' && H < 12) H += 12;
      if (ampm === '午前' && H === 12) H = 0;
      const base = dayAnchor || now;
      fixedStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), H, 0, 0, 0);
    }
    line = line.replace(/@(午前|午後)?\s?\d{1,2}(?::\d{2})?時?/, '').replace(/@\d{1,2}:\d{2}/, '').trim();
  }

  // 優先度の抽出（★または A/B/C）
  let priority = 'C';
  
  // ★の数を数える（★★★ = A, ★★ = B, ★ = C）
  const starMatch = line.match(/★{1,3}\s*$/);
  if (starMatch) {
    const starCount = starMatch[0].replace(/\s/g, '').length;
    if (starCount === 3) priority = 'A';
    else if (starCount === 2) priority = 'B';
    else priority = 'C';
    line = line.replace(/★{1,3}\s*$/, '').trim();
  } else {
    // 従来のA/B/C表記もサポート
    const tagM = line.match(/\s([ABC])\s*$/i);
    if (tagM) {
      priority = tagM[1].toUpperCase();
      line = line.replace(/\s[ABC]\s*$/i, '').trim();
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
    // 251030形式 (YYMMDD)
    const Y = parseInt('20' + token.substring(0, 2), 10); // 25 -> 2025
    const M = parseInt(token.substring(2, 4), 10);        // 10
    const D = parseInt(token.substring(4, 6), 10);        // 30
    result = new Date(Y, M-1, D);
    console.log(`日付パース: ${token} → ${Y}年${M}月${D}日 → ${Utilities.formatDate(result, tz, 'yyyy-MM-dd (EEE)')}`);
  } else {
    result = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  
  console.log(`parseDateToken_: "${token}" → ${Utilities.formatDate(result, tz, 'yyyy-MM-dd (EEE)')}`);
  return result;
}

// ===== Create / Undo =====

function createEvents_(items) {
  const out = [];
  const cal = CalendarApp.getDefaultCalendar();
  
  for (const it of items) {
    let title = it.title;
    
    // タイトルに★がない場合、優先度に応じて自動追加
    if (!title.includes('★')) {
      const priorityLabel = it.priorityLabel || 'C';
      if (priorityLabel === 'A') {
        title = title + ' ★★★';
      } else if (priorityLabel === 'B') {
        title = title + ' ★★';
      } else if (priorityLabel === 'C') {
        title = title + ' ★';
      }
    }
    
    const ev = cal.createEvent(title, it.start, it.end, { 
      description: 'Text2GCalendar (自動★追加)' 
    });
    
    out.push({ 
      eventId: ev.getId(), 
      title: title,
      start: it.start, 
      end: it.end 
    });
  }
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

function dateAt_(baseDate, hhmm, tz) {
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const [H,M] = hhmm.split(':').map(Number);
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), H, M, 0, 0);
  const iso = Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm:ss");
  return new Date(iso);
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
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'empty body' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const body = JSON.parse(e.postData.contents);
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
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
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
        'weekly_report': 'POST with {"mode":"weekly_report"}'
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
