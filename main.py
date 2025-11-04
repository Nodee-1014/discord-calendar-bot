# main.py
# Discord Calendar Bot v2.3
# 1行のテキストでGoogleカレンダーにタスクを追加、進捗管理も自動化
# https://github.com/Nodee-1014/discord-calendar-bot

import os
import requests
import discord
from discord import app_commands
from discord.ext import commands, tasks
from dotenv import load_dotenv  # 追加
from urllib.parse import quote_plus
from datetime import datetime, time
import asyncio

__version__ = "2.3.0"

# ---------- 設定（環境変数から読む） ----------
load_dotenv()  # 追加：.env を読み込む
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
GAS_ENDPOINT  = os.getenv("GAS_ENDPOINT")
API_KEY       = os.getenv("API_KEY")
GUILD_ID      = os.getenv("GUILD_ID")
CHANNEL_ID    = os.getenv("CHANNEL_ID")  # 🆕 進捗レポート送信チャンネル
# ----------------------------------------------

# ---------- ヘルパー関数 ----------
def generate_calendar_link(event_title, start_datetime, end_datetime):
    """GoogleカレンダーのイベントリンクURLを生成"""
    try:
        # 日時をGoogleカレンダー形式に変換 (YYYYMMDDTHHMMSSZ)
        if isinstance(start_datetime, str):
            # ISO形式の文字列をdatetimeに変換
            start_dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
        else:
            start_dt = start_datetime
            
        if isinstance(end_datetime, str):
            end_dt = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
        else:
            end_dt = end_datetime
        
        # UTC時刻として扱うため、日本時間から9時間引く
        from datetime import timedelta
        start_utc = start_dt.replace(tzinfo=None) - timedelta(hours=9)
        end_utc = end_dt.replace(tzinfo=None) - timedelta(hours=9)
        
        start_str = start_utc.strftime('%Y%m%dT%H%M%SZ')
        end_str = end_utc.strftime('%Y%m%dT%H%M%SZ')
        
        # Googleカレンダーのイベント作成URL
        base_url = "https://calendar.google.com/calendar/render"
        params = {
            'action': 'TEMPLATE',
            'text': event_title,
            'dates': f"{start_str}/{end_str}",
            'ctz': 'Asia/Tokyo'
        }
        
        # URLエンコード
        query_string = "&".join([f"{key}={quote_plus(str(value))}" for key, value in params.items()])
        return f"{base_url}?{query_string}"
        
    except Exception as e:
        print(f"カレンダーリンク生成エラー: {e}")
        return "https://calendar.google.com/"

if not DISCORD_TOKEN or not GAS_ENDPOINT or not API_KEY:
    raise RuntimeError("環境変数 DISCORD_TOKEN/GAS_ENDPOINT/API_KEY を設定してください。")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f'🤖 Discord Calendar Bot v{__version__}')
    print(f'{bot.user} がログインしました')
    
    # スラッシュコマンドの同期
    try:
        if GUILD_ID:
            guild = discord.Object(id=int(GUILD_ID))
            synced = await bot.tree.sync(guild=guild)
            print(f'ギルド {GUILD_ID} に {len(synced)} 個のコマンドを同期しました')
        else:
            synced = await bot.tree.sync()
            print(f'グローバルに {len(synced)} 個のコマンドを同期しました')
        print(f"Bot is ready! Invite URL: https://discord.com/api/oauth2/authorize?client_id={bot.user.id}&permissions=2048&scope=bot%20applications.commands")
    except Exception as e:
        print(f'コマンド同期エラー: {e}')
    
    # 定期タスク開始
    if not daily_progress_report.is_running():
        daily_progress_report.start()
        print("🕐 定期進捗レポート機能を開始しました (13:00, 20:00)")

def call_gas(mode: str, text: str):
    url = f"{GAS_ENDPOINT}?key={API_KEY}"
    try:
        print(f"GAS API呼び出し: mode={mode}, URL={url}")
        r = requests.post(url, json={"mode": mode, "text": text}, timeout=30)
        print(f"GAS APIレスポンス: status={r.status_code}")
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response content: {r.text if 'r' in locals() else 'No response'}")
        raise
    except Exception as e:
        print(f"GAS API Error: {e}")
        raise

