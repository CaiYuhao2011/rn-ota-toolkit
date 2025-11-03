package com.ota.service.impl;

import com.ota.service.MinioService;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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

    private MinioClient getMinioClient() {
        if (minioClient == null) {
            minioClient = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();
        }
        return minioClient;
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
}
