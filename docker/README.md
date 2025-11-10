# OTA 服务部署说明

## 构建项目

运行构建脚本：

```bash
./build.sh
```

该脚本会：
1. 使用 Maven 编译项目
2. 将生成的 jar 包复制到 docker 目录

## 启动服务

进入 docker 目录并启动服务：

```bash
cd docker
docker-compose up -d
```

## 停止服务

在 docker 目录中运行：

```bash
cd docker
docker-compose down
```