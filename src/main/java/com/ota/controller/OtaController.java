package com.ota.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.ota.common.Result;
import com.ota.dto.UploadRequest;
import com.ota.entity.AppVersion;
import com.ota.entity.Version;
import com.ota.service.ManifestService;
import com.ota.service.MinioService;
import com.ota.service.OtaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/ota")
@RequiredArgsConstructor
public class OtaController {

    private final OtaService otaService;
    private final ManifestService manifestService;
    private final MinioService minioService;

    /**
     * Expo Manifest V1 协议实现
     * 
     * @see [custom-expo-updates-server]{https://github.com/expo/custom-expo-updates-server}
     * @see [expo-updates]{https://docs.expo.dev/versions/latest/sdk/updates/}
     */
    @GetMapping("/manifest")
    public void manifest(HttpServletRequest request, HttpServletResponse response) {
        try {
            manifestService.endpoint(request, response);
        } catch (Exception e) {
            log.error("Manifest 请求处理失败", e);
            writeJsonError(response, 500, "Failed to process manifest request");
        }
    }

    @GetMapping("/assets")
    public void assets(
            @RequestParam String asset,
            @RequestParam("runtimeVersion") String runtimeVersion,
            @RequestParam String platform,
            HttpServletResponse response) {
        if (!StringUtils.isNotBlank(asset)) {
            writeJsonError(response, 400, "No asset name provided.");
            return;
        }
        if (!"ios".equals(platform) && !"android".equals(platform)) {
            writeJsonError(response, 400, "No platform provided. Expected \"ios\" or \"android\".");
            return;
        }
        if (!StringUtils.isNotBlank(runtimeVersion)) {
            writeJsonError(response, 400, "No runtimeVersion provided.");
            return;
        }

        try (var objectStream = minioService.readFile(asset)) {
            response.setStatus(200);
            response.setContentType(resolveAssetContentType(asset));
            response.setHeader("cache-control", "private, max-age=0");
            StreamUtils.copy(objectStream, response.getOutputStream());
        } catch (Exception e) {
            log.error("读取资源失败: {}", asset, e);
            writeJsonError(response, 404, "Asset \"" + asset + "\" does not exist.");
        }
    }

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

    private void writeJsonError(HttpServletResponse response, int status, String message) {
        if (response.isCommitted()) {
            return;
        }
        try {
            response.reset();
            response.setStatus(status);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"" + message.replace("\"", "\\\"") + "\"}");
        } catch (Exception ex) {
            log.warn("响应错误信息失败", ex);
        }
    }

    private String resolveAssetContentType(String assetPath) {
        if (assetPath.contains("_expo/static/js")) {
            return "application/javascript";
        }
        int lastDot = assetPath.lastIndexOf('.');
        if (lastDot == -1 || lastDot == assetPath.length() - 1) {
            return "application/octet-stream";
        }
        String ext = assetPath.substring(lastDot + 1).toLowerCase();
        return switch (ext) {
            case "js" -> "application/javascript";
            case "json" -> "application/json";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "svg" -> "image/svg+xml";
            case "hbc" -> "application/octet-stream";
            default -> "application/octet-stream";
        };
    }
}
