#!/usr/bin/env python3
"""
Discord Calendar Bot - 自動セットアップスクリプト
このスクリプトを実行すると、必要な設定を対話形式で行えます。
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path

def print_banner():
    print("=" * 60)
    print("🤖 Discord Calendar Bot - 自動セットアップ")
    print("=" * 60)
    print()

def check_python_version():
    """Python バージョンチェック"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8以上が必要です")
        print(f"現在のバージョン: {sys.version}")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} 確認済み")

def install_dependencies():
    """依存関係のインストール"""
    print("\n📦 必要なパッケージをインストール中...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ パッケージのインストール完了")
    except subprocess.CalledProcessError:
        print("❌ パッケージのインストールに失敗しました")
        sys.exit(1)

def setup_env_file():
    """環境変数ファイルの設定"""
    print("\n⚙️  環境設定を行います...")
    
    # .env.template から .env を作成
    if Path(".env.template").exists():
        shutil.copy(".env.template", ".env")
        print("✅ .env ファイルを作成しました")
    elif Path(".env.example").exists():
        shutil.copy(".env.example", ".env")
        print("✅ .env ファイルを作成しました")
    else:
        # テンプレートファイルが無い場合は作成
        env_content = '''# Discord Calendar Bot 設定ファイル
DISCORD_TOKEN='YOUR_DISCORD_BOT_TOKEN_HERE'
GAS_ENDPOINT='YOUR_GAS_DEPLOY_URL_HERE'
API_KEY='my_secure_api_key_2025_discord_bot'
CHANNEL_ID='YOUR_CHANNEL_ID'
'''
        with open(".env", "w", encoding="utf-8") as f:
            f.write(env_content)
        print("✅ .env ファイルを作成しました")
    
    print("\n📝 以下の情報を入力してください:")
    print("（空白のままEnterを押すとスキップできます）")
    
    # Discord Bot Token
    print("\n1️⃣  Discord Bot Token")
    print("   取得方法: https://discord.com/developers/applications")
    discord_token = input("   Discord Bot Token: ").strip()
    
    # Google Apps Script URL
    print("\n2️⃣  Google Apps Script URL")
    print("   取得方法: Google Apps Script でウェブアプリとしてデプロイ")
    gas_url = input("   GAS Endpoint URL: ").strip()
    
    # Channel ID (オプション)
    print("\n3️⃣  Discord Channel ID (オプション)")
    print("   進捗レポート自動送信先チャンネル")
    channel_id = input("   Channel ID: ").strip()
    
    # .envファイルを更新
    if discord_token or gas_url or channel_id:
        with open(".env", "r", encoding="utf-8") as f:
            content = f.read()
        
        if discord_token:
            content = content.replace("YOUR_DISCORD_BOT_TOKEN_HERE", discord_token)
        if gas_url:
            content = content.replace("YOUR_GAS_DEPLOY_URL_HERE", gas_url)
        if channel_id:
            content = content.replace("YOUR_CHANNEL_ID", channel_id)
        
        with open(".env", "w", encoding="utf-8") as f:
            f.write(content)
        
        print("✅ 設定を保存しました")
    
    return discord_token, gas_url

def create_google_apps_script_info():
    """Google Apps Script セットアップ情報を表示"""
    print("\n" + "=" * 50)
    print("📄 Google Apps Script セットアップ")
    print("=" * 50)
    print()
    print("1. Google Apps Script (https://script.google.com/) にアクセス")
    print("2. 「新しいプロジェクト」を作成")
    print("3. 以下のファイルの内容をコピー&ペースト:")
    print("   📁 Text2GCalenderAddon_fixed.gs")
    print("4. 「デプロイ」→「新しいデプロイ」")
    print("5. 「種類」→「ウェブアプリ」を選択")
    print("6. 「実行者」→「自分」を選択")
    print("7. 「アクセス権限」→「全員」を選択")
    print("8. 「デプロイ」をクリック")
    print("9. 表示されたURLをコピーして、このセットアップで使用")
    print()

def create_discord_bot_info():
    """Discord Bot セットアップ情報を表示"""
    print("\n" + "=" * 50)
    print("🤖 Discord Bot セットアップ")
    print("=" * 50)
    print()
    print("1. Discord Developer Portal にアクセス")
    print("   https://discord.com/developers/applications")
    print("2. 「New Application」をクリック")
    print("3. Bot名を入力（例: MyCalendarBot）")
    print("4. 「Bot」タブ → 「Add Bot」")
    print("5. 「Token」をコピー（このセットアップで使用）")
    print("6. 「OAuth2」→「URL Generator」")
    print("7. 「bot」と「applications.commands」をチェック")
    print("8. 生成されたURLでサーバーに招待")
    print()

def final_steps():
    """最終ステップの案内"""
    print("\n" + "=" * 50)
    print("🚀 セットアップ完了！")
    print("=" * 50)
    print()
    print("次のステップ:")
    print("1. Google Apps Script の設定（上記参照）")
    print("2. Discord Bot の作成と招待（上記参照）")
    print("3. .env ファイルの値を正しく設定")
    print("4. Bot を起動: python main.py")
    print()
    print("📚 詳細なドキュメント: README.md")
    print("🆘 問題が発生した場合: GitHub Issues")
    print()

def main():
    """メイン実行関数"""
    print_banner()
    
    # 基本チェック
    check_python_version()
    
    # 依存関係インストール
    try:
        install_dependencies()
    except Exception as e:
        print(f"⚠️  依存関係のインストールをスキップ: {e}")
    
    # 環境設定
    discord_token, gas_url = setup_env_file()
    
    # セットアップ情報表示
    if not gas_url:
        create_google_apps_script_info()
    
    if not discord_token:
        create_discord_bot_info()
    
    # 最終案内
    final_steps()
    
    print("✨ 自動セットアップが完了しました！")

if __name__ == "__main__":
    main()