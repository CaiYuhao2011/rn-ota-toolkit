package com.ota.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ota_version")
public class Version {
    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("app_name")
    private String appName;

    @TableField("platform")
    private String platform;

    @TableField("version")
    private String version;

    @TableField("bundle_filename")
    private String bundleFilename;

    @TableField("file_size")
    private Long fileSize;

    @TableField("update_type")
    private String updateType;

    @TableField("description")
    private String description;

    @TableField("min_app_version")
    private String minAppVersion;

    @TableField("download_url")
    private String downloadUrl;

    @TableField("upload_time")
    private LocalDateTime uploadTime;

    @TableField("update_time")
    private LocalDateTime updateTime;
}
