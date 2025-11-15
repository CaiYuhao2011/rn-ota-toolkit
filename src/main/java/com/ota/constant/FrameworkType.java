package com.ota.constant;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 框架枚举
 *
 * @author caiyuhao
 */
@Getter
@AllArgsConstructor
public enum FrameworkType {
    BARE("bare"),
    EXPO("expo");
    private final String value;
}
