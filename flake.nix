{
  description = "Waveshare Display — firmware and host CLI";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    fenix,
  }: let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    fenixPkgs = fenix.packages.${system};

    rustToolchain = fenixPkgs.combine [
      fenixPkgs.latest.cargo
      fenixPkgs.latest.rustc
      fenixPkgs.latest.rust-src
      fenixPkgs.latest.rust-std
      fenixPkgs.latest.clippy
      fenixPkgs.targets.riscv32imafc-unknown-none-elf.latest.rust-std
    ];

    # Compat shim: esp-clang expects libxml2.so.2, nixpkgs ships libxml2.so.16
    espLibCompat = pkgs.runCommand "esp-lib-compat" {} ''
      mkdir -p $out/lib
      ln -s ${pkgs.libxml2.out}/lib/libxml2.so $out/lib/libxml2.so.2
      ln -s ${pkgs.zlib.out}/lib/libz.so $out/lib/libz.so.1
      ln -s ${pkgs.stdenv.cc.cc.lib}/lib/libstdc++.so.6 $out/lib/libstdc++.so.6
    '';

    espLibPath = pkgs.lib.makeLibraryPath [
      espLibCompat
      pkgs.libxml2
      pkgs.zlib
      pkgs.stdenv.cc.cc.lib
    ];

    # Host CLI — OpenUI generative UI rendered via satori
    genui = pkgs.stdenvNoCC.mkDerivation {
      name = "waveshare-genui";
      src = ./genui;
      nativeBuildInputs = [pkgs.bun];
      buildPhase = ''
        export HOME=$TMPDIR
        bun install --frozen-lockfile
      '';
      installPhase = ''
        mkdir -p $out/lib/waveshare-genui
        cp -r src node_modules package.json theme.json $out/lib/waveshare-genui/
      '';
    };

    waveshare-genui = pkgs.writeShellScriptBin "waveshare-genui" ''
      exec ${pkgs.nodejs}/bin/node ${genui}/lib/waveshare-genui/node_modules/tsx/dist/cli.mjs ${genui}/lib/waveshare-genui/src/index.tsx "$@"
    '';

    # Common build inputs for firmware work
    firmwareBuildInputs = [
      rustToolchain
      pkgs.cmake
      pkgs.ninja
      pkgs.python3
      pkgs.python3Packages.pip
      pkgs.python3Packages.virtualenv
      pkgs.git
      pkgs.wget
      pkgs.pkg-config
      pkgs.llvmPackages.clang
      pkgs.llvmPackages.libclang
      pkgs.ldproxy
      pkgs.espflash
      pkgs.openssl
      pkgs.perl
      pkgs.libxml2
      pkgs.zlib
    ];
  in {
    packages.${system} = {
      default = waveshare-genui;
      waveshare-genui = waveshare-genui;
    };

    apps.${system} = {
      default = {
        type = "app";
        program = "${waveshare-genui}/bin/waveshare-genui";
      };
      flash = {
        type = "app";
        program = let
          flashScript = pkgs.writeShellScript "waveshare-genui-flash" ''
            set -euo pipefail
            PORT=''${1:-/dev/ttyACM0}
            BAUD=''${2:-921600}

            ESP_IDF="$HOME/.espressif/esp-idf/v5.4"
            ESPTOOL="$HOME/.espressif/python_env/idf5.3_py3.13_env/bin/python $ESP_IDF/components/esptool_py/esptool/esptool.py"

            echo "Building firmware..."
            cargo build --release 2>&1 || true
            ./patch-tinyusb.sh target
            cargo build --release

            ELF="target/riscv32imafc-esp-espidf/release/waveshare-display"
            BIN="$ELF.bin"
            BUILD_DIR=$(find target/riscv32imafc-esp-espidf/release/build/esp-idf-sys-*/out/build -maxdepth 0 2>/dev/null | head -1)

            echo "Converting ELF to flashable image..."
            $ESPTOOL --chip esp32p4 elf2image --flash_mode qio --flash_size 16MB -o "$BIN" "$ELF"

            echo "Flashing to $PORT..."
            $ESPTOOL --chip esp32p4 --port "$PORT" --baud "$BAUD" \
              write_flash --flash_mode qio --flash_size 16MB --flash_freq 80m \
              0x2000 "$BUILD_DIR/bootloader/bootloader.bin" \
              0x8000 "$BUILD_DIR/partition_table/partition-table.bin" \
              0x10000 "$BIN"

            echo "Done. Reset the board to boot new firmware."
          '';
        in "${flashScript}";
      };
    };

    devShells.${system}.default = pkgs.mkShell {
      buildInputs =
        firmwareBuildInputs
        ++ [
          waveshare-genui
          pkgs.bun
        ];

      shellHook = ''
        export LIBCLANG_PATH="${pkgs.llvmPackages.libclang.lib}/lib"
        export PYTHON="${pkgs.python3}/bin/python3"
        export LD_LIBRARY_PATH="${espLibPath}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
      '';
    };
  };
}
