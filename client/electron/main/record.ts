import { defaultScreenshotDir, readConfig, writeConfig } from "./config";
import fs from "fs";
import path from "node:path";
import sharp from "sharp";
import { screen, desktopCapturer } from "electron";
import { updateTrayMenu } from "./tray";
import FormData from "form-data"; // 添加这一行
import axios from "axios";
let captureInterval: NodeJS.Timeout | null = null; // 定时器变量
import { execSync } from "child_process";
import koffi from "koffi";

// 加载动态库
const lib = koffi.load("oc/libActiveApp.dylib");

// 定义 ActiveAppInfo 结构体
const ActiveAppInfo = koffi.struct("ActiveAppInfo", {
  appName: "char*", // 使用 'char*' 表示 const char*
  windowTitle: "char*", // 使用 'char*' 表示 const char*
});

// 定义函数
const getActiveAppInfo = lib.func("getActiveAppInfo", "ActiveAppInfo", []);

// 获取活动窗口信息的函数
interface WindowInfo {
  appName: string;
  windowTitle: string;
}

async function getActiveWindowInfo(): Promise<WindowInfo> {
  try {
    return new Promise<WindowInfo>((resolve, reject) => {
      getActiveAppInfo.async((err: Error | null, res: WindowInfo) => {
        if (err) {
          resolve({ appName: "", windowTitle: "" });
          return;
        }

        try {
          // 1. 先完成所有字符串转换
          const appName = res.appName ? res.appName.toString() : "";
          const windowTitle = res.windowTitle ? res.windowTitle.toString() : "";

          // 2. 立即释放内存（在确保字符串转换完成后）
          // if (res.appName) koffi.free(res.appName);
          // if (res.windowTitle) koffi.free(res.windowTitle);

          // 3. 返回新的对象
          resolve({ appName, windowTitle });
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("获取活动窗口信息时出错:", error);
    return { appName: "", windowTitle: "" };
  }
}

// 测试打印活动窗口信息和耗时
const startTime = performance.now();
const windowInfo = getActiveWindowInfo();
windowInfo.then((info) => {
  const endTime = performance.now();
  console.log("活动窗口信息:", info);
  console.log("获取窗口信息耗时:", endTime - startTime, "ms");
});

// 开始记录
export function startCapture() {
  if (!captureInterval) {
    captureInterval = setInterval(record, readConfig().captureIntervalTime);
    console.log("开始定时截图");
    updateTrayMenu(true);
  }
}

// 停止记录
export function stopCapture() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
    console.log("停止定时截图");
    updateTrayMenu(false);
  }
}

// 设置截图间隔时间
export function resetCaptureIntervalTime() {
  if (captureInterval) {
    stopCapture();
    startCapture();
  }
}
// 记录
export async function record() {
  await captureScreen();
}

// 生成时间戳格式的文件名
function generateTimestampFilename(extension: string): string {
  const now = new Date();
  const timestamp =
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "-" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  return `${timestamp}${extension}`;
}

// 截图
export async function captureScreen() {
  const now = Date.now();
  let display = screen.getPrimaryDisplay();
  let scaleFactor = display.scaleFactor;

  // 获取活动窗口信息
  const windowInfoPromise = getActiveWindowInfo();

  const screenshotDir = readConfig().screenshotDir;
  // 确保目录存在
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // 保存为 WebP 格式 并获取到截图的时间
  const finalWebpPath = path.join(
    screenshotDir,
    // 0- 表示屏幕id ,暂时只支持一个屏幕
    "0-" + generateTimestampFilename(".webp")
  );

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: display.bounds.width * scaleFactor,
      height: display.bounds.height * scaleFactor,
    },
  });

  const windowInfo = await windowInfoPromise;

  for (const source of sources) {
    const image = source.thumbnail.toBitmap();
    const { width, height } = source.thumbnail.getSize();

    const tempWebpPath = `${finalWebpPath}.temp`;

    const webpStart = Date.now();
    await sharp(image, { raw: { width, height, channels: 4 } })
      .removeAlpha()
      .webp({ quality: 80 })
      .withMetadata({
        exif: {
          IFD0: {
            ImageDescription: JSON.stringify({
              appName: windowInfo.appName,
              windowTitle: windowInfo.windowTitle,
            }),
          },
        },
      })
      .toFile(tempWebpPath);

    fs.renameSync(tempWebpPath, finalWebpPath);

    // 读取测试
    // await readMetadata(finalWebpPath);

    console.log("WebP screenshot saved to:", finalWebpPath);
    console.log("WebP conversion time:", Date.now() - webpStart, "ms");

    break;
  }
  console.log("截图完成，耗时：", Date.now() - now);
}

async function readMetadata(filePath: string) {
  try {
    const metadata = await sharp(filePath).metadata();
    console.log("图片元数据:", metadata);
    console.log("EXIF 数据:", metadata.exif);
  } catch (error) {
    console.error("读取元数据失败:", error);
  }
}
