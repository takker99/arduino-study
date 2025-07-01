# Arduino Study Project - 開発環境とセットアップ

## 🛠️ 開発環境構成

### ハードウェア
- **Arduino UNO R3**: メインマイコンボード
- **USBケーブル**: Arduino - PC接続用

### ソフトウェア
- **OS**: Windows + WSL2 (Ubuntu)
- **エディタ**: Visual Studio Code
- **拡張機能**: PlatformIO IDE
- **ビルドツール**: PlatformIO Core

## 🔧 セットアップ手順

### 1. WSL2でのUSB接続

#### 必要なパッケージのインストール
```bash
# WSL2でUSBデバイスサポート
sudo apt update
sudo apt install linux-tools-generic hwdata
sudo update-alternatives --install /usr/local/bin/usbip usbip /usr/lib/linux-tools/*-generic/usbip 20
```

#### Windows側での作業
```powershell
# PowerShell（管理者権限）で実行
# USBIPD-WINのインストール
winget install --interactive --exact dorssel.usbipd-win

# USBデバイス一覧確認
usbipd list

# ArduinoをWSL2で共有（BUSID は実際の値に置き換え）
usbipd bind --busid 1-3
usbipd attach --wsl --busid 1-3
```

### 2. PlatformIOのインストール

#### pipxを使用した安全なインストール
```bash
# pipxのインストール
sudo apt install pipx -y

# PlatformIOのインストール
pipx install platformio

# PATHの設定
pipx ensurepath
```

#### パーミッション設定
```bash
# ユーザーをdialoutグループに追加
sudo usermod -a -G dialout $USER

# 設定反映のため再ログインまたは以下を実行
newgrp dialout
```

### 3. 接続確認

```bash
# デバイス一覧確認
pio device list

# または
ls /dev/ttyACM* /dev/ttyUSB*
```

## 💡 使用コマンド

### 基本的なPlatformIOコマンド

```bash
# プロジェクト初期化（既に完了）
pio project init --board uno

# ビルド
pio run

# 特定環境でビルド
pio run -e day1

# アップロード
pio run --target upload

# 特定環境でアップロード
pio run -e day1 --target upload

# シリアルモニター
pio device monitor --baud 9600

# プロジェクトのクリーン
pio run --target clean
```

### デバッグとトラブルシューティング

```bash
# 詳細出力でビルド
pio run -v

# デバイス情報の詳細表示
pio device list --serial

# 環境情報の確認
pio system info
```

## 🔍 トラブルシューティング

### よくある問題と解決策

#### 1. Permission denied エラー
**症状**: `could not open port /dev/ttyACM0: [Errno 13] Permission denied`

**解決策**:
```bash
sudo usermod -a -G dialout $USER
# 再ログインまたは
newgrp dialout
```

#### 2. Arduino が認識されない
**症状**: `pio device list` で何も表示されない

**解決策**:
1. Windows側でUSBIPDの設定を確認
2. WSL2でのUSBサポートパッケージを再インストール
3. Arduino をUSBポートから抜き差し

#### 3. ビルドエラー
**症状**: コンパイルが失敗する

**解決策**:
```bash
# キャッシュをクリア
pio run --target clean

# 環境を確認
pio project config

# 必要に応じて再ビルド
pio run
```

#### 4. 環境切り替えが効かない
**症状**: VSCodeで環境を変更しても反映されない

**解決策**:
1. VSCodeでPlatformIO環境を明示的に選択
2. コマンドラインで `-e` オプションを使用
3. VSCodeを再起動

## 📊 パフォーマンス情報

### ビルド時間（参考値）
- **初回ビルド**: 30-60秒（依存関係のダウンロード含む）
- **増分ビルド**: 5-10秒
- **アップロード**: 5-15秒

### メモリ使用量（Arduino UNO）
```
RAM:   [=         ]  11.4% (used 234 bytes from 2048 bytes)
Flash: [=         ]   6.4% (used 2050 bytes from 32256 bytes)
```

## 🔗 参考リンク

- [PlatformIO Documentation](https://docs.platformio.org/)
- [WSL USB接続ガイド](https://developer.mamezou-tech.com/blogs/2025/04/10/develop-on-vscode-platformio-and-wsl/)
- [Arduino UNO R3 ピン配置](https://www.arduino.cc/en/Reference/Board)

## 📝 メンテナンス

### 定期的な更新

```bash
# PlatformIOのアップデート
pipx upgrade platformio

# パッケージの更新
sudo apt update && sudo apt upgrade
```

### バックアップ

- `.git/` フォルダ: Git履歴
- `platformio.ini`: プロジェクト設定
- `dayXX/` フォルダ: 学習コード
- `knowledge/` フォルダ: プロジェクト知識
