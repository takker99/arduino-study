# PlatformIOのバージョン互換性問題

## 📋 問題概要

**発生日**: 2025年7月1日
**カテゴリ**: 開発ツール・依存関係問題
**重要度**: 高（PlatformIO基本機能に影響）

## 🚨 症状

```
AttributeError: 'PlatformioCLI' object has no attribute 'resultcallback'. Did you mean: 'result_callback'?
```

`pio project init --board uno`を実行すると、PlatformIO CLIでAttributeErrorが発生してプロジェクト初期化が失敗。

## 🔍 原因

Ubuntu 24.04のsystemパッケージで提供されるPlatformIO（v4.3.4）が古く、新しいClickライブラリとの互換性問題が発生。`resultcallback`メソッドが`result_callback`に変更されたことが原因。

## ✅ 解決方法

### 手順1: pipxのインストール
```bash
sudo apt update
sudo apt install pipx -y
```

### 手順2: 最新版PlatformIOのインストール
```bash
# pipxを使用した最新版インストール
pipx install platformio

# PATHの設定
pipx ensurepath
```

### 手順3: 動作確認
```bash
# 新しいPlatformIOの確認
~/.local/bin/pio --version

# プロジェクト初期化テスト
~/.local/bin/pio project init --board uno
```

## 💡 学んだこと

- **パッケージ管理の選択**: システムパッケージよりもpipxでの管理が安定
- **更新頻度の違い**: PlatformIOは頻繁に更新されるため最新版の使用が重要
- **依存関係の複雑性**: Python系ツールは依存ライブラリとの相性に注意が必要

## 🔗 関連情報

- **参照ドキュメント**: [`development-environment.md`](./development-environment.md) - PlatformIOインストールセクション
- **関連問題**: Python依存関係問題全般
- **プラットフォーム**: Ubuntu 24.04 LTS

## 🛠️ 代替解決法

### 方法2: venv環境での管理
```bash
# Python仮想環境での管理
python3 -m venv ~/platformio-env
source ~/platformio-env/bin/activate
pip install platformio
```

### 方法3: システムパッケージの更新待ち
```bash
# 将来的にシステムパッケージが更新された場合
sudo apt update && sudo apt upgrade platformio
```

## 📝 予防策

今後の環境構築では、最初からpipxでのPlatformIOインストールを採用する。

```bash
# 推奨インストール手順
sudo apt install pipx -y
pipx install platformio
pipx ensurepath
```

## 📝 更新履歴

- **2025年7月1日**: 初回記録
