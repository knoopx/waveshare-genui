#!/usr/bin/env bash
# Patches TinyUSB osal_freertos.h and generated bindings for ESP32-P4 compatibility.
set -euo pipefail

TARGET_DIR="${1:-target}"

# 1. Patch osal_freertos.h: taskENTER_CRITICAL() needs spinlock arg on ESP32-P4
find "$TARGET_DIR" -path "*/espressif__tinyusb/src/osal/osal_freertos.h" -print0 2>/dev/null | \
while IFS= read -r -d '' f; do
    if grep -q 'taskENTER_CRITICAL()' "$f"; then
        sed -i \
            -e 's/taskENTER_CRITICAL();/(void)0;/g' \
            -e 's/taskEXIT_CRITICAL();/(void)0;/g' \
            "$f"
        echo "Patched osal_freertos.h: $f"
    fi
done

# 2. Patch bindings.rs: repr(packed) + transitively repr(align) is a hard error in Rust.
#    Remove repr(packed) from the offending CDC descriptor struct.
find "$TARGET_DIR" -name "bindings.rs" -path "*/esp-idf-sys-*/out/*" -print0 2>/dev/null | \
while IFS= read -r -d '' f; do
    if grep -q 'cdc_desc_func_telephone_call_state_reporting_capabilities_t' "$f"; then
        # Replace repr(C, packed) with repr(C) for this specific struct
        sed -i '/pub struct cdc_desc_func_telephone_call_state_reporting_capabilities_t[^_]/{
            # Look back for repr line (2 lines above the struct def)
            N; N;
        }' "$f"
        # Simpler: just replace repr(C, packed) before that specific struct
        python3 -c "
import re, sys
with open('$f', 'r') as fh:
    content = fh.read()
# Remove 'packed' from the repr for this one struct
content = content.replace(
    '#[repr(C, packed)]\n#[derive(Debug, Default, Copy, Clone)]\npub struct cdc_desc_func_telephone_call_state_reporting_capabilities_t {',
    '#[repr(C)]\n#[derive(Debug, Default, Copy, Clone)]\npub struct cdc_desc_func_telephone_call_state_reporting_capabilities_t {'
)
with open('$f', 'w') as fh:
    fh.write(content)
" && echo "Patched bindings.rs: $f"
    fi
done
