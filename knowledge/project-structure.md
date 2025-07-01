# Arduino Study Project - プロジェクト構造とビルドシステム

## 📋 概要

このドキュメントは、Arduino Study Projectのプロジェクト構造とPlatformIOビルドシステムの設計について説明します。

## 🏗️ プロジェクト構造

### 現在の構造（2025年7月1日時点）

```
arduino-study/                 # PlatformIOプロジェクト（ルート）
├── .git/                     # Git管理
├── .pio/                     # PlatformIOビルドキャッシュ
├── .vscode/                  # VSCode設定
├── .gitignore                # Git除外設定
├── platformio.ini            # PlatformIO設定（重要）
├── README.md                 # プロジェクト概要
├── chat.json                 # チャット履歴（JSON）
├── chat.md                   # チャット履歴（Markdown）
├── knowledge/                # プロジェクト知識ベース
│   └── project-structure.md  # このファイル
└── day1/                     # Day 1学習コンテンツ
    ├── README.md             # Day 1学習ガイド
    └── main.cpp              # Day 1のArduinoコード
```

### 構造変更の経緯

**変更前（2025年6月26日 - 7月1日）:**
```
arduino-study/
├── arduino/                  # PlatformIOプロジェクト
│   ├── src/
│   ├── lib/
│   └── platformio.ini
├── nodejs/                   # Node.js関連
├── docs/                     # ドキュメント
├── hardware/                 # ハードウェア仕様
└── tests/                    # テストコード
```

**変更後（2025年7月1日以降）:**
```
arduino-study/                # PlatformIOプロジェクト（ルート移動）
├── platformio.ini            # ルートに移動
├── dayXX/                    # 日別学習コンテンツ
│   └── main.cpp              # 各日のメインコード
└── knowledge/                # 新設：プロジェクト知識
```

## ⚙️ PlatformIOビルドシステム

### platformio.ini設定

```ini
[platformio]
src_dir = ./

[env]
platform = atmelavr
board = uno
framework = arduino
build_src_filter = +<*.h> +<common.cpp> +<${PIOENV}/main.cpp>

[env:day1]
[env:day2]
[env:day3]
[env:day4]
[env:day5]
[env:day6]
[env:day7]
```

### ビルドシステムの特徴

#### 1. 環境ベースビルド
- **PIOENV変数**: 現在選択されている環境名（day1, day2, etc.）
- **動的ソースファイル選択**: `${PIOENV}/main.cpp`で各日のコードを選択
- **共通ファイル**: `common.cpp`と`*.h`を全環境で共有

#### 2. ソースディレクトリ設定
- **src_dir = ./**: プロジェクトルートをソースディレクトリに設定
- **従来のsrc/フォルダ不使用**: フラットな構造を採用

#### 3. ビルドフィルター
```ini
build_src_filter = +<*.h> +<common.cpp> +<${PIOENV}/main.cpp>
```
- `+<*.h>`: 全てのヘッダーファイルを含む
- `+<common.cpp>`: 共通コードを含む（まだ未作成）
- `+<${PIOENV}/main.cpp>`: 選択された環境のメインファイルのみ含む

## 🚀 使用方法

### ビルドとアップロード

```bash
# Day 1のコードをビルド
pio run -e day1

# Day 1のコードをアップロード
pio run -e day1 --target upload

# Day 2のコードをビルド（将来）
pio run -e day2

# 現在のデフォルト環境でビルド
pio run
```

### 環境の切り替え

```bash
# VSCodeでPlatformIO環境を切り替え
# 1. VSCodeのステータスバーでPlatformIO環境を選択
# 2. または、コマンドパレット > "PlatformIO: Switch Project Environment"
```

## 🎯 設計思想

### 1. シンプリシティ
- **フラット構造**: 深いネストを避け、理解しやすい構造
- **最小限のディレクトリ**: 必要最小限のフォルダ構成

### 2. 学習効率
- **日別分離**: 各日の学習内容を独立したファイルで管理
- **段階的複雑化**: Day 1から段階的に複雑になる設計

### 3. 開発効率
- **統一ビルドシステム**: 一つのplatformio.iniで全ての日程を管理
- **VSCode統合**: PlatformIO拡張機能との完全連携

## 📝 将来の拡張予定

### 共通コードの活用
```cpp
// common.cpp（将来作成予定）
#include <Arduino.h>

// 共通のユーティリティ関数
void setupSerial(int baudRate = 9600) {
    Serial.begin(baudRate);
    Serial.println("System initialized");
}

// 共通の設定値
const int LED_PIN = LED_BUILTIN;
const int BAUD_RATE = 9600;
```

### ヘッダーファイル
```cpp
// common.h（将来作成予定）
#ifndef COMMON_H
#define COMMON_H

void setupSerial(int baudRate = 9600);
extern const int LED_PIN;
extern const int BAUD_RATE;

#endif
```

## 🔧 トラブルシューティング

### よくある問題

1. **環境が認識されない**
   - Solution: VSCodeでPlatformIO環境を正しく選択する

2. **ビルドエラー**
   - Solution: `${PIOENV}/main.cpp`が存在することを確認

3. **アップロードエラー**
   - Solution: `sudo usermod -a -G dialout $USER`でPermission問題を解決

## 📊 変更履歴

- **2025年7月1日**: プロジェクト構造大幅変更、環境ベースビルドシステム導入
- **2025年6月26日**: 初期プロジェクト作成
