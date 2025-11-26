package com.ota.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ota.exception.NoUpdateAvailableException;
import com.ota.service.ManifestService;
import com.ota.utils.OtaHelper;
import com.ota.vo.AssetMetadata;
import com.ota.vo.MetaData;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Expo Update Manifest V1 Protocol Release
 *
 * @author caiyuhao
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class ManifestServiceImpl implements ManifestService {

    private final ObjectMapper objectMapper;

    @Value("${updates.public-base-url:http://localhost:10080}")
    private String publicBaseUrl;

    @Override
    public void endpoint(HttpServletRequest request, HttpServletResponse response) {
        int protocolVersion = parseProtocolVersion(request.getHeader("expo-protocol-version"));
        try {
            String platform = resolvePlatform(request);
            String runtimeVersion = resolveRuntimeVersion(request);

            String updateBundlePath = OtaHelper.getLatestUpdateBundlePath(runtimeVersion, platform);
            UpdateKind updateKind = OtaHelper.hasRollbackFile(updateBundlePath) ? UpdateKind.ROLLBACK
                    : UpdateKind.NORMAL;

            if (updateKind == UpdateKind.NORMAL) {
                putUpdateInResponse(request, response, updateBundlePath, runtimeVersion, platform, protocolVersion);
            } else {
                putRollBackInResponse(request, response, updateBundlePath, protocolVersion);
            }
        } catch (NoUpdateAvailableException e) {
            try {
                putNoUpdateAvailableInResponse(request, response, protocolVersion);
            } catch (IllegalArgumentException illegalArgumentException) {
                writeJsonError(response, HttpServletResponse.SC_BAD_REQUEST, illegalArgumentException.getMessage());
            } catch (Exception ex) {
                log.error("构建 NoUpdateAvailable 指令失败", ex);
                writeJsonError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                        "Failed to build no update directive");
            }
        } catch (IllegalArgumentException e) {
            writeJsonError(response, HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            log.error("处理 Manifest 请求失败", e);
            writeJsonError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Failed to process manifest request");
        }
    }

    private void putUpdateInResponse(
            HttpServletRequest request,
            HttpServletResponse response,
            String updateBundlePath,
            String runtimeVersion,
            String platform,
            int protocolVersion) throws Exception {

        MetaData metaData = OtaHelper.getMetadata(updateBundlePath);
        String manifestId = OtaHelper.convertSHA256HashToUUID(metaData.getId());

        if (protocolVersion == 1) {
            String currentUpdateId = request.getHeader("expo-current-update-id");
            if (StringUtils.isNotBlank(currentUpdateId) && currentUpdateId.equals(manifestId)) {
                throw new NoUpdateAvailableException();
            }
        }

        var metadataJson = metaData.getMetadataJson();
        var platformMetadata = metadataJson.getJSONObject("fileMetadata").getJSONObject(platform);

        List<AssetMetadata> assets = new ArrayList<>();
        var assetsArray = platformMetadata.getJSONArray("assets");
        if (assetsArray != null) {
            for (int i = 0; i < assetsArray.size(); i++) {
                var asset = assetsArray.getJSONObject(i);
                assets.add(
                        OtaHelper.buildAssetMetadata(
                                updateBundlePath,
                                asset.getStr("path"),
                                asset.getStr("ext"),
                                false,
                                runtimeVersion,
                                platform,
                                publicBaseUrl));
            }
        }

        AssetMetadata launchAsset = OtaHelper.buildAssetMetadata(
                updateBundlePath,
                platformMetadata.getStr("bundle"),
                null,
                true,
                runtimeVersion,
                platform,
                publicBaseUrl);

        var expoConfigJson = OtaHelper.getExpoConfig(updateBundlePath);
        Map<String, Object> expoConfig = objectMapper.readValue(
                expoConfigJson.toString(),
                new TypeReference<Map<String, Object>>() {
                });

        Map<String, Object> manifest = new LinkedHashMap<>();
        manifest.put("id", manifestId);
        manifest.put("createdAt", metaData.getCreatedAt());
        manifest.put("runtimeVersion", runtimeVersion);
        manifest.put("assets", assets.stream().map(this::toAssetResponse).collect(Collectors.toList()));
        manifest.put("launchAsset", toAssetResponse(launchAsset));
        manifest.put("metadata", new LinkedHashMap<>());
        manifest.put("extra", Map.of("expoClient", expoConfig));

        String manifestPayload = objectMapper.writeValueAsString(manifest);

        Map<String, Object> assetRequestHeaders = new LinkedHashMap<>();
        assets.forEach(asset -> assetRequestHeaders.put(asset.getKey(), defaultAssetHeader()));
        assetRequestHeaders.put(launchAsset.getKey(), defaultAssetHeader());

        Map<String, Object> extensions = Map.of("assetRequestHeaders", assetRequestHeaders);
        String extensionsPayload = objectMapper.writeValueAsString(extensions);

        List<MultipartSection> sections = new ArrayList<>();
        sections.add(new MultipartSection("manifest", manifestPayload));
        sections.add(new MultipartSection("extensions", extensionsPayload));

        writeMultipartResponse(response, protocolVersion, sections);
    }

    private void putRollBackInResponse(
            HttpServletRequest request,
            HttpServletResponse response,
            String updateBundlePath,
            int protocolVersion) throws Exception {

        if (protocolVersion == 0) {
            throw new IllegalArgumentException("Rollbacks not supported on protocol version 0");
        }

        String embeddedUpdateId = request.getHeader("expo-embedded-update-id");
        if (StringUtils.isBlank(embeddedUpdateId)) {
            throw new IllegalArgumentException("Invalid Expo-Embedded-Update-ID request header specified.");
        }

        String currentUpdateId = request.getHeader("expo-current-update-id");
        if (StringUtils.isNotBlank(currentUpdateId) && currentUpdateId.equals(embeddedUpdateId)) {
            throw new NoUpdateAvailableException();
        }

        var directiveJson = OtaHelper.createRollBackDirective(updateBundlePath);
        String directivePayload = directiveJson.toString();

        writeMultipartResponse(
                response,
                protocolVersion == 0 ? 1 : protocolVersion,
                List.of(new MultipartSection("directive", directivePayload)));
    }

    private void putNoUpdateAvailableInResponse(
            HttpServletRequest request,
            HttpServletResponse response,
            int protocolVersion) throws Exception {

        if (protocolVersion == 0) {
            throw new IllegalArgumentException("NoUpdateAvailable directive not available in protocol version 0");
        }

        var directiveJson = OtaHelper.createNoUpdateAvailableDirective();
        String directivePayload = directiveJson.toString();
        writeMultipartResponse(
                response,
                1,
                List.of(new MultipartSection("directive", directivePayload)));
    }

    private String resolvePlatform(HttpServletRequest request) {
        String platform = request.getHeader("expo-platform");
        if (StringUtils.isBlank(platform)) {
            platform = request.getParameter("platform");
        }
        if (!"ios".equals(platform) && !"android".equals(platform)) {
            throw new IllegalArgumentException("Unsupported platform. Expected either ios or android.");
        }
        return platform;
    }

    private String resolveRuntimeVersion(HttpServletRequest request) {
        String runtimeVersion = request.getHeader("expo-runtime-version");
        if (StringUtils.isBlank(runtimeVersion)) {
            runtimeVersion = request.getParameter("runtime-version");
            if (StringUtils.isBlank(runtimeVersion)) {
                runtimeVersion = request.getParameter("runtimeVersion");
            }
        }
        if (StringUtils.isBlank(runtimeVersion)) {
            throw new IllegalArgumentException("No runtimeVersion provided.");
        }
        return runtimeVersion;
    }

    private int parseProtocolVersion(String headerValue) {
        if (StringUtils.isBlank(headerValue)) {
            return 0;
        }
        try {
            int version = Integer.parseInt(headerValue);
            if (version != 0 && version != 1) {
                throw new NumberFormatException();
            }
            return version;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Unsupported protocol version. Expected either 0 or 1.");
        }
    }

    private Map<String, Object> toAssetResponse(AssetMetadata metadata) {
        Map<String, Object> asset = new LinkedHashMap<>();
        asset.put("hash", metadata.getHash());
        asset.put("key", metadata.getKey());
        asset.put("fileExtension", metadata.getFileExtension());
        asset.put("contentType", metadata.getContentType());
        asset.put("url", metadata.getUrl());
        return asset;
    }

    private Map<String, Object> defaultAssetHeader() {
        return Map.of("test-header", "test-header-value");
    }

    private void writeMultipartResponse(HttpServletResponse response, int protocolVersion,
            List<MultipartSection> sections) throws Exception {
        String boundary = "expo-manifest-boundary-" + UUID.randomUUID();
        response.setStatus(HttpServletResponse.SC_OK);
        response.setHeader("expo-protocol-version", String.valueOf(protocolVersion));
        response.setHeader("expo-sfv-version", "0");
        response.setHeader("cache-control", "private, max-age=0");
        response.setHeader("content-type", "multipart/mixed; boundary=" + boundary);

        ServletOutputStream outputStream = response.getOutputStream();
        for (MultipartSection section : sections) {
            outputStream.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
            outputStream.write("content-type: application/json; charset=utf-8\r\n".getBytes(StandardCharsets.UTF_8));
            outputStream.write(("content-disposition: inline; name=\"" + section.name + "\"\r\n\r\n")
                    .getBytes(StandardCharsets.UTF_8));
            outputStream.write(section.payload.getBytes(StandardCharsets.UTF_8));
            outputStream.write("\r\n".getBytes(StandardCharsets.UTF_8));
        }
        outputStream.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        outputStream.flush();
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
        } catch (Exception e) {
            log.warn("写入错误响应失败", e);
        }
    }

    private enum UpdateKind {
        NORMAL,
        ROLLBACK
    }

    private record MultipartSection(String name, String payload) {
    }
}
