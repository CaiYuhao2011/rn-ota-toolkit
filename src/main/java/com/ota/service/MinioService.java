package com.ota.service;

import io.minio.GetObjectResponse;
import io.minio.StatObjectResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MinioService {
    String getEndpoint();

    String getBucketName();

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

    /**
     * 上传文件夹中的所有文件到MinIO
     *
     * @param basePath 基础路径
     * @param bundle   压缩文件
     * @return 文件夹访问URL
     */
    String uploadExtractedFiles(String basePath, MultipartFile bundle) throws Exception;

    /**
     * 读取 MinIO 中的文件内容
     *
     * @param fileName 文件名
     * @return 文件输入流
     */
    GetObjectResponse readFile(String fileName) throws Exception;

    /**
     * 获取文件状态
     *
     * @param fileName 文件名
     * @return 文件状态
     */
    StatObjectResponse statFile(String fileName) throws Exception;

    /**
     * 列出指定前缀下的一级目录名称
     *
     * @param prefix 前缀
     * @return 目录名称列表
     */
    List<String> listDirectories(String prefix) throws Exception;

    /**
     * 判断对象是否存在
     *
     * @param objectName 对象名称
     * @return 是否存在
     */
    boolean exists(String objectName);

    /**
     * 删除指定前缀下的所有对象
     *
     * @param prefix 前缀
     */
    void deleteDirectory(String prefix) throws Exception;
}