def render_preview(preview_items):
    lines = []
    for it in preview_items:
        s = str(it['start']).replace('T',' ').split('.')[0]
        e = str(it['end']).replace('T',' ').split('.')[0]
        lines.append(f"- {it['title']}: {s} → {e}")
    return "\n".join(lines) if lines else "(なし)"

@bot.tree.command(name="t2g", description="Text→Google Calendar")
@app_commands.describe(text="改行でタスク（例: '251030 タスクA 1h A\\nタスクB 30min B'）")
async def t2g(interaction: discord.Interaction, text: str):
    mode = "create"  # プレビューモードを削除、常に作成モードに

    await interaction.response.defer(thinking=True, ephemeral=True)
    try:
        print(f"コマンド実行: mode={mode}, text={text[:50]}...")
        resp = call_gas(mode, text)
        print(f"GAS APIレスポンス内容: {resp}")
        if not resp.get("ok"):
            error_msg = resp.get('error', 'Unknown error')
            print(f"GAS API エラーレスポンス: {error_msg}")
            await interaction.followup.send(f"エラー: {error_msg}", ephemeral=True)
            return

        created = resp.get("created", [])
        if not created:
            await interaction.followup.send("作成対象がありません。", ephemeral=True)
            return
        
        # イベント情報とカレンダーリンクを生成
        lines = []
        calendar_links = []
        
        for it in created:
            s = str(it['start']).replace('T',' ').split('.')[0]
            e = str(it['end']).replace('T',' ').split('.')[0]
            lines.append(f"- {it['title']}: {s} → {e}")
            
            # Googleカレンダーリンクを生成
            calendar_url = generate_calendar_link(it['title'], it['start'], it['end'])
            calendar_links.append(f"📅 [{it['title']}](<{calendar_url}>)")
        
        # 結果メッセージを作成
        result_msg = "**✅ 作成しました**\n```\n" + "\n".join(lines) + "\n```"
        
        # カレンダーリンクを追加
        if calendar_links:
            result_msg += "\n\n**🔗 Googleカレンダーで開く:**\n" + "\n".join(calendar_links)
        
        await interaction.followup.send(result_msg, ephemeral=True)
    except requests.exceptions.HTTPError as e:
        status_code = getattr(e.response, 'status_code', 'Unknown')
        error_msg = f"HTTP Error {status_code}"
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            # レスポンステキストを短く制限
            response_text = e.response.text[:200] + "..." if len(e.response.text) > 200 else e.response.text
            error_msg += f": {response_text}"
        print(f"HTTP エラー詳細: {error_msg}")
        await interaction.followup.send(f"通信エラー: {error_msg}", ephemeral=True)
    except Exception as e:
        print(f"予期しないエラー: {type(e).__name__}: {e}")
        await interaction.followup.send(f"通信エラー: {e}", ephemeral=True)

