package com.ota.service.impl;

import com.ota.service.MinioService;
import io.minio.*;
import io.minio.messages.Item;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

@Slf4j
@Service
public class MinioServiceImpl implements MinioService {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket-name}")
    private String bucketName;

    private MinioClient minioClient;

    @PostConstruct
    public void init() {
        this.minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        log.info("MinIO client initialized with endpoint: {}", endpoint);
    }

    private MinioClient getMinioClient() {
        return minioClient;
    }

    @Override
    public String getEndpoint() {
        return endpoint;
    }

    @Override
    public String getBucketName() {
        return bucketName;
    }

    @Override
    public String uploadFile(MultipartFile file, String fileName) throws Exception {
        try {
            getMinioClient().putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build());
            return getFileUrl(fileName);
        } catch (Exception e) {
            log.error("上传文件到 MinIO 失败: {}", e.getMessage(), e);
            throw new Exception("上传文件失败: " + e.getMessage());
        }
    }

    @Override
    public void deleteFile(String fileName) throws Exception {
        try {
            getMinioClient().removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileName)
                            .build());
        } catch (Exception e) {
            log.error("删除 MinIO 文件失败: {}", e.getMessage(), e);
            throw new Exception("删除文件失败: " + e.getMessage());
        }
    }

    @Override
    public String getFileUrl(String fileName) {
        return endpoint + "/" + bucketName + "/" + fileName;
    }

    @Override
    public StatObjectResponse statFile(String fileName) throws Exception {
        try {
            return getMinioClient().statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileName)
                            .build());
        } catch (Exception e) {
            log.error("获取 MinIO 文件状态失败: {}", e.getMessage(), e);
            throw new Exception("获取文件状态失败: " + e.getMessage());
        }
    }

    @Override
    public List<String> listDirectories(String prefix) throws Exception {
        try {
            Iterable<Result<Item>> results = getMinioClient().listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .prefix(prefix)
                            .recursive(true)
                            .build());
            Set<String> directories = new TreeSet<>();
            for (Result<Item> result : results) {
                Item item = result.get();
                String objectName = item.objectName();
                if (!objectName.startsWith(prefix)) {
                    continue;
                }
                String remainder = objectName.substring(prefix.length());
                if (remainder.isEmpty()) {
                    continue;
                }
                String directoryName = remainder.split("/")[0];
                if (!directoryName.isEmpty()) {
                    directories.add(directoryName);
                }
            }
            return new ArrayList<>(directories);
        } catch (Exception e) {
            log.error("列出 MinIO 目录失败: {}", e.getMessage(), e);
            throw new Exception("列出目录失败: " + e.getMessage());
        }
    }

    @Override
    public boolean exists(String objectName) {
        try {
            getMinioClient().statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void deleteDirectory(String prefix) throws Exception {
        String normalizedPrefix = prefix.endsWith("/") ? prefix : prefix + "/";
        try {
            Iterable<Result<Item>> results = getMinioClient().listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .prefix(normalizedPrefix)
                            .recursive(true)
                            .build());
            for (Result<Item> result : results) {
                Item item = result.get();
                getMinioClient().removeObject(
                        RemoveObjectArgs.builder()
                                .bucket(bucketName)
                                .object(item.objectName())
                                .build());
            }
        } catch (Exception e) {
            log.error("删除目录 {} 失败: {}", prefix, e.getMessage(), e);
            throw new Exception("删除目录失败: " + e.getMessage(), e);
        }
    }

    @Override
    public GetObjectResponse readFile(String fileName) throws Exception {
        try {
            return getMinioClient().getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileName)
                            .build());
        } catch (Exception e) {
            log.error("读取 MinIO 文件失败: {}", e.getMessage(), e);
            throw new Exception("读取文件失败: " + e.getMessage());
        }
    }

    @Override
    public String uploadExtractedFiles(String basePath, MultipartFile bundle) throws Exception {
        // 使用Docker容器中预定义的临时目录
        java.nio.file.Path tempDir = null;

        try {
            // 尝试使用Docker容器中预定义的临时目录
            java.io.File predefinedTempDir = new java.io.File("/home/jiafusz/ota/temp");
            if (predefinedTempDir.exists() && predefinedTempDir.isDirectory()) {
                // 在预定义目录下创建唯一的临时子目录
                tempDir = java.nio.file.Paths.get(predefinedTempDir.getAbsolutePath(),
                        "ota-extract-" + System.currentTimeMillis());
                java.nio.file.Files.createDirectories(tempDir);
                log.debug("使用Docker预定义临时目录: {}", tempDir);
            } else {
                // 如果预定义目录不存在，回退到系统临时目录
                tempDir = java.nio.file.Files.createTempDirectory("ota-extract-");
                log.debug("创建系统临时目录: {}", tempDir);
            }

            // 保存上传的压缩文件到临时目录
            String originalFilename = bundle.getOriginalFilename();
            java.nio.file.Path zipFilePath = tempDir
                    .resolve(originalFilename != null ? originalFilename : "bundle.zip");
            java.nio.file.Files.copy(bundle.getInputStream(), zipFilePath,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // 先上传 zip 文件本身到 MinIO
            String zipObjectName = basePath + "/" + (originalFilename != null ? originalFilename : "bundle.zip");
            try (java.io.FileInputStream fis = new java.io.FileInputStream(zipFilePath.toFile())) {
                getMinioClient().putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(zipObjectName)
                                .stream(fis, zipFilePath.toFile().length(), -1)
                                .contentType("application/zip")
                                .build());
                log.info("已上传 zip 文件: {}", zipObjectName);
            }

            // 解压缩文件
            try (java.util.zip.ZipFile zip = new java.util.zip.ZipFile(zipFilePath.toFile())) {
                java.util.Enumeration<? extends java.util.zip.ZipEntry> entries = zip.entries();

                while (entries.hasMoreElements()) {
                    java.util.zip.ZipEntry entry = entries.nextElement();
                    log.info(entry.getName());
                    java.nio.file.Path entryPath = tempDir.resolve(entry.getName());

                    // 安全检查：防止Zip Slip攻击
                    if (!entryPath.normalize().startsWith(tempDir.normalize())) {
                        throw new SecurityException("压缩文件包含不安全的路径: " + entry.getName());
                    }

                    // 如果是目录，创建目录
                    if (entry.isDirectory()) {
                        java.nio.file.Files.createDirectories(entryPath);
                        continue;
                    }

                    // 确保父目录存在
                    java.nio.file.Path parent = entryPath.getParent();
                    if (parent != null && !java.nio.file.Files.exists(parent)) {
                        java.nio.file.Files.createDirectories(parent);
                    }

                    // 提取文件
                    try (java.io.InputStream is = zip.getInputStream(entry)) {
                        java.nio.file.Files.copy(is, entryPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    }
                }
            }

            // 递归上传所有解压后的文件（排除原始zip文件）
            uploadDirectory(tempDir.toFile(), basePath, originalFilename);

            // 返回 zip 文件的 URL
            return getFileUrl(zipObjectName);
        } catch (Exception e) {
            log.error("解压并上传文件失败: {}", e.getMessage(), e);
            throw new Exception("解压并上传文件失败: " + e.getMessage());
        } finally {
            // 确保清理临时文件
            try {
                if (tempDir != null) {
                    deleteDirectory(tempDir.toFile());
                    log.debug("已清理临时目录: {}", tempDir);
                }
            } catch (Exception e) {
                log.warn("清理临时目录失败: {}", e.getMessage());
            }
        }
    }

    // 注释：getZipFile 方法已整合到 uploadExtractedFiles 中
    // 不再需要单独的 getZipFile 方法

    /**
     * 递归上传目录中的所有文件
     * 
     * @param directory       要上传的目录
     * @param basePath        MinIO中的基础路径
     * @param excludeFilename 要排除的文件名（如原始zip文件）
     */
    private void uploadDirectory(java.io.File directory, String basePath, String excludeFilename) throws Exception {
        java.io.File[] files = directory.listFiles();
        if (files == null)
            return;

        for (java.io.File file : files) {
            // 跳过原始zip文件
            if (file.getName().equals(excludeFilename)) {
                log.debug("跳过原始zip文件: {}", file.getName());
                continue;
            }

            if (file.isDirectory()) {
                uploadDirectory(file, basePath + "/" + file.getName(), excludeFilename);
            } else {
                // 获取相对路径
                String relativePath = file.getAbsolutePath().substring(directory.getAbsolutePath().length());
                if (relativePath.startsWith("/")) {
                    relativePath = relativePath.substring(1);
                }

                // 构建MinIO对象名称
                String objectName = basePath + "/" + relativePath;

                // 上传文件
                try (java.io.FileInputStream fis = new java.io.FileInputStream(file)) {
                    getMinioClient().putObject(
                            PutObjectArgs.builder()
                                    .bucket(bucketName)
                                    .object(objectName)
                                    .stream(fis, file.length(), -1)
                                    .contentType(getContentType(file.getName()))
                                    .build());
                    log.info("已上传文件: {}", objectName);
                }
            }
        }
    }

    /**
     * 根据文件扩展名获取Content-Type
     */
    private String getContentType(String fileName) {
        String extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        return switch (extension) {
            case "js" -> "application/javascript";
            case "css" -> "text/css";
            case "html" -> "text/html";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "svg" -> "image/svg+xml";
            case "json" -> "application/json";
            default -> "application/octet-stream";
        };
    }

    /**
     * 递归删除目录及其内容
     */
    private void deleteDirectory(java.io.File directory) {
        java.io.File[] files = directory.listFiles();
        if (files != null) {
            for (java.io.File file : files) {
                if (file.isDirectory()) {
                    deleteDirectory(file);
                } else {
                    file.delete();
                }
            }
        }
        directory.delete();
    }
}