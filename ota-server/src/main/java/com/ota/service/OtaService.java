package com.ota.service;

import com.ota.dto.UploadRequest;
import com.ota.entity.Version;

import java.util.List;

public interface OtaService {
    /**
     * 上传并发布新版本
     */
    Version uploadVersion(UploadRequest request) throws Exception;

    /**
     * 检查更新
     */
    Version checkUpdate(String appName, String platform, String currentVersion);

    /**
     * 获取最新版本
     */
    Version getLatestVersion(String appName, String platform);

    /**
     * 获取所有版本列表
     */
    List<Version> listVersions();

    /**
     * 删除指定版本
     */
    void deleteVersion(String appName, String platform, String version) throws Exception;
}
