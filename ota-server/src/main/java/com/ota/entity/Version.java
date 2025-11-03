package com.ota.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ota_version")
public class Version {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String appName;
    private String platform;
    private String version;
    private String updateType;
    private String description;
    private String minAppVersion;
    private String bundleFilename;
    private String bundleUrl;
    private Long fileSize;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer deleted;
}
