# Arduino開発で解決した問題の記録

## 📋 概要

Arduino Study Projectで遭遇した問題とその解決方法を記録します。同じ問題に再び遭遇した際の参考資料として活用できます。

## 🔧 環境構築・接続問題

### WSL2でのArduino接続権限エラー

**発生日**: 2025年7月1日
**症状**:
```
could not open port /dev/ttyACM0: [Errno 13] Permission denied: '/dev/ttyACM0'
```

**原因**: WSL2環境でシリアルデバイスにアクセスする権限がない

**解決方法**:
```bash
# ユーザーをdialoutグループに追加
sudo usermod -a -G dialout $USER

# 設定を即座に反映（再ログインの代わり）
newgrp dialout
```

**学んだこと**:
- WSL2でのUSBデバイスアクセスには適切な権限設定が必要
- dialoutグループへの追加は一度だけ実行すれば永続的

**参照**: [`troubleshooting.md`](./troubleshooting.md) - 権限エラーセクション

### PlatformIOのバージョン互換性問題

**発生日**: 2025年7月1日
**症状**:
```
AttributeError: 'PlatformioCLI' object has no attribute 'resultcallback'
```

**原因**: Ubuntu 24.04のsystemパッケージのPlatformIOが古く、Clickライブラリとの互換性問題

**解決方法**:
```bash
# pipxを使用した最新版インストール
sudo apt install pipx -y
pipx install platformio
pipx ensurepath
```

**学んだこと**:
- システムパッケージよりもpipxでの管理が安定
- PlatformIOは頻繁に更新されるため最新版の使用が重要

**参照**: [`development-environment.md`](./development-environment.md) - PlatformIOインストールセクション

## 🏗️ プロジェクト構造問題

### PlatformIO拡張機能がプロジェクトを認識しない

**発生日**: 2025年7月1日
**症状**: VSCodeのPlatformIO拡張機能でプロジェクトが表示されない

**原因**: `.git`ディレクトリと`platformio.ini`が異なるディレクトリに配置されていた

**解決方法**:
```bash
# プロジェクト構造の変更
# 変更前: arduino-study/arduino/platformio.ini
# 変更後: arduino-study/platformio.ini
```

**学んだこと**:
- PlatformIO拡張機能は`.git`と`platformio.ini`が同じディレクトリにある必要
- フラットな構造の方がツール連携に有利

**参照**: [`project-structure.md`](./project-structure.md) - 構造変更の経緯セクション

## 📝 今後の問題記録ルール

### 記録形式
各問題は以下の形式で記録します：

```markdown
### 問題のタイトル

**発生日**: YYYY年MM月DD日
**症状**: 具体的な症状やエラーメッセージ
**原因**: 問題の根本原因
**解決方法**: 具体的な解決手順
**学んだこと**: 今後に活かせる知見
**参照**: 関連ドキュメントへのリンク
```

### カテゴリ分類
- **環境構築・接続問題**: WSL2、USB接続、権限等
- **プロジェクト構造問題**: ディレクトリ構成、ビルドシステム等
- **ハードウェア問題**: Arduino、センサー、回路等
- **ソフトウェア問題**: コンパイル、ライブラリ、実行時エラー等
- **通信問題**: シリアル通信、Node.js連携等

## 📝 更新履歴

- **2025年7月1日**: 初版作成、Day 1で解決した問題を記録
