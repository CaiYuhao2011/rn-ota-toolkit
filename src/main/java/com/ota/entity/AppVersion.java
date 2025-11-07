package com.ota.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class AppVersion extends Version {
    /**
     * 版本描述
     */
    private String remark;

    /**
     * 应用名
     */
    private String name;

    /**
     * 下载地址
     */
    private String downloadLink;
}