@bot.tree.command(name="schedule", description="カレンダーの予定を取得")
@app_commands.describe(
    date="日付（今日/明日/2025-10-30など）",
    days="何日分取得するか（デフォルト: 1）"
)
async def schedule(interaction: discord.Interaction, date: str = "今日", days: int = 1):
    await interaction.response.defer(thinking=True, ephemeral=True)
    try:
        print(f"スケジュール取得: date={date}, days={days}")
        url = f"{GAS_ENDPOINT}?key={API_KEY}"
        resp = requests.post(url, json={"mode": "get_schedule", "date": date, "days": days}, timeout=30)
        print(f"GAS APIレスポンス: status={resp.status_code}")
        resp.raise_for_status()
        data = resp.json()
        print(f"GAS APIレスポンス内容: {data}")
        
        if not data.get("ok"):
            error_msg = data.get('error', 'Unknown error')
            await interaction.followup.send(f"エラー: {error_msg}", ephemeral=True)
            return
        
        events = data.get("events", [])
        if not events:
            await interaction.followup.send(f"**{date}の予定**\n予定はありません。", ephemeral=True)
            return
        
        # イベントをフォーマット
        lines = [f"**📅 {date}の予定**\n"]
        calendar_links = []
        
        for ev in events:
            title = ev.get('title', 'タイトルなし')
            start = ev.get('start', '')
            end = ev.get('end', '')
            
            # 時刻を抽出（HH:MM形式）
            if 'T' in start:
                start_time = start.split('T')[1][:5]
            else:
                start_time = start
            if 'T' in end:
                end_time = end.split('T')[1][:5]
            else:
                end_time = end
            
            lines.append(f"• {title} `{start_time}-{end_time}`")
            
            # Googleカレンダーリンクを生成
            calendar_url = generate_calendar_link(title, start, end)
            calendar_links.append(f"📅 [{title}](<{calendar_url}>)")
        
        result = "\n".join(lines)
        
        # カレンダーリンクを追加
        if calendar_links:
            result += "\n\n**🔗 Googleカレンダーで開く:**\n" + "\n".join(calendar_links)
        
        await interaction.followup.send(result, ephemeral=True)
        
    except requests.exceptions.HTTPError as e:
        status_code = getattr(e.response, 'status_code', 'Unknown')
        error_msg = f"HTTP Error {status_code}"
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            response_text = e.response.text[:200] + "..." if len(e.response.text) > 200 else e.response.text
            error_msg += f": {response_text}"
        print(f"HTTP エラー詳細: {error_msg}")
        await interaction.followup.send(f"通信エラー: {error_msg}", ephemeral=True)
    except Exception as e:
        print(f"予期しないエラー: {type(e).__name__}: {e}")
        await interaction.followup.send(f"通信エラー: {e}", ephemeral=True)

@bot.tree.command(name="report", description="週間レポートを取得")
@app_commands.describe(period="期間（week/month）")
async def report(interaction: discord.Interaction, period: str = "week"):
    await interaction.response.defer(thinking=True, ephemeral=True)
    try:
        print(f"レポート取得: period={period}")
        url = f"{GAS_ENDPOINT}?key={API_KEY}"
        resp = requests.post(url, json={"mode": "weekly_report", "period": period}, timeout=30)
        print(f"GAS APIレスポンス: status={resp.status_code}")
        resp.raise_for_status()
        data = resp.json()
        print(f"GAS APIレスポンス内容: {data}")
        
        if not data.get("ok"):
            error_msg = data.get('error', 'Unknown error')
            await interaction.followup.send(f"エラー: {error_msg}", ephemeral=True)
            return
        
        report_data = data.get("report", {})
        total = report_data.get("total", 0)
        byPriority = report_data.get("byPriority", {})
        byDay = report_data.get("byDay", {})
        
        # レポート整形
        lines = ["**📊 週間レポート**\n"]
        lines.append(f"**総作業時間:** {total:.1f}時間\n")
        lines.append("**優先度別:**")
        lines.append(f"★★★ (A): {byPriority.get('A', 0):.1f}時間")
        lines.append(f"★★ (B): {byPriority.get('B', 0):.1f}時間")
        lines.append(f"★ (C): {byPriority.get('C', 0):.1f}時間")
        lines.append(f"その他: {byPriority.get('other', 0):.1f}時間")
        
        # 日別サマリー
        if byDay:
            lines.append("\n**日別作業時間:**")
            for day in sorted(byDay.keys()):
                lines.append(f"{day}: {byDay[day]:.1f}時間")
        
        result = "\n".join(lines)
        await interaction.followup.send(result, ephemeral=True)
        
    except requests.exceptions.HTTPError as e:
        status_code = getattr(e.response, 'status_code', 'Unknown')
        error_msg = f"HTTP Error {status_code}"
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            response_text = e.response.text[:200] + "..." if len(e.response.text) > 200 else e.response.text
            error_msg += f": {response_text}"
        print(f"HTTP エラー詳細: {error_msg}")
        await interaction.followup.send(f"通信エラー: {error_msg}", ephemeral=True)
    except Exception as e:
        print(f"予期しないエラー: {type(e).__name__}: {e}")
        await interaction.followup.send(f"エラー: {e}", ephemeral=True)

# =====================================================================
# 🆕 タスク完了管理コマンド
# =====================================================================

