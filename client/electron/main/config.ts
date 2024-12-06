import { app, ipcMain } from "electron";
import path from "path";
import fs from "fs";

export const baseDir = path.join(app.getPath("home"), ".timebox");
export const defaultScreenshotDir = path.join(baseDir, "screenshots");
export const configPath = path.join(baseDir, "config.json");

let cachedConfig: any = null;

// 定义完整的配置类型
interface Config {
  captureIntervalTime: number; // 截图间隔
  pushIntervalTime: number; // 推送间隔
  similarityThreshold: number; // 相似度阈值
  maxImagesPerPush: number; // 每次推送的最大截图数量
  screenshotDir: string; // 截图目录
  serverUrl: string; // 服务器URL
  username: string; // 用户名
  password: string;
}

// 读取配置
export function readConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }
  if (fs.existsSync(configPath)) {
    const data = fs.readFileSync(configPath, "utf-8");
    cachedConfig = JSON.parse(data);
  } else {
    cachedConfig = {
      serverUrl: "",
      username: "",
      password: "",
      captureIntervalTime: 5000, // 截图间隔
      maxImagesPerPush: 5, // 每次推送的最大截图数量
      pushIntervalTime: 10000, // 推送间隔
      similarityThreshold: 96, // 相似度阈值
      screenshotDir: defaultScreenshotDir,
    }; // 默认值
  }
  return cachedConfig;
}

// 写入配置
export function writeConfig(config: Partial<Config>) {
  const newConfig = { ...cachedConfig, ...config };
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  console.log("写入配置成功", newConfig);
  cachedConfig = newConfig; // 更新缓存
}

ipcMain.handle("writeConfig", async (event, config) => {
  // const cookies = await session.defaultSession.cookies.get({});
  // console.log(cookies);
  writeConfig(config);
});

ipcMain.handle("readConfig", async () => {
  // 假设配置存储在某个地方，可以从文件或数据库中读取
  const config = readConfig(); // 需要实现 readConfig 方法
  return config;
});
