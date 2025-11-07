package com.ota.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.ota.common.Result;
import com.ota.dto.UploadRequest;
import com.ota.entity.AppVersion;
import com.ota.entity.Version;
import com.ota.service.OtaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/ota")
@RequiredArgsConstructor
public class OtaController {

    private final OtaService otaService;

    /**
     * 上传并发布新版本
     */
    @PostMapping("/upload")
    public Result<Version> upload(@Validated @ModelAttribute UploadRequest request) {
        try {
            log.info("收到上传请求: appName={}, platform={}, version={}",
                    request.getAppName(), request.getPlatform(), request.getVersion());

            Version version = otaService.uploadVersion(request);
            return Result.ok(version);
        } catch (Exception e) {
            log.error("上传失败", e);
            return Result.fail(e.getMessage());
        }
    }

    /**
     * 检查更新
     */
    @GetMapping("/check")
    public Result<Version> checkUpdate(
            @RequestParam String appName,
            @RequestParam String platform,
            @RequestParam String version) {

        try {
            log.info("检查更新: appName={}, platform={}, version={}", appName, platform, version);

            Version latestVersion = otaService.checkUpdate(appName, platform, version);

            if (latestVersion == null) {
                return Result.ok();
            }

            return Result.ok(latestVersion);
        } catch (Exception e) {
            log.error("检查更新失败", e);
            return Result.fail(e.getMessage());
        }
    }

    /**
     * 获取最新版本
     */
    @GetMapping("/latest")
    public Result<AppVersion> getLatestVersion(
            @RequestParam String appName,
            @RequestParam String platform) {
        try {
            log.info("获取最新版本: appName={}, platform={}", appName, platform);
            Version latestVersion = otaService.getLatestVersion(appName, platform);
            if (latestVersion == null) {
                return Result.ok();
            }
            // 将 lastestVersion 转换为 AppVersion
            AppVersion version = new AppVersion();
            BeanUtils.copyProperties(latestVersion, version, AppVersion.class);
            // 设置兼容属性
            version.setRemark(latestVersion.getDescription());
            // 设置 Platform，这一段特殊逻辑先保持兼容，后续删除
            if ("android".equals(platform)) {
                version.setPlatform("0");
            }
            version.setName(latestVersion.getAppName());
            version.setDownloadLink(latestVersion.getDownloadUrl());
            return Result.ok(version);
        } catch (Exception e) {
            log.error("获取最新版本失败", e);
            return Result.fail(e.getMessage());
        }
    }

    /**
     * 获取所有版本列表
     */
    @GetMapping("/versions")
    public Result<List<Version>> listVersions() {
        try {
            List<Version> versions = otaService.listVersions();
            return Result.ok(versions);
        } catch (Exception e) {
            log.error("获取版本列表失败", e);
            return Result.fail(e.getMessage());
        }
    }

    /**
     * 分页查询版本列表
     */
    @GetMapping("/versions/page")
    public Result<Page<Version>> pageVersions(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String appName,
            @RequestParam(required = false) String platform) {
        try {
            log.info("分页查询版本列表: pageNum={}, pageSize={}, appName={}, platform={}",
                    pageNum, pageSize, appName, platform);

            Page<Version> page = otaService.pageVersions(pageNum, pageSize, appName, platform);
            return Result.ok(page);
        } catch (Exception e) {
            log.error("分页查询版本列表失败", e);
            return Result.fail(e.getMessage());
        }
    }

    /**
     * 删除指定版本
     */
    @DeleteMapping("/upload/{appName}/{platform}/{version}")
    public Result<Void> deleteVersion(
            @PathVariable String appName,
            @PathVariable String platform,
            @PathVariable String version) {

        try {
            log.info("删除版本: appName={}, platform={}, version={}", appName, platform, version);

            otaService.deleteVersion(appName, platform, version);
            return Result.ok();
        } catch (Exception e) {
            log.error("删除版本失败", e);
            return Result.fail(e.getMessage());
        }
    }
}
