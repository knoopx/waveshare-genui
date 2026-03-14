idf_component_register(
    SRCS "bsp.c"
    INCLUDE_DIRS "include"
    REQUIRES driver esp_lcd esp_hw_support esp_lcd_touch_gt911
)
