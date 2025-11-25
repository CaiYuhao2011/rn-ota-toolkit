package com.ota.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.ota.constant.FrameworkType;
import com.ota.dto.UploadRequest;
import com.ota.entity.Version;
import com.ota.mapper.VersionMapper;
import com.ota.service.MinioService;
import com.ota.service.OtaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.maven.artifact.versioning.ComparableVersion;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtaServiceImpl implements OtaService {

    private final VersionMapper versionMapper;
    private final MinioService minioService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Version uploadVersion(UploadRequest request) throws Exception {
        // 检查版本是否已存在
        LambdaQueryWrapper<Version> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Version::getAppName, request.getAppName())
                .eq(Version::getPlatform, request.getPlatform())
                .eq(Version::getVersion, request.getVersion());

        Version existingVersion = versionMapper.selectOne(wrapper);
        if (existingVersion != null) {
            throw new Exception("版本已存在: " + request.getVersion());
        }

        String fileUrl = null;
        String versionPath = null;

        // Expo 框架：使用 runtimeVersion/platform/version 结构
        if (request.getFramework().equals(FrameworkType.EXPO.getValue())) {
            // 路径结构: {runtimeVersion}/{platform}/{version}
            // runtimeVersion 使用 appName
            String basePath = String.format("%s/%s/%s",
                    request.getAppName(),
                    request.getPlatform(),
                    request.getVersion());

            // 解压缩文件并上传
            MultipartFile bundle = request.getBundle();
            String bundleUrl = minioService.uploadExtractedFiles(basePath, bundle);
            log.info("Expo bundle已上传至: {}", bundleUrl);
            versionPath = basePath;
            fileUrl = bundleUrl;
        } else {
            // 非 Expo 框架：保留原有结构
            String fileName = String.format("%s/%s/%s/%s",
                    request.getAppName(),
                    request.getPlatform(),
                    request.getVersion(),
                    request.getBundle().getOriginalFilename());
            fileUrl = minioService.uploadFile(request.getBundle(), fileName);
        }

        // 保存版本信息到数据库
        Version version = new Version();
        version.setAppName(request.getAppName());
        version.setPlatform(request.getPlatform());
        version.setVersion(request.getVersion());
        version.setBundleFilename(versionPath != null ? versionPath : fileUrl);
        version.setBundlePath(versionPath);
        version.setFileSize(request.getBundle().getSize());
        version.setUpdateType(request.getUpdateType());
        version.setDescription(request.getDescription());
        version.setMinAppVersion(request.getMinAppVersion());
        version.setDownloadUrl(fileUrl);
        version.setUploadTime(LocalDateTime.now());
        version.setUpdateTime(LocalDateTime.now());

        versionMapper.insert(version);

        return version;
    }

    @Override
    public Version checkUpdate(String appName, String platform, String currentVersion) {
        // 查询最新版本
        Version latestVersion = getLatestVersion(appName, platform);

        if (latestVersion == null) {
            return null;
        }

        // 使用 ComparableVersion 比较版本号
        ComparableVersion currentVer = new ComparableVersion(currentVersion);
        ComparableVersion latestVer = new ComparableVersion(latestVersion.getVersion());

        if (latestVer.compareTo(currentVer) <= 0) {
            return null; // 当前版本已是最新或更新
        }

        // 检查是否满足最低版本要求
        if (latestVersion.getMinAppVersion() != null
                && !latestVersion.getMinAppVersion().isEmpty()
                && currentVersion.compareTo(latestVersion.getMinAppVersion()) < 0) {
            // 当前版本低于最低要求，强制全量更新
            latestVersion.setUpdateType("full");
        }

        return latestVersion;
    }

    @Override
    public Version getLatestVersion(String appName, String platform) {
        LambdaQueryWrapper<Version> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Version::getAppName, appName)
                .eq(Version::getPlatform, platform);

        List<Version> versions = versionMapper.selectList(wrapper);

        if (versions == null || versions.isEmpty()) {
            return null;
        }

        // 按版本号比较，返回最新的（使用 Maven 的 ComparableVersion）
        return versions.stream()
                .max((v1, v2) -> new ComparableVersion(v1.getVersion())
                        .compareTo(new ComparableVersion(v2.getVersion())))
                .orElse(null);
    }

    @Override
    public List<Version> listVersions() {
        return versionMapper.selectList(null);
    }

    @Override
    public Page<Version> pageVersions(Integer pageNum, Integer pageSize, String appName, String platform) {
        Page<Version> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Version> wrapper = new LambdaQueryWrapper<>();

        // 根据条件过滤
        if (StringUtils.hasText(appName)) {
            wrapper.eq(Version::getAppName, appName);
        }
        if (StringUtils.hasText(platform)) {
            wrapper.eq(Version::getPlatform, platform);
        }

        // 按上传时间倒序
        wrapper.orderByDesc(Version::getUploadTime);

        return versionMapper.selectPage(page, wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteVersion(String appName, String platform, String version) throws Exception {
        // 查询版本信息
        LambdaQueryWrapper<Version> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Version::getAppName, appName)
                .eq(Version::getPlatform, platform)
                .eq(Version::getVersion, version);

        Version versionEntity = versionMapper.selectOne(wrapper);
        if (versionEntity == null) {
            throw new Exception("版本不存在");
        }

        // 删除 MinIO 中的文件
        try {
            minioService.deleteFile(versionEntity.getBundleFilename());
        } catch (Exception e) {
            log.warn("删除 MinIO 文件失败，继续删除数据库记录: {}", e.getMessage());
        }

        if (StringUtils.hasText(versionEntity.getBundlePath())) {
            try {
                minioService.deleteDirectory(versionEntity.getBundlePath());
            } catch (Exception e) {
                log.warn("删除 MinIO 目录失败: {}", e.getMessage());
            }
        }

        // 删除数据库记录
        versionMapper.deleteById(versionEntity.getId());
    }
}
