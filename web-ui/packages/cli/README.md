# rn-ota-cli

React Native OTA 命令行工具。

## 安装

```bash
npm install -g rn-ota-cli
```

## 配置

在项目根目录创建 `.ota.config.json`：

```json
{
  "server": "http://192.168.1.100:10080",
  "appName": "MyApp"
}
```

## 命令

### build - 构建

```bash
rn-ota build --platform android
rn-ota build --platform ios
```

输出：`build/bundle-{platform}.zip`

### upload - 上传

```bash
rn-ota upload \
  --file build/bundle-android.zip \
  --app MyApp \
  --platform android \
  --version 1.0.1
```

### deploy - 一键部署

```bash
# 构建 + 上传
rn-ota deploy --platform android

# 指定版本
rn-ota deploy --platform android --version 1.0.1

# 自动递增版本
rn-ota deploy --platform android --auto-version
```

### list - 查看版本

```bash
rn-ota list --app MyApp
```

### delete - 删除版本

```bash
rn-ota delete --app MyApp --version 1.0.1 --platform android
```

## 完成

使用 CLI 工具快速构建和部署 OTA 更新。
