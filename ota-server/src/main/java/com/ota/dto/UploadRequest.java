package com.ota.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class UploadRequest {
    @NotNull(message = "文件不能为空")
    private MultipartFile bundle;

    @NotBlank(message = "应用名称不能为空")
    private String appName;

    @NotBlank(message = "平台不能为空")
    private String platform;

    @NotBlank(message = "版本号不能为空")
    private String version;

    @NotBlank(message = "更新类型不能为空")
    private String updateType;

    private String description;
    private String minAppVersion;
}
