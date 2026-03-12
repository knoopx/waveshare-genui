#include "bsp.h"

#include <string.h>
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "driver/uart.h"
#include "esp_check.h"
#include "esp_lcd_mipi_dsi.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"
#include "esp_ldo_regulator.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "bsp";

/* ── Pin definitions (Waveshare ESP32-P4-WIFI6-Touch-LCD-4B) ────────── */
#define PIN_LCD_BACKLIGHT   GPIO_NUM_26
#define PIN_LCD_RST         GPIO_NUM_27
#define LEDC_CH             0
#define DSI_PHY_LDO_CHAN    3
#define DSI_PHY_LDO_MV      2500
#define IO_LDO_CHAN         4
#define IO_LDO_MV           3300
#define DSI_LANE_NUM        2
#define DSI_LANE_BITRATE    480   /* Mbps */
#define DPI_CLK_MHZ         38

/* UART for data (same as console UART0, but we take over after init) */
#define DATA_UART_NUM       UART_NUM_0
#define DATA_UART_BAUD      921600  /* must match CONFIG_ESP_CONSOLE_UART_BAUDRATE */
#define DATA_UART_BUF_SIZE  (64 * 1024)

/* ── ST7703 vendor init commands ────────────────────────────────────── */
typedef struct { uint8_t cmd; const uint8_t *data; uint8_t len; uint16_t delay_ms; } lcd_cmd_t;

static const lcd_cmd_t st7703_init[] = {
    {0xB9, (uint8_t[]){0xF1,0x12,0x83}, 3, 0},
    {0xB1, (uint8_t[]){0x00,0x00,0x00,0xDA,0x80}, 5, 0},
    {0xB2, (uint8_t[]){0x3C,0x12,0x30}, 3, 0},
    {0xB3, (uint8_t[]){0x10,0x10,0x28,0x28,0x03,0xFF,0x00,0x00,0x00,0x00}, 10, 0},
    {0xB4, (uint8_t[]){0x80}, 1, 0},
    {0xB5, (uint8_t[]){0x0A,0x0A}, 2, 0},
    {0xB6, (uint8_t[]){0x97,0x97}, 2, 0},
    {0xB8, (uint8_t[]){0x26,0x22,0xF0,0x13}, 4, 0},
    {0xBA, (uint8_t[]){0x31,0x81,0x0F,0xF9,0x0E,0x06,0x20,0x00,0x00,0x00,
                       0x00,0x00,0x00,0x00,0x44,0x25,0x00,0x90,0x0A,0x00,
                       0x00,0x01,0x4F,0x01,0x00,0x00,0x37}, 27, 0},
    {0xBC, (uint8_t[]){0x47}, 1, 0},
    {0xBF, (uint8_t[]){0x02,0x11,0x00}, 3, 0},
    {0xC0, (uint8_t[]){0x73,0x73,0x50,0x50,0x00,0x00,0x12,0x70,0x00}, 9, 0},
    {0xC1, (uint8_t[]){0x25,0x00,0x32,0x32,0x77,0xE4,0xFF,0xFF,0xCC,0xCC,
                       0x77,0x77}, 12, 0},
    {0xC6, (uint8_t[]){0x82,0x00,0xBF,0xFF,0x00,0xFF}, 6, 0},
    {0xC7, (uint8_t[]){0xB8,0x00,0x0A,0x10,0x01,0x09}, 6, 0},
    {0xC8, (uint8_t[]){0x10,0x40,0x1E,0x02}, 4, 0},
    {0xCC, (uint8_t[]){0x0B}, 1, 0},
    {0xE0, (uint8_t[]){0x00,0x0B,0x10,0x2C,0x3D,0x3F,0x42,0x3A,0x07,0x0D,
                       0x0F,0x13,0x15,0x13,0x14,0x0F,0x16,
                       0x00,0x0B,0x10,0x2C,0x3D,0x3F,0x42,0x3A,0x07,0x0D,
                       0x0F,0x13,0x15,0x13,0x14,0x0F,0x16}, 34, 0},
    {0xE3, (uint8_t[]){0x07,0x07,0x0B,0x0B,0x0B,0x0B,0x00,0x00,0x00,0x00,
                       0xFF,0x00,0xC0,0x10}, 14, 0},
    {0xE9, (uint8_t[]){0xC8,0x10,0x0A,0x00,0x00,0x80,0x81,0x12,0x31,0x23,
                       0x4F,0x86,0xA0,0x00,0x47,0x08,0x00,0x00,0x0C,0x00,
                       0x00,0x00,0x00,0x00,0x0C,0x00,0x00,0x00,0x98,0x02,
                       0x8B,0xAF,0x46,0x02,0x88,0x88,0x88,0x88,0x88,0x98,
                       0x13,0x8B,0xAF,0x57,0x13,0x88,0x88,0x88,0x88,0x88,
                       0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
                       0x00,0x00,0x00}, 63, 0},
    {0xEA, (uint8_t[]){0x97,0x0C,0x09,0x09,0x09,0x78,0x00,0x00,0x00,0x00,
                       0x00,0x00,0x9F,0x31,0x8B,0xA8,0x31,0x75,0x88,0x88,
                       0x88,0x88,0x88,0x9F,0x20,0x8B,0xA8,0x20,0x64,0x88,
                       0x88,0x88,0x88,0x88,0x23,0x00,0x00,0x02,0x71,0x00,
                       0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
                       0x00,0x00,0x00,0x00,0x40,0x80,0x81,0x00,0x00,0x00,
                       0x00}, 61, 0},
    {0xEF, (uint8_t[]){0xFF,0xFF,0x01}, 3, 0},
    /* Sleep Out + Display On */
    {0x11, (uint8_t[]){0x00}, 1, 250},
    {0x29, (uint8_t[]){0x00}, 1, 50},
};

