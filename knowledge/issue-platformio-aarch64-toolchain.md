# PlatformIO: ARM64環境でのUNO R4ビルドエラー解決策

## 課題

ARM64 (aarch64) アーキテクチャのマシンで、Arduino UNO R4 (renesas-raプラットフォーム) 向けのプロジェクトをPlatformIOでビルドしようとすると、以下のエラーが発生する場合がある。

```sh
> pio run -e r4-led
Processing r4-led (platform: renesas-ra; board: uno_r4_wifi; framework: arduino)
----------------------------------------------------------------------------------------------------------------------------------------------
Tool Manager: Installing platformio/toolchain-gccarmnoneeabi @ ~1.70201.0
UnknownPackageError: Could not find the package with 'platformio/toolchain-gccarmnoneeabi @ ~1.70201.0' requirements for your system 'linux_aarch64'
```

## 解決策

`toolchain-gccarmnoneeabi`のversionを上げると解決する

1. cacheをクリア
  ```bash
  rm -rf ~/.platformio/packages
  ```

2. `platform.ini`の[`platform_packages`](https://docs.platformio.org/en/latest/projectconf/sections/env/options/platform/platform_packages.html)で`toolchain-gccarmnoneeabi@<1.140000`を指定する
  ```diff
  [env:r4-led]
  platform = renesas-ra
  board = uno_r4_wifi
  + platform_packages =
      toolchain-gccarmnoneeabi@^1.9
  ```

3. Run [`pio pkg update`](https://docs.platformio.org/en/stable/core/userguide/pkg/cmd_update.html)
PlatformIOのvscode拡張機能があるなら、自動で更新してくれる


## References
- [Toolchain-gccarmnoneeabi for aarch64 - PlatformIO Community](https://community.platformio.org/t/toolchain-gccarmnoneeabi-for-aarch64/15973/8)
  - このthreadでは`toolchain-gccarmnoneeabi@~1.90301.0`としているが、`toolchain-gccarmnoneeabi@<1.140000`でも動く
    - warningが発生するが、多分無視していい
    - 気になるようなら`<1.120000`にする
  - `1.140000`以上のversionだとcompile errorになる