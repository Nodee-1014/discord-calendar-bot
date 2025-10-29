# main.py
import os
import requests
import discord
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv  # 追加

# ---------- 設定（環境変数から読む） ----------
load_dotenv()  # 追加：.env を読み込む
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
GAS_ENDPOINT  = os.getenv("GAS_ENDPOINT")
API_KEY       = os.getenv("API_KEY")
GUILD_ID      = os.getenv("GUILD_ID")
# ----------------------------------------------

if not DISCORD_TOKEN or not GAS_ENDPOINT or not API_KEY:
    raise RuntimeError("環境変数 DISCORD_TOKEN/GAS_ENDPOINT/API_KEY を設定してください。")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    try:
        if GUILD_ID:
            guild = discord.Object(id=int(GUILD_ID))
            await bot.tree.sync(guild=guild)
            print(f"Slash commands synced to guild {GUILD_ID}")
        else:
            await bot.tree.sync()
            print("Slash commands synced globally")
        print(f"Logged in as {bot.user}")
        print(f"Bot is ready! Invite URL: https://discord.com/api/oauth2/authorize?client_id={bot.user.id}&permissions=2048&scope=bot%20applications.commands")
    except Exception as e:
        print("Sync error:", e)

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
@app_commands.describe(mode="preview か create", text="改行でタスク（例: 'Task A 1h A\\nTask B 30min B'）")
async def t2g(interaction: discord.Interaction, mode: str, text: str):
    mode = mode.lower().strip()
    if mode not in ("preview", "create"):
        await interaction.response.send_message("mode は preview か create を指定してください。", ephemeral=True)
        return

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

        if mode == "preview":
            out = render_preview(resp.get("preview", []))
            await interaction.followup.send(f"**プレビュー**\n```\n{out}\n```", ephemeral=True)
        else:
            created = resp.get("created", [])
            if not created:
                await interaction.followup.send("作成対象がありません。", ephemeral=True)
                return
            lines = []
            for it in created:
                s = str(it['start']).replace('T',' ').split('.')[0]
                e = str(it['end']).replace('T',' ').split('.')[0]
                lines.append(f"- {it['title']}: {s} → {e}")
            await interaction.followup.send("**作成しました**\n```\n" + "\n".join(lines) + "\n```", ephemeral=True)
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
        lines = [f"**{date}の予定**\n"]
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
            
            lines.append(f"{title} {start_time}-{end_time}")
        
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

bot.run(DISCORD_TOKEN)
