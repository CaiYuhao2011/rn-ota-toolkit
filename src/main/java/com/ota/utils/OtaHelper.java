package com.ota.utils;

import cn.hutool.core.codec.Base64;
import cn.hutool.core.util.HexUtil;
import cn.hutool.extra.spring.SpringUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.ota.service.MinioService;
import com.ota.vo.MetaData;
import io.minio.GetObjectResponse;
import io.minio.StatObjectResponse;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.format.DateTimeFormatter;

public class OtaHelper {
    private static final MinioService minioService = SpringUtil.getBean(MinioService.class);

    /**
     *
     * @param inputStream
     * @param hashingAlgorithm
     * @param encoding "base64" | "base64url" | "hex" | "binary"
     * @return
     */
    private static String createHash(InputStream inputStream, String hashingAlgorithm, String encoding) {
        try {
            MessageDigest digest = MessageDigest.getInstance(hashingAlgorithm);
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
            byte[] hashBytes = digest.digest();

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

    public static String convertSHA256HashToUUID(String sha256Hash) {
        return sha256Hash.substring(0, 8) + "-"
                + sha256Hash.substring(8, 12) + "-"
                + sha256Hash.substring(12, 16) + "-"
                + sha256Hash.substring(16, 20) + "-"
                + sha256Hash.substring(20, 32);
    }

    public static MetaData getMetadata(String updateBundlePath) {
        String metadataPath = updateBundlePath + "/metadata.json";
        JSONObject metadataJson;
        GetObjectResponse metadataInputStream;
        
        // Minio 读取文件
        try {
            metadataInputStream =  minioService.readFile(metadataPath);
            // 将 InputStream 转换为 JSONObject
            String jsonStr = new String(metadataInputStream.readAllBytes(), StandardCharsets.UTF_8);
            metadataJson = JSONUtil.parseObj(jsonStr);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        
        StatObjectResponse metadataStat;
        try {
            metadataStat = minioService.statFile(metadataPath);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        MetaData metaData = new MetaData();
        metaData.setMetadataJson(metadataJson);
        metaData.setCreatedAt(metadataStat.lastModified().format(DateTimeFormatter.ISO_INSTANT));
        metaData.setId(createHash(metadataInputStream, "SHA-256", "hex"));

        return metaData;
    }
}