/* ── Backlight (LEDC PWM, output inverted) ──────────────────────────── */
static esp_err_t backlight_init(void)
{
    const ledc_timer_config_t timer = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .duty_resolution = LEDC_TIMER_10_BIT,
        .timer_num       = LEDC_TIMER_1,
        .freq_hz         = 5000,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    ESP_RETURN_ON_ERROR(ledc_timer_config(&timer), TAG, "LEDC timer");

    const ledc_channel_config_t channel = {
        .gpio_num   = PIN_LCD_BACKLIGHT,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel    = LEDC_CH,
        .timer_sel  = LEDC_TIMER_1,
        .duty       = 0,
        .hpoint     = 0,
        .flags      = { .output_invert = 1 },
    };
    return ledc_channel_config(&channel);
}

esp_err_t bsp_display_set_brightness(int percent)
{
    if (percent < 0)   percent = 0;
    if (percent > 100) percent = 100;
    int actual = 47 + (percent * 53) / 100;
    uint32_t duty = (1023 * actual) / 100;
    ESP_RETURN_ON_ERROR(ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CH, duty), TAG, "set duty");
    return ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CH);
}

/* ── Display init ───────────────────────────────────────────────────── */
esp_err_t bsp_display_init(bsp_display_info_t *out)
{
    esp_err_t ret;

    ESP_RETURN_ON_ERROR(backlight_init(), TAG, "backlight init");

    esp_ldo_channel_handle_t ldo_h;
    esp_ldo_channel_config_t ldo_dsi = { .chan_id = DSI_PHY_LDO_CHAN, .voltage_mv = DSI_PHY_LDO_MV };
    ESP_RETURN_ON_ERROR(esp_ldo_acquire_channel(&ldo_dsi, &ldo_h), TAG, "LDO VO3");
    esp_ldo_channel_config_t ldo_io = { .chan_id = IO_LDO_CHAN, .voltage_mv = IO_LDO_MV };
    ESP_RETURN_ON_ERROR(esp_ldo_acquire_channel(&ldo_io, &ldo_h), TAG, "LDO VO4");

    gpio_config_t rst_cfg = {
        .pin_bit_mask = 1ULL << PIN_LCD_RST,
        .mode = GPIO_MODE_OUTPUT,
    };
    gpio_config(&rst_cfg);
    gpio_set_level(PIN_LCD_RST, 0);
    vTaskDelay(pdMS_TO_TICKS(10));
    gpio_set_level(PIN_LCD_RST, 1);
    vTaskDelay(pdMS_TO_TICKS(50));

    esp_lcd_dsi_bus_handle_t dsi_bus;
    esp_lcd_dsi_bus_config_t bus_cfg = {
        .bus_id            = 0,
        .num_data_lanes    = DSI_LANE_NUM,
        .phy_clk_src       = MIPI_DSI_PHY_CLK_SRC_DEFAULT,
        .lane_bit_rate_mbps = DSI_LANE_BITRATE,
    };
    ESP_RETURN_ON_ERROR(esp_lcd_new_dsi_bus(&bus_cfg, &dsi_bus), TAG, "DSI bus");

    esp_lcd_panel_io_handle_t dbi_io;
    esp_lcd_dbi_io_config_t dbi_cfg = {
        .virtual_channel = 0,
        .lcd_cmd_bits    = 8,
        .lcd_param_bits  = 8,
    };
    ESP_RETURN_ON_ERROR(esp_lcd_new_panel_io_dbi(dsi_bus, &dbi_cfg, &dbi_io), TAG, "DBI IO");

    esp_lcd_panel_handle_t dpi_panel;
    esp_lcd_dpi_panel_config_t dpi_cfg = {
        .dpi_clk_src       = MIPI_DSI_DPI_CLK_SRC_DEFAULT,
        .dpi_clock_freq_mhz = DPI_CLK_MHZ,
        .virtual_channel   = 0,
        .pixel_format      = LCD_COLOR_PIXEL_FORMAT_RGB565,
        .num_fbs           = 1,
        .video_timing = {
            .h_size             = BSP_LCD_WIDTH,
            .v_size             = BSP_LCD_HEIGHT,
            .hsync_back_porch   = 50,
            .hsync_pulse_width  = 20,
            .hsync_front_porch  = 50,
            .vsync_back_porch   = 20,
            .vsync_pulse_width  = 4,
            .vsync_front_porch  = 20,
        },
        .flags.use_dma2d = true,
    };
    ESP_RETURN_ON_ERROR(esp_lcd_new_panel_dpi(dsi_bus, &dpi_cfg, &dpi_panel), TAG, "DPI panel");

    const size_t n_cmds = sizeof(st7703_init) / sizeof(st7703_init[0]);
    for (size_t i = 0; i < n_cmds; i++) {
        ret = esp_lcd_panel_io_tx_param(dbi_io, st7703_init[i].cmd,
                                        st7703_init[i].data, st7703_init[i].len);
        ESP_RETURN_ON_ERROR(ret, TAG, "ST7703 cmd 0x%02X", st7703_init[i].cmd);
        if (st7703_init[i].delay_ms) {
            vTaskDelay(pdMS_TO_TICKS(st7703_init[i].delay_ms));
        }
    }

    ESP_RETURN_ON_ERROR(esp_lcd_panel_init(dpi_panel), TAG, "DPI init");

    void *fb = NULL;
    ESP_RETURN_ON_ERROR(esp_lcd_dpi_panel_get_frame_buffer(dpi_panel, 1, &fb), TAG, "get FB");
    memset(fb, 0, BSP_LCD_WIDTH * BSP_LCD_HEIGHT * BSP_LCD_BPP);

    out->framebuffer     = fb;
    out->width           = BSP_LCD_WIDTH;
    out->height          = BSP_LCD_HEIGHT;
    out->bytes_per_pixel = BSP_LCD_BPP;

    ESP_LOGI(TAG, "Display ready: %dx%d RGB565, fb=%p", BSP_LCD_WIDTH, BSP_LCD_HEIGHT, fb);
    return ESP_OK;
}

/* ── UART data channel (reuses UART0 / console port) ───────────────── */
esp_err_t bsp_uart_init(void)
{
    /* Remove any existing driver (console VFS installs one on UART0) */
    if (uart_is_driver_installed(DATA_UART_NUM)) {
        uart_driver_delete(DATA_UART_NUM);
    }

    uart_config_t uart_cfg = {
        .baud_rate  = DATA_UART_BAUD,
        .data_bits  = UART_DATA_8_BITS,
        .parity     = UART_PARITY_DISABLE,
        .stop_bits  = UART_STOP_BITS_1,
        .flow_ctrl  = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    ESP_RETURN_ON_ERROR(uart_param_config(DATA_UART_NUM, &uart_cfg), TAG, "UART config");
    ESP_RETURN_ON_ERROR(uart_driver_install(DATA_UART_NUM, DATA_UART_BUF_SIZE, 1024, 0, NULL, 0),
                        TAG, "UART driver install");

    /* Flush any stale data */
    uart_flush_input(DATA_UART_NUM);

    return ESP_OK;
}

int bsp_uart_read(uint8_t *buf, size_t len, uint32_t timeout_ms)
{
    return uart_read_bytes(DATA_UART_NUM, buf, len, pdMS_TO_TICKS(timeout_ms));
}

int bsp_uart_write(const uint8_t *buf, size_t len)
{
    int ret = uart_write_bytes(DATA_UART_NUM, buf, len);
    uart_wait_tx_done(DATA_UART_NUM, pdMS_TO_TICKS(100));
    return ret;
}
