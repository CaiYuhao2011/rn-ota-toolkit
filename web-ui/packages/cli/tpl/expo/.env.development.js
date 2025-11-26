const HOST = '10.1.3.126';

const config = {
  // 开发环境配置
  VITE_APP_ENV: 'development',
  // 开发环境
  VITE_APP_BASE_API: `http://${HOST}:8080`,
  VITE_OTA_BASE_API: `http://${HOST}:10080`,
  VITE_APP_WS: `ws:${HOST}:8080`,
  VITE_APP_WEBVIEW_BASE_URL: `http://${HOST}`,
  // 接口加密功能开关(如需关闭 后端也必须对应关闭)
  VITE_APP_ENCRYPT: true,
  // 接口加密传输 RSA 公钥与后端解密私钥对应 如更换需前后端一同更换
  VITE_APP_RSA_PUBLIC_KEY:
    'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKoR8mX0rGKLqzcWmOzbfj64K8ZIgOdHnzkXSOVOZbFu/TJhZ7rFAN+eaGkl3C4buccQd/EjEsj9ir7ijT7h96MCAwEAAQ==',
  // 接口响应解密 RSA 私钥与后端加密公钥对应 如更换需前后端一同更换
  VITE_APP_RSA_PRIVATE_KEY:
    'MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAmc3CuPiGL/LcIIm7zryCEIbl1SPzBkr75E2VMtxegyZ1lYRD+7TZGAPkvIsBcaMs6Nsy0L78n2qh+lIZMpLH8wIDAQABAkEAk82Mhz0tlv6IVCyIcw/s3f0E+WLmtPFyR9/WtV3Y5aaejUkU60JpX4m5xNR2VaqOLTZAYjW8Wy0aXr3zYIhhQQIhAMfqR9oFdYw1J9SsNc+CrhugAvKTi0+BF6VoL6psWhvbAiEAxPPNTmrkmrXwdm/pQQu3UOQmc2vCZ5tiKpW10CgJi8kCIFGkL6utxw93Ncj4exE/gPLvKcT+1Emnoox+O9kRXss5AiAMtYLJDaLEzPrAWcZeeSgSIzbL+ecokmFKSDDcRske6QIgSMkHedwND1olF8vlKsJUGK3BcdtM8w4Xq7BpSBwsloE=',
  // 客户端id
  VITE_APP_CLIENT_ID: 'd4147ad199e5cfb6e90b07a58cd24066',
  // websocket 开关 默认使用sse推送
  VITE_APP_WEBSOCKET: true,
  // sse 开关
  VITE_APP_SSE: false,
};

const fs = require('fs');
const path = require('path');

// 读取 app.json 更新 updates.url
const appJsonPath = path.resolve(__dirname, './app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
appJson.expo.updates.enabled = true;
appJson.expo.updates.url = `${config.VITE_OTA_BASE_API}/ota/manifest`;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf-8');

const configFile = path.resolve(__dirname, './utils/config.ts');
fs.writeFileSync(
  configFile,
  `export const HOST = '${HOST}';\nexport default ${JSON.stringify(
    config,
    null,
    2,
  )};`,
  'utf-8',
);
