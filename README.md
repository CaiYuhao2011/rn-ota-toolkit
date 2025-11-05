# OTA Server

React Native OTA 更新服务器，基于 Spring Boot 3 + MyBatis Plus + MinIO 实现。

## 技术栈

- **Java 17**
- **Spring Boot 3.2.0**
- **MyBatis Plus 3.5.5** - 数据库操作
- **MySQL 8.0** - 数据存储
- **MinIO** - 对象存储
- **Docker & Docker Compose** - 容器化部署

## 功能特性

- ✅ 版本上传与管理
- ✅ 自动更新检查
- ✅ 支持增量更新（Bundle）和全量更新（APK/IPA）
- ✅ 支持 Android 和 iOS 双平台
- ✅ 基于 MinIO 的文件存储
- ✅ RESTful API 设计
- ✅ Docker 一键部署

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 启动所有服务（MySQL + MinIO + OTA Server）
docker-compose up -d

# 查看日志
docker-compose logs -f ota-server

# 停止服务
docker-compose down

# 清理所有数据（包括数据库和文件）
docker-compose down -v
```

服务访问地址：
- OTA Server: http://localhost:10080
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
- MySQL: localhost:3306

### 方式二：本地开发

#### 1. 环境准备

- JDK 17+
- Maven 3.6+
- MySQL 8.0+
- MinIO

#### 2. 数据库初始化

```bash
# 创建数据库
mysql -u root -p < src/main/resources/sql/schema.sql
```

#### 3. 配置文件

修改 `src/main/resources/application.yml`：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ota?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
    username: root
    password: your_password

minio:
  endpoint: http://localhost:9000
  access-key: minioadmin
  secret-key: minioadmin
  bucket-name: ota-files
```

#### 4. 启动 MinIO

```bash
# 使用 Docker 启动 MinIO
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# 手动创建 bucket（可选）
# 访问 http://localhost:9001 (minioadmin/minioadmin)
# 在 MinIO Console 中创建 bucket: ota-files
```

#### 5. 运行项目

```bash
# 编译
mvn clean package

# 运行
java -jar target/ota-server-1.0.0.jar

# 或使用 Maven
mvn spring-boot:run
```

## API 文档

### 1. 上传新版本

**接口**: `POST /ota/upload`

**Content-Type**: `multipart/form-data`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bundle | File | 是 | Bundle 文件或 APK/IPA 文件 |
| appName | String | 是 | 应用名称 |
| platform | String | 是 | 平台（android/ios） |
| version | String | 是 | 版本号 |
| updateType | String | 是 | 更新类型（incremental/full） |
| description | String | 否 | 版本描述 |
| minAppVersion | String | 否 | 最低应用版本要求 |

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 1,
    "appName": "MyApp",
    "platform": "android",
    "version": "1.0.1",
    "updateType": "incremental",
    "description": "修复若干问题",
    "bundleUrl": "http://localhost:9000/ota-files/MyApp/android/1.0.1/index.android.bundle",
    "fileSize": 2457600,
    "createTime": "2024-01-01T12:00:00",
    "updateTime": "2024-01-01T12:00:00"
  }
}
```

### 2. 检查更新

**接口**: `GET /ota/check`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appName | String | 是 | 应用名称 |
| platform | String | 是 | 平台（android/ios） |
| version | String | 是 | 当前版本号 |

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 2,
    "appName": "MyApp",
    "platform": "android",
    "version": "1.0.2",
    "updateType": "incremental",
    "description": "新功能上线",
    "bundleUrl": "http://localhost:9000/ota-files/MyApp/android/1.0.2/index.android.bundle",
    "fileSize": 2500000,
    "createTime": "2024-01-02T12:00:00",
    "updateTime": "2024-01-02T12:00:00"
  }
}
```

### 3. 获取最新版本

**接口**: `GET /ota/latest`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appName | String | 是 | 应用名称 |
| platform | String | 是 | 平台（android/ios） |

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 2,
    "appName": "MyApp",
    "platform": "android",
    "version": "1.0.2",
    "updateType": "incremental",
    "description": "新功能上线",
    "bundleUrl": "http://localhost:9000/ota-files/MyApp/android/1.0.2/index.android.bundle",
    "fileSize": 2500000,
    "createTime": "2024-01-02T12:00:00"
  }
}
```

### 4. 获取版本列表

**接口**: `GET /ota/versions`

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功",
  "rows": [
    {
      "id": 1,
      "appName": "MyApp",
      "platform": "android",
      "version": "1.0.1",
      "updateType": "incremental",
      "bundleUrl": "...",
      "createTime": "2024-01-01T12:00:00"
    }
  ],
  "total": 1
}
```

### 5. 删除版本

**接口**: `DELETE /ota/upload/{appName}/{platform}/{version}`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appName | String | 是 | 应用名称（路径参数） |
| platform | String | 是 | 平台（路径参数） |
| version | String | 是 | 版本号（路径参数） |

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 配置说明

### application.yml

```yaml
server:
  port: 10080                          # 服务端口

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ota  # 数据库地址
    username: root                     # 数据库用户名
    password: root                     # 数据库密码
  
  servlet:
    multipart:
      max-file-size: 100MB            # 最大文件大小
      max-request-size: 100MB         # 最大请求大小

minio:
  endpoint: http://localhost:9000     # MinIO 地址
  access-key: minioadmin              # MinIO 访问密钥
  secret-key: minioadmin              # MinIO 密钥
  bucket-name: ota-files              # 存储桶名称
```

## 目录结构

```
ota-server/
├── src/main/java/com/ota/
│   ├── OtaServerApplication.java      # 启动类
│   ├── common/
│   │   └── Result.java                # 统一响应结果
│   ├── controller/
│   │   └── OtaController.java         # OTA 控制器
│   ├── dto/
│   │   └── UploadRequest.java         # 上传请求 DTO
│   ├── entity/
│   │   └── Version.java               # 版本实体
│   ├── mapper/
│   │   └── VersionMapper.java         # 版本 Mapper
│   └── service/
│       ├── MinioService.java          # MinIO 服务接口
│       ├── OtaService.java            # OTA 服务接口
│       └── impl/
│           ├── MinioServiceImpl.java  # MinIO 服务实现
│           └── OtaServiceImpl.java    # OTA 服务实现
├── src/main/resources/
│   ├── application.yml                # 配置文件
│   └── sql/
│       └── schema.sql                 # 数据库初始化脚本
├── Dockerfile                         # Docker 镜像配置
├── docker-compose.yml                 # Docker Compose 配置
├── pom.xml                           # Maven 配置
└── README.md                         # 说明文档
```

## 常见问题

### Q: 如何修改文件大小限制？

A: 修改 `application.yml` 中的 `spring.servlet.multipart.max-file-size` 配置。

### Q: 如何使用外部 MinIO？

A: 修改 `application.yml` 中的 `minio.endpoint`、`access-key`、`secret-key` 配置。

### Q: 如何备份数据？

A: 
```bash
# 备份数据库
docker exec ota-mysql mysqldump -u root -proot ota > ota_backup.sql

# 备份 MinIO 数据（复制 volume）
docker run --rm -v ota_minio-data:/data -v $(pwd):/backup alpine tar czf /backup/minio_backup.tar.gz /data
```

### Q: 如何查看日志？

A:
```bash
# Docker Compose
docker-compose logs -f ota-server

# Docker
docker logs -f ota-server

# 本地开发（日志文件在 logs/ 目录）
tail -f logs/spring.log
```

## License

MIT

