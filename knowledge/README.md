# Knowledge Base - Arduino Study Project

## 📋 概要

Arduino + HX711 + Node.jsを使った土質試験機制御システム開発のための技術学習における知識ベースです。

## 📚 技術ドキュメント

### 基礎知識
- [**Arduino基礎知識**](./arduino-basics.md) - ハードウェア仕様、プログラミング基礎、ベストプラクティス
- [**PlatformIOワークフロー**](./platformio-workflow.md) - 環境ベースビルド、ライブラリ管理、高度な設定

### 開発環境
- [**開発環境とセットアップ**](./development-environment.md) - WSL2設定、USB接続、パーミッション管理
- [**プロジェクト構造**](./project-structure.md) - ディレクトリ構造、ビルドシステム設計、変更履歴

### 問題解決
- [**トラブルシューティング**](./troubleshooting.md) - よくある問題と解決方法、デバッグ手法
- [**解決済み問題**](./solved-issues.md) - 実際に遭遇した問題の記録と解決方法

### プロジェクト管理
- [**継続課題と今後の方向性**](./future-directions.md) - 学習目標、技術課題、成長指標

## 🎯 学習進捗

Day別の学習進捗はGitコミット履歴で管理されています：

```bash
# 学習進捗の確認
git log --oneline --grep="feat(day"

# 特定の日の詳細
git show <commit-hash>
```

### 完了済み
- **Day 1** (2025年7月1日): 環境構築と基本動作確認 ✅

### 予定
- **Day 2**: アナログ入力とセンサー基礎
- **Day 3**: HX711モジュールの使用
- **Day 4**: Node.js通信システム
- **Day 5**: 制御機能の実装
- **Day 6**: 動ひずみ測定シミュレーション
- **Day 7**: 統合とテスト

## 🔧 クイックリファレンス

### よく使用するコマンド
```bash
# 特定の日のビルド
pio run -e dayX

# アップロード
pio run -e dayX --target upload

# シリアルモニター
pio device monitor --baud 9600

# デバイス確認
pio device list
```

### 重要なファイル
- [`platformio.ini`](../platformio.ini) - プロジェクト設定
- [`dayX/main.cpp`](../day1/main.cpp) - 各日のメインコード
- [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) - GitHub Copilot指示

## 📝 知識更新のルール

### 新しい知見の追加
1. **技術的発見**: 該当する技術ドキュメントに追記
2. **問題解決**: [`solved-issues.md`](./solved-issues.md)に新しい問題として記録
3. **課題発見**: [`future-directions.md`](./future-directions.md)の継続課題に追加

### ファイル間の参照
- 同じディレクトリ: `[filename.md](./filename.md)`
- 親ディレクトリ: `[filename.md](../filename.md)`
- 外部リンク: `[タイトル](https://example.com)`

## 🔗 外部リソース

- [Arduino公式ドキュメント](https://www.arduino.cc/reference/en/)
- [PlatformIO公式ドキュメント](https://docs.platformio.org/)
- [HX711ライブラリ](https://github.com/bogde/HX711)
- [Node.js SerialPort](https://serialport.io/)

## 📝 更新履歴

- **2025年7月1日**: 知識ベース初期構築、Day 1完了記録
