package com.ota.constant;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Expo 更新类型
 *
 * @author caiyuhao
 */
@AllArgsConstructor
@Getter
public enum UpdateType {
    NORMAL_UPDATE(0),
    ROLLBACK(1);
    private final Integer type;
}