@bot.tree.command(name="done", description="タスクを完了にマーク（✓を追加）")
@app_commands.describe(task="完了したタスク名（部分一致）")
async def done(interaction: discord.Interaction, task: str):
    await interaction.response.defer(thinking=True, ephemeral=True)
    try:
        print(f"タスク完了マーク: task={task}")
        url = f"{GAS_ENDPOINT}?key={API_KEY}"
        resp = requests.post(url, json={"mode": "mark_complete", "task": task}, timeout=30)
        print(f"GAS APIレスポンス: status={resp.status_code}")
        resp.raise_for_status()
        data = resp.json()
        print(f"GAS APIレスポンス内容: {data}")
        
        if data.get("ok"):
            await interaction.followup.send(f"✅ {data.get('message', 'タスクを完了にマークしました')}", ephemeral=True)
        else:
            await interaction.followup.send(f"⚠️ {data.get('message', 'タスクが見つかりませんでした')}", ephemeral=True)
            
    except requests.exceptions.HTTPError as e:
        status_code = getattr(e.response, 'status_code', 'Unknown')
        error_msg = f"HTTP Error {status_code}"
        print(f"HTTP エラー詳細: {error_msg}")
        await interaction.followup.send(f"通信エラー: {error_msg}", ephemeral=True)
    except Exception as e:
        print(f"予期しないエラー: {type(e).__name__}: {e}")
        await interaction.followup.send(f"エラー: {e}", ephemeral=True)

@bot.tree.command(name="undone", description="タスクの完了マークを解除（✓を削除）")
@app_commands.describe(task="完了を取り消すタスク名（部分一致）")
async def undone(interaction: discord.Interaction, task: str):
    await interaction.response.defer(thinking=True, ephemeral=True)
    try:
        print(f"タスク完了解除: task={task}")
        url = f"{GAS_ENDPOINT}?key={API_KEY}"
        resp = requests.post(url, json={"mode": "unmark_complete", "task": task}, timeout=30)
        print(f"GAS APIレスポンス: status={resp.status_code}")
        resp.raise_for_status()
        data = resp.json()
        print(f"GAS APIレスポンス内容: {data}")
        
        if data.get("ok"):
            await interaction.followup.send(f"↩️ {data.get('message', 'タスクの完了を取り消しました')}", ephemeral=True)
        else:
            await interaction.followup.send(f"⚠️ {data.get('message', '完了タスクが見つかりませんでした')}", ephemeral=True)
            
    except requests.exceptions.HTTPError as e:
        status_code = getattr(e.response, 'status_code', 'Unknown')
        error_msg = f"HTTP Error {status_code}"
        print(f"HTTP エラー詳細: {error_msg}")
        await interaction.followup.send(f"通信エラー: {error_msg}", ephemeral=True)
    except Exception as e:
        print(f"予期しないエラー: {type(e).__name__}: {e}")
        await interaction.followup.send(f"エラー: {e}", ephemeral=True)

