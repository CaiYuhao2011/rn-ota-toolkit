package com.ota.service.impl;

import com.ota.entity.Version;
import com.ota.service.ManifestService;
import com.ota.service.OtaService;
import com.ota.utils.OtaHelper;
import com.ota.vo.MetaData;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

/**
 * Expo Update Manifest V1 Protocol Release
 *
 * @author caiyuhao
 */
@RequiredArgsConstructor
@Service
public class ManifestServiceImpl implements ManifestService {
    private final OtaService otaService;

    @Override
    public void endpoint(HttpServletRequest request) {
        int protocolVersion =  request.getIntHeader("expo-protocol-version");
        String platform = request.getHeader("expo-platform");
        if (StringUtils.isBlank(platform)) {
            platform = request.getParameter("platform");
        }
        if (StringUtils.isBlank(platform) || (!"ios".equals(platform) && !"android".equals(platform))) {
            throw new RuntimeException("Unsupported platform. Expected either ios or android.");
        }
        String runtimeVersion = request.getHeader("expo-runtime-version");
        if (StringUtils.isBlank(runtimeVersion)) {
            runtimeVersion = request.getParameter("runtimeVersion");
        }
        if (StringUtils.isBlank(runtimeVersion)) {
            throw new RuntimeException("No runtimeVersion provided.");
        }
        // 查询最新的版本
        Version latestVersion = otaService.getLatestVersion(runtimeVersion, platform);
        if (latestVersion == null) {
            throw new RuntimeException("No version found for runtimeVersion: " + runtimeVersion + " and platform: " + platform);
        }

        String updateBundlePath = platform + "/" + runtimeVersion + "/" + latestVersion.getVersion();
        MetaData metaData = OtaHelper.getMetadata(updateBundlePath);

        String currentUpdateId = request.getHeader("expo-current-update-id");
        if (StringUtils.isBlank(currentUpdateId)) {
            throw new RuntimeException("No currentUpdateId provided.");
        }

        // NoUpdateAvailable directive only supported on protocol version 1
        // for protocol version 0, serve most recent update as normal
        if (currentUpdateId.equals(OtaHelper.convertSHA256HashToUUID(metaData.getId())) && protocolVersion == 1) {
            throw new RuntimeException("No update available for runtimeVersion: " + runtimeVersion + ".");
        }
    }
}
