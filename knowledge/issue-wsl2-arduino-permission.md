# WSL2でのArduino接続権限エラー

## 📋 問題概要

**発生日**: 2025年7月1日
**カテゴリ**: 環境構築・接続問題
**重要度**: 高（開発環境の基本機能に影響）

## 🚨 症状

```
could not open port /dev/ttyACM0: [Errno 13] Permission denied: '/dev/ttyACM0'
```

PlatformIOでArduinoにプログラムをアップロードしようとすると、シリアルポートへのアクセス権限エラーが発生。

## 🔍 原因

WSL2環境でシリアルデバイス（`/dev/ttyACM0`）にアクセスする権限がない。Linuxではシリアルポートへのアクセスにはdialoutグループのメンバーシップが必要。

## ✅ 解決方法

### 手順1: ユーザーをdialoutグループに追加
```bash
sudo usermod -a -G dialout $USER
```

### 手順2: 設定を即座に反映
```bash
# 再ログインの代わりに以下を実行
newgrp dialout
```

### 手順3: 権限確認
```bash
# グループメンバーシップの確認
groups $USER

# デバイスファイルの権限確認
ls -l /dev/ttyACM0
```

## 💡 学んだこと

- **権限設定の永続性**: dialoutグループへの追加は一度だけ実行すれば永続的
- **WSL2の特殊性**: Windows環境でのLinux開発には特有の権限管理が必要
- **デバッグ手法**: `groups`コマンドでグループメンバーシップを確認可能

## 🔗 関連情報

- **参照ドキュメント**: [`troubleshooting.md`](./troubleshooting.md) - 権限エラーセクション
- **関連問題**: PlatformIOアップロードエラー全般
- **プラットフォーム**: WSL2 (Ubuntu on Windows)

## 📝 予防策

今後の環境構築時には、初期セットアップでdialoutグループ追加を実行する。

```bash
# 環境構築チェックリストに追加
sudo usermod -a -G dialout $USER
```

## 📝 更新履歴

- **2025年7月1日**: 初回記録