@bot.tree.command(name="progress", description="今日のタスク進捗を表示")
async def progress(interaction: discord.Interaction):
    # 即座に応答（3秒タイムアウト回避）
    await interaction.response.send_message("📊 進捗レポートを取得中...", ephemeral=True)
    
    try:
        print("📊 進捗レポート取得開始")
        url = f"{GAS_ENDPOINT}?key={API_KEY}"
        
        # タイムアウトを短縮してレスポンス改善
        resp = requests.post(url, json={"mode": "progress"}, timeout=15)
        print(f"📡 GAS APIレスポンス: status={resp.status_code}, time={resp.elapsed.total_seconds():.2f}s")
        resp.raise_for_status()
        data = resp.json()
        print(f"📋 取得成功: {data.get('ok', False)}")
        
        if not data.get("ok"):
            error_msg = data.get('error', 'Unknown error')
            await interaction.edit_original_response(content=f"❌ エラー: {error_msg}")
            return
        
        progress_data = data.get("progress", {})
        date = progress_data.get("date", "")
        total = progress_data.get("totalTasks", 0)
        completed_count = progress_data.get("completedCount", 0)
        pending_count = progress_data.get("pendingCount", 0)
        completion_rate = progress_data.get("completionRate", 0)
        completed_tasks = progress_data.get("completed", [])
        pending_tasks = progress_data.get("pending", [])
        
        # 進捗レポートを整形
        lines = [f"📊 **今日の進捗レポート ({date})**\n"]
        
        # 達成率表示
        progress_bar = "█" * (completion_rate // 10) + "░" * (10 - completion_rate // 10)
        lines.append(f"**達成率:** {completion_rate}% `{progress_bar}`")
        lines.append(f"**完了:** {completed_count}/{total} タスク")
        
        if total == 0:
            lines.append("\n今日予定されているタスクはありません。")
        else:
            # 完了タスク
            if completed_tasks:
                lines.append(f"\n**✅ 完了タスク ({len(completed_tasks)}個):**")
                for task in completed_tasks[:5]:  # 最大5個表示
                    lines.append(f"• {task['title']} `{task['start']}-{task['end']}`")
                if len(completed_tasks) > 5:
                    lines.append(f"... 他{len(completed_tasks) - 5}個")
            
            # 未完了タスク
            if pending_tasks:
                lines.append(f"\n**⏳ 未完了タスク ({len(pending_tasks)}個):**")
                for task in pending_tasks[:5]:  # 最大5個表示
                    lines.append(f"• {task['title']} `{task['start']}-{task['end']}`")
                if len(pending_tasks) > 5:
                    lines.append(f"... 他{len(pending_tasks) - 5}個")
        
        result = "\n".join(lines)
        
        # 結果を元のメッセージに更新（followupの代わり）
        await interaction.edit_original_response(content=result)
        
    except requests.exceptions.Timeout:
        print("⏱️ タイムアウトエラー: GAS APIが15秒以内に応答しませんでした")
        await interaction.edit_original_response(content="⏱️ **タイムアウト**\nサーバーの応答が遅れています。\nしばらく待ってから再度お試しください。")
    except requests.exceptions.HTTPError as e:
        status_code = getattr(e.response, 'status_code', 'Unknown')
        error_msg = f"HTTP Error {status_code}"
        print(f"🌐 HTTP エラー詳細: {error_msg}")
        await interaction.edit_original_response(content=f"🌐 **通信エラー:** {error_msg}")
    except Exception as e:
        print(f"💥 予期しないエラー: {type(e).__name__}: {e}")
        await interaction.edit_original_response(content=f"💥 **エラー:** {e}")

@bot.tree.command(name="format", description="既存カレンダーイベントを自動フォーマット（A/B/C → ★）")
async def format_events(interaction: discord.Interaction):
    # 即座に応答（3秒タイムアウト回避）
    await interaction.response.send_message("🔄 カレンダーイベントをフォーマット中...", ephemeral=True)
    
    try:
        print("🔧 手動フォーマットコマンド実行")
        url = f"{GAS_ENDPOINT}?key={API_KEY}"
        
        # 過去1ヶ月から未来1ヶ月の範囲で処理（既存イベント含む）
        resp = requests.post(url, json={
            "mode": "format_events",
            "days_back": 30,   # 過去1ヶ月から
            "days_forward": 30  # 未来1ヶ月まで
        }, timeout=20)
        
        print(f"📡 GAS APIレスポンス: status={resp.status_code}, time={resp.elapsed.total_seconds():.2f}s")
        resp.raise_for_status()
        data = resp.json()
        print(f"📋 取得成功: {data.get('ok', False)}")
        
        if not data.get("ok"):
            error_msg = data.get('error', 'Unknown error')
            await interaction.edit_original_response(content=f"❌ **エラーが発生しました**\n詳細: {error_msg}")
            return
        
        result = data.get("result", {})
        converted = result.get("converted", 0)
        skipped = result.get("skipped", 0)
        changes = result.get("results", [])
        
        # 結果を整形
        if converted > 0:
            lines = [f"🌟 **{converted}件のイベントを自動フォーマットしました！**\n"]
            
            for i, change in enumerate(changes[:5]):  # 最大5件表示
                original = change.get('original', '')
                converted_title = change.get('converted', '')
                date = change.get('date', '')
                lines.append(f"`{i+1}.` **{date}**")
                lines.append(f"   `{original}` → `{converted_title}`")
            
            if len(changes) > 5:
                lines.append(f"\n... 他 **{len(changes) - 5}件** も変換されました")
                
            lines.append(f"\n📋 **スキップ:** {skipped}件（既にフォーマット済み）")
            
        elif skipped > 0:
            lines = [
                f"✅ **すべてのイベントは既にフォーマット済みです**",
                f"📋 **確認済み:** {skipped}件のイベント",
                "",
                f"💡 **新しいイベントには自動的に★が付与されます**"
            ]
        else:
            lines = [
                f"📅 **対象となるイベントが見つかりませんでした**",
                "",
                f"🔍 **確認範囲:** 今日から1週間",
                f"💡 **新しくタスクを作成すると自動で★が付きます**"
            ]
        
        lines.append(f"\n📝 **フォーマットルール:**")
        lines.append(f"• **A** → ★★★ (最高優先度)")
        lines.append(f"• **B** → ★★ (中優先度)")
        lines.append(f"• **C** → ★ (低優先度)")
        lines.append(f"• **自動判定** 緊急・会議 → ★★★")
        
        result_text = "\n".join(lines)
        
        # 結果を元のメッセージに更新
        try:
            await interaction.edit_original_response(content=result_text)
        except (RuntimeError, Exception) as edit_error:
            # Discord接続エラーの場合は再試行
            print(f"⚠️ 編集エラー（再試行）: {edit_error}")
            try:
                await interaction.followup.send(result_text, ephemeral=True)
            except:
                print("❌ followupも失敗")
        
    except requests.exceptions.Timeout:
        print("⏱️ タイムアウトエラー: format_events API")
        await interaction.edit_original_response(
            content=f"⏰ **タイムアウトが発生しました**\n"
            f"大量のイベントがある場合、処理に時間がかかることがあります。\n"
            f"しばらく待ってから再度お試しください。"
        )
    except requests.exceptions.HTTPError as e:
        status_code = getattr(e.response, 'status_code', 'Unknown')
        print(f"🌐 HTTPエラー: {status_code}")
        await interaction.edit_original_response(
            content=f"❌ **通信エラー (HTTP {status_code})**\n"
            f"Google Apps Scriptとの通信に失敗しました。\n"
            f"しばらく待ってから再試行してください。"
        )
    except Exception as e:
        print(f"💥 Format command error: {type(e).__name__}: {e}")
        await interaction.edit_original_response(
            content=f"❌ **予期しないエラーが発生しました**\n"
            f"管理者に報告してください。\n"
            f"エラー: {str(e)[:100]}"
        )

# =====================================================================
# 🆕 自動進捗レポート機能
# =====================================================================

async def send_progress_report():
    """進捗レポートをチャンネルに送信"""
    try:
        if not CHANNEL_ID:
            print("⚠️ CHANNEL_IDが設定されていません")
            return
            
        channel = bot.get_channel(int(CHANNEL_ID))
        if not channel:
            print(f"⚠️ チャンネルが見つかりません: {CHANNEL_ID}")
            return
        
        print("🤖 自動進捗レポート送信開始")
        url = f"{GAS_ENDPOINT}?key={API_KEY}"
        resp = requests.post(url, json={"mode": "progress"}, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        if not data.get("ok"):
            await channel.send(f"⚠️ 進捗レポート取得エラー: {data.get('error', 'Unknown error')}")
            return
        
        progress_data = data.get("progress", {})
        date = progress_data.get("date", "")
        total = progress_data.get("totalTasks", 0)
        completed_count = progress_data.get("completedCount", 0)
        completion_rate = progress_data.get("completionRate", 0)
        
        # 簡潔な進捗レポート
        now = datetime.now()
        time_str = now.strftime("%H:%M")
        
        if total == 0:
            message = f"🕐 **{time_str} 進捗レポート**\n今日予定されているタスクはありません。"
        else:
            progress_bar = "█" * (completion_rate // 10) + "░" * (10 - completion_rate // 10)
            message = f"🕐 **{time_str} 進捗レポート ({date})**\n"
            message += f"達成率: {completion_rate}% `{progress_bar}`\n"
            message += f"完了: {completed_count}/{total} タスク"
            
            # 励ましメッセージ
            if completion_rate >= 80:
                message += " 🎉 素晴らしい進捗です！"
            elif completion_rate >= 50:
                message += " 👍 順調ですね！"
            elif completion_rate >= 20:
                message += " 💪 頑張りましょう！"
            else:
                message += " ⏰ まだ時間はあります！"
        
        await channel.send(message)
        print(f"✅ 進捗レポート送信完了: {completion_rate}%")
        
    except Exception as e:
        print(f"❌ 自動進捗レポート送信エラー: {type(e).__name__}: {e}")
        if CHANNEL_ID:
            try:
                channel = bot.get_channel(int(CHANNEL_ID))
                if channel:
                    await channel.send(f"⚠️ 自動進捗レポート送信エラー: {e}")
            except:
                pass

@bot.tree.command(name="check", description="A/B/C付きイベントを確認（手動変更の参考用）")
async def check_events(interaction: discord.Interaction):
    # 即座に応答
    await interaction.response.send_message("🔍 イベントを分析中...", ephemeral=True)
    
    try:
        print("🔍 Check events command called")
        url = f"{GAS_ENDPOINT}?key={API_KEY}"
        
        # analyze_events APIを使用して詳細確認
        resp = requests.post(url, json={"mode": "analyze_events"}, timeout=15)
        
        print(f"Check APIレスポンス: status={resp.status_code}")
        
        if resp.status_code == 200:
            try:
                data = resp.json()
                if data.get('ok'):
                    result = data.get('result', {})
                    summary = result.get('summary', {})
                    analysis = result.get('analysis', [])
                    
                    needs_conversion = summary.get('needsConversion', 0)
                    already_converted = summary.get('alreadyConverted', 0)
                    cannot_edit = summary.get('cannotEdit', 0)
                    
                    lines = [
                        f"🔍 **A/B/C付きイベント確認結果**",
                        f"",
                        f"� **概要:**",
                        f"• 変換が必要: **{needs_conversion}件**",
                        f"• 既に変換済み: **{already_converted}件**",
                        f"• 編集不可: **{cannot_edit}件**"
                    ]
                    
                    if needs_conversion > 0:
                        lines.extend([
                            f"",
                            f"⚠️ **`/format`コマンドで自動変換可能です！**",
                            f"💡 `/format`を実行すると{needs_conversion}件が★に変換されます"
                        ])
                    elif already_converted > 0:
                        lines.extend([
                            f"",
                            f"✅ **すべてのA/B/Cイベントは★に変換済みです**",
                            f"🎉 {already_converted}件のイベントが既にフォーマット済み"
                        ])
                    else:
                        lines.extend([
                            f"",
                            f"💡 **A/B/C付きイベントは見つかりませんでした**",
                            f"🆕 今後作成するタスクには自動で★が付与されます"
                        ])
                    
                    lines.extend([
                        f"",
                        f"🔄 **使い方:**",
                        f"• `/format`: 既存A/B/Cを★に一括変換",
                        f"• `/task`: 新規タスク作成（自動★変換付き）"
                    ])
                    
                    result_text = "\n".join(lines)
                    await interaction.edit_original_response(content=result_text)
                else:
                    raise Exception("API response not ok")
                    
            except Exception as parse_error:
                # APIエラーの場合は手動手順を表示
                lines = [
                    f"🔍 **A/B/C付きイベント確認**",
                    f"",
                    f"📋 **手動確認手順:**",
                    f"1. Googleカレンダーを開く", 
                    f"2. 検索ボックスで「A」「B」「C」を検索",
                    f"3. `/format`コマンドで自動変換を試す",
                    f"",
                    f"💡 **今後作成するタスクは自動で★変換されます**"
                ]
                
                result_text = "\n".join(lines)
                await interaction.edit_original_response(content=result_text)
        else:
            await interaction.edit_original_response(
                content=f"❌ **イベント確認エラー**\n"
                f"カレンダーの確認中にエラーが発生しました。\n"
                f"手動でGoogleカレンダーを確認してください。"
            )
        
    except Exception as e:
        print(f"💥 Check events error: {type(e).__name__}: {e}")
        await interaction.edit_original_response(
            content=f"❌ **確認エラー**\n"
            f"イベントの確認中にエラーが発生しました。\n"
            f"手動でGoogleカレンダーを確認してください。"
        )

@tasks.loop(time=[time(13, 0), time(20, 0)])  # JST 13:00と20:00
async def daily_progress_report():
    """定期進捗レポート送信"""
    await send_progress_report()

bot.run(DISCORD_TOKEN)
