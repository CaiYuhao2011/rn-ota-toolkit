package com.ota.utils;

import cn.hutool.core.codec.Base64;
import cn.hutool.core.util.HexUtil;
import cn.hutool.extra.spring.SpringUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;

import com.ota.entity.Version;
import com.ota.service.MinioService;
import com.ota.service.OtaService;
import com.ota.vo.AssetMetadata;
import com.ota.vo.MetaData;
import io.minio.GetObjectResponse;
import io.minio.StatObjectResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Slf4j
public final class OtaHelper {
    private static final MinioService minioService = SpringUtil.getBean(MinioService.class);
    private static final OtaService otaService = SpringUtil.getBean(OtaService.class);

    private OtaHelper() {
    }

    private static byte[] readObjectBytes(String objectName) throws Exception {
        try (GetObjectResponse response = minioService.readFile(objectName)) {
            return response.readAllBytes();
        }
    }

    private static String createHash(byte[] data, String hashingAlgorithm, String encoding) {
        try {
            MessageDigest digest = MessageDigest.getInstance(hashingAlgorithm);
            byte[] hashBytes = digest.digest(data);
            return switch (encoding.toLowerCase()) {
                case "base64" -> Base64.encode(hashBytes);
                case "base64url" -> Base64.encodeUrlSafe(hashBytes);
                case "hex" -> HexUtil.encodeHexStr(hashBytes);
                case "binary" -> new String(hashBytes, StandardCharsets.ISO_8859_1);
                default -> throw new IllegalArgumentException("Unsupported encoding: " + encoding);
            };
        } catch (Exception e) {
            throw new RuntimeException("Error creating hash", e);
        }
    }

    private static String base64ToUrl(String base64) {
        return base64.replace('+', '-').replace('/', '_').replaceAll("=+$", "");
    }

    public static String convertSHA256HashToUUID(String sha256Hash) {
        return sha256Hash.substring(0, 8) + "-"
                + sha256Hash.substring(8, 12) + "-"
                + sha256Hash.substring(12, 16) + "-"
                + sha256Hash.substring(16, 20) + "-"
                + sha256Hash.substring(20, 32);
    }

    public static MetaData getMetadata(String updateBundlePath) {
        String metadataPath = updateBundlePath + "/metadata.json";
        try {
            byte[] metadataBytes = readObjectBytes(metadataPath);
            JSONObject metadataJson = JSONUtil.parseObj(new String(metadataBytes, StandardCharsets.UTF_8));
            StatObjectResponse metadataStat = minioService.statFile(metadataPath);

            MetaData metaData = new MetaData();
            metaData.setMetadataJson(metadataJson);
            metaData.setCreatedAt(metadataStat.lastModified().format(DateTimeFormatter.ISO_INSTANT));
            metaData.setId(createHash(metadataBytes, "SHA-256", "hex"));
            return metaData;
        } catch (Exception e) {
            throw new RuntimeException("读取 metadata.json 失败: " + e.getMessage(), e);
        }
    }

    public static JSONObject getExpoConfig(String updateBundlePath) {
        String expoConfigPath = updateBundlePath + "/expoConfig.json";
        try {
            byte[] bytes = readObjectBytes(expoConfigPath);
            return JSONUtil.parseObj(new String(bytes, StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("读取 expoConfig.json 失败: " + e.getMessage(), e);
        }
    }

    /**
     * 获取指定 runtimeVersion 的最新更新包路径
     * 路径结构: {runtimeVersion}/{platform}/{version}
     * 从数据库查询最新版本
     * 
     * @param runtimeVersion 运行时版本（通常是 appName）
     * @param platform       平台 (ios/android)
     * @return 最新更新包的完整路径
     */
    public static String getLatestUpdateBundlePath(String runtimeVersion, String platform) {
        try {
            Version latestVersion = otaService.getLatestVersion(runtimeVersion, platform);

            if (latestVersion == null) {
                throw new RuntimeException(
                        "No version found for runtime version: " + runtimeVersion + ", platform: " + platform);
            }

            // 返回路径: {runtimeVersion}/{platform}/{version}
            return String.format("%s/%s/%s", runtimeVersion, platform, latestVersion.getVersion());
        } catch (Exception e) {
            throw new RuntimeException("获取最新更新路径失败: " + e.getMessage(), e);
        }
    }

    public static boolean hasRollbackFile(String updateBundlePath) {
        String rollbackPath = updateBundlePath + "/rollback";
        return minioService.exists(rollbackPath);
    }

    public static AssetMetadata buildAssetMetadata(
            String updateBundlePath,
            String filePath,
            String ext,
            boolean isLaunchAsset,
            String runtimeVersion,
            String platform,
            String publicBaseUrl) {

        String objectName = updateBundlePath + "/" + filePath;
        try {
            byte[] assetBytes = readObjectBytes(objectName);
            String shaBase64 = createHash(assetBytes, "SHA-256", "base64");
            String hash = base64ToUrl(shaBase64);
            String key = createHash(assetBytes, "MD5", "hex");
            String keyExtensionSuffix = isLaunchAsset ? "bundle" : ext;
            String contentType = resolveContentType(ext, isLaunchAsset);
            String baseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                    : publicBaseUrl;

            return AssetMetadata.builder()
                    .hash(hash)
                    .key(key)
                    .fileExtension(StringUtils.hasText(keyExtensionSuffix) ? "." + keyExtensionSuffix : "")
                    .contentType(contentType)
                    .url(baseUrl + "/ota/assets?asset=" + objectName
                            + "&runtimeVersion=" + runtimeVersion
                            + "&platform=" + platform)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("构建资源元数据失败: " + objectName, e);
        }
    }

    public static JSONObject createRollBackDirective(String updateBundlePath) {
        String rollbackPath = updateBundlePath + "/rollback";
        try {
            StatObjectResponse stat = minioService.statFile(rollbackPath);
            JSONObject directive = new JSONObject();
            directive.set("type", "rollBackToEmbedded");
            JSONObject parameters = new JSONObject();
            parameters.set("commitTime", stat.lastModified().format(DateTimeFormatter.ISO_INSTANT));
            directive.set("parameters", parameters);
            return directive;
        } catch (Exception e) {
            throw new RuntimeException("No rollback found. Error: " + e.getMessage(), e);
        }
    }

    public static JSONObject createNoUpdateAvailableDirective() {
        JSONObject directive = new JSONObject();
        directive.set("type", "noUpdateAvailable");
        return directive;
    }

    private static String resolveContentType(String ext, boolean isLaunchAsset) {
        if (isLaunchAsset) {
            return "application/javascript";
        }
        if (!StringUtils.hasText(ext)) {
            return "application/octet-stream";
        }
        return switch (ext.toLowerCase(Locale.ROOT)) {
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
