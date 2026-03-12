.PHONY: build flash monitor clean

ESPTOOL = $(HOME)/.espressif/python_env/idf5.3_py3.13_env/bin/python \
          $(HOME)/.espressif/esp-idf/v5.4/components/esptool_py/esptool/esptool.py
PORT ?= /dev/ttyACM0
BAUD ?= 921600
BUILD_DIR = target/riscv32imafc-esp-espidf/release/build/esp-idf-sys-c015348ae0af317d/out/build
ELF = target/riscv32imafc-esp-espidf/release/esp32-p4-usb-stream
BIN = $(ELF).bin

# Two-pass build: first pass generates bindings (may fail), patch, then rebuild
build:
	@echo "Building ESP32-P4 USB Display firmware..."
	@cargo build --release 2>&1 || true
	@./patch-tinyusb.sh target
	@cargo build --release
	$(ESPTOOL) --chip esp32p4 elf2image --flash_mode qio --flash_size 16MB -o $(BIN) $(ELF)

flash: build
	$(ESPTOOL) --chip esp32p4 --port $(PORT) --baud $(BAUD) \
		write_flash --flash_mode qio --flash_size 16MB --flash_freq 80m \
		0x2000 "$(BUILD_DIR)/bootloader/bootloader.bin" \
		0x8000 "$(BUILD_DIR)/partition_table/partition-table.bin" \
		0x10000 "$(BIN)"

monitor:
	$(ESPTOOL) --chip esp32p4 --port $(PORT) monitor

clean:
	cargo clean
