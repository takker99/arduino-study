import os
from SCons.Script import DefaultEnvironment

env = DefaultEnvironment()

# WiFiS3ライブラリのパスを取得
FRAMEWORK_DIR = env.PioPlatform().get_package_dir("framework-arduinorenesas-uno")
LIB_PATH = os.path.join(FRAMEWORK_DIR, "libraries", "WiFiS3", "src")

files_to_patch = [
    os.path.join(LIB_PATH, "WiFiSSLClient.h"),
    os.path.join(LIB_PATH, "WiFiSSLClient.cpp")
]

for file_path in files_to_patch:
    if not os.path.exists(file_path):
        print(f"Warning: Could not find file to patch at {file_path}")
        continue

    # 既にパッチ済みか確認するためのマーカー
    marker = "PATCHED_BY_SCRIPT"

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # パッチが適用されていなければ適用する
    if marker not in content:
        # const byte cert[] のような記述を const ::byte cert[] に置換
        # より安全にするため、関数定義や宣言で使われるパターンに絞る
        content = content.replace("const byte cert[]", "const ::byte cert[]")
        content = content.replace("const byte* buffer", "const ::byte* buffer")

        # パッチ済みマーカーをファイルの先頭に追加
        content = f"// {marker}\n" + content

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Patched {os.path.basename(file_path)}")