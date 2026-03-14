#pragma once

#include <stdint.h>
#include <stddef.h>
#include "esp_err.h"

#define BSP_LCD_WIDTH   720
#define BSP_LCD_HEIGHT  720
#define BSP_LCD_BPP     2   /* RGB565 */

typedef struct {
    void    *framebuffer;
    uint16_t width;
    uint16_t height;
    uint8_t  bytes_per_pixel;
} bsp_display_info_t;

esp_err_t bsp_display_init(bsp_display_info_t *out);
esp_err_t bsp_display_set_brightness(int percent);

esp_err_t bsp_uart_init(void);
int       bsp_uart_read(uint8_t *buf, size_t len, uint32_t timeout_ms);
int       bsp_uart_write(const uint8_t *buf, size_t len);
