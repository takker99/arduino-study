# PlatformIO extra script: .envの環境変数をbuild_flagsへ追加
# 公式: https://docs.platformio.org/en/latest/scripting/examples/override_board_configuration.html
# .envファイルの各行（KEY=VALUE）を-D KEY="VALUE"形式でbuild_flagsへ追加
import os
from pathlib import Path
from SCons.Script import DefaultEnvironment

env = DefaultEnvironment()

# .envファイルのパス（プロジェクトルート想定）
env_path = Path(env['PROJECT_DIR']+'/'+env['PIOENV']) / '.env'
# BUILD_FLAGSに環境変数を追加する
# 最後に追加した環境変数をprintする
build_flags = []
if env_path.exists():
    with env_path.open() as f:
        build_flags.extend([
          f'-D {key}="{value.replace("\"", "\\\"")}"' for key, value in (line.split('=', 1) for line in f.read().split('\n') if line.strip() and not line.startswith('#'))
        ])

env.Append(BUILD_FLAGS=build_flags)
print(f"Added build flags: {build_flags}")
