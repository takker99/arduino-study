# PlatformIO拡張機能がプロジェクトを認識しない問題

## 📋 問題概要

**発生日**: 2025年7月1日
**カテゴリ**: プロジェクト構造・IDE統合問題
**重要度**: 中（開発効率に影響）

## 🚨 症状

VSCodeのPlatformIO拡張機能でプロジェクトが表示されない。プロジェクトツリーが空白で、環境切り替えやビルド機能が使用できない状態。

## 🔍 原因

`.git`ディレクトリと`platformio.ini`が異なるディレクトリに配置されていたため、PlatformIO拡張機能がプロジェクトルートを正しく認識できなかった。

**問題のあった構造**:
```
arduino-study/
├── .git/
├── arduino/
│   └── platformio.ini    # 異なるディレクトリに配置
└── docs/
```

## ✅ 解決方法

### 手順1: プロジェクト構造の変更
```bash
# platformio.iniをルートディレクトリに移動
mv arduino/platformio.ini ./
mv arduino/src ./
mv arduino/lib ./
mv arduino/include ./
```

**修正後の構造**:
```
arduino-study/
├── .git/
├── platformio.ini        # ルートに移動
├── dayXX/               # ソースコード
├── lib/
├── include/
└── docs/
```

### 手順2: VSCodeの再読み込み
```
Ctrl+Shift+P → "Developer: Reload Window"
```

### 手順3: PlatformIO環境の確認
PlatformIO拡張機能でプロジェクトが認識され、環境一覧が表示されることを確認。

## 💡 学んだこと

- **ツール統合の要件**: PlatformIO拡張機能は`.git`と`platformio.ini`が同じディレクトリにある必要
- **フラット構造の利点**: 深いネストよりもフラットな構造の方がツール連携に有利
- **環境ベースビルドシステム**: `${PIOENV}`変数を使った動的ソースファイル選択が可能

## 🔗 関連情報

- **参照ドキュメント**: [`project-structure.md`](./project-structure.md) - 構造変更の経緯セクション
- **関連機能**: PlatformIO環境ベースビルドシステム
- **IDE**: Visual Studio Code + PlatformIO IDE拡張機能

## 🛠️ 最終的な設定

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
...
```

### 利点
- 各日の学習内容を独立したディレクトリで管理
- `pio run -e dayX`で特定の日のコードをビルド可能
- VSCode統合での環境切り替えが正常動作

## 📝 予防策

今後のPlatformIOプロジェクト作成時は、最初からGitルートディレクトリで`pio project init`を実行する。

```bash
# 推奨プロジェクト作成手順
cd project-root
git init
pio project init --board uno
```

## 📝 更新履歴

- **2025年7月1日**: 初回記録
