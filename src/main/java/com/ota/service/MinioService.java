package com.ota.service;

import org.springframework.web.multipart.MultipartFile;

public interface MinioService {
    /**
     * 上传文件到 MinIO
     *
     * @param file     文件
     * @param fileName 文件名
     * @return 文件访问URL
     */
    String uploadFile(MultipartFile file, String fileName) throws Exception;

    /**
     * 删除 MinIO 中的文件
     *
     * @param fileName 文件名
     */
    void deleteFile(String fileName) throws Exception;

    /**
     * 获取文件访问URL
     *
     * @param fileName 文件名
     * @return 文件访问URL
     */
    String getFileUrl(String fileName);
}
