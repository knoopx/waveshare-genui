#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include "esp_err.h"

#define BSP_LCD_WIDTH   720
#define BSP_LCD_HEIGHT  720
#define BSP_LCD_BPP     2   /* RGB565 */

enum {
    BSP_TOUCH_EVENT_NONE = 0,
    BSP_TOUCH_EVENT_TAP = 1,
    BSP_TOUCH_EVENT_LEFT = 2,
    BSP_TOUCH_EVENT_RIGHT = 3,
    BSP_TOUCH_EVENT_TOP = 4,
    BSP_TOUCH_EVENT_BOTTOM = 5,
};

typedef struct {
    void    *framebuffer;
    uint16_t width;
    uint16_t height;
    uint8_t  bytes_per_pixel;
} bsp_display_info_t;

esp_err_t bsp_display_init(bsp_display_info_t *out);
esp_err_t bsp_display_set_brightness(int percent);

esp_err_t bsp_touch_init(void);
int       bsp_touch_read_event(void);

esp_err_t bsp_uart_init(void);
int       bsp_uart_read(uint8_t *buf, size_t len, uint32_t timeout_ms);
int       bsp_uart_write(const uint8_t *buf, size_t len);
