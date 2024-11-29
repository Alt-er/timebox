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
import { imageHash } from "image-hash";

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
    async function scheduleCapture() {
      try {
        await record();
      } catch (error) {
        console.error('截图时发生错误:', error);
      } finally {
        captureInterval = setTimeout(scheduleCapture, readConfig().captureIntervalTime);
      }
    }

    scheduleCapture(); // 开始第一次执行
    console.log("开始定时截图");
    updateTrayMenu(true);
  }
}

// 停止记录
export function stopCapture() {
  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
    console.log("停止定时截图");
    updateTrayMenu(false);
  }
}

// 设置截图间隔时间 不需要了, 修改间隔变成实时触发了
// export function resetCaptureIntervalTime() {
//   if (captureInterval) {
//     stopCapture();
//     startCapture();
//   }
// }


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

  // 待推送截屏目录
  const screenshotDir = readConfig().screenshotDir;

  // 临时文件处理目录
  const tempScreenshotDir = path.join(screenshotDir, "temp");

  // 确保目录存在
  if (!fs.existsSync(tempScreenshotDir)) {
    fs.mkdirSync(tempScreenshotDir, { recursive: true });
  }

  // 0- 表示屏幕id ,暂时只支持一个屏幕
  const filename = "0-" + generateTimestampFilename(".webp");
  // 保存为 WebP 格式 并获取到截图的时间
  const finalWebpPath = path.join(screenshotDir, filename);
  const tempWebpPath = path.join(tempScreenshotDir, filename);

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: display.bounds.width * scaleFactor,
      height: display.bounds.height * scaleFactor,
    },
  });

  const windowInfo = await windowInfoPromise;

  for (const source of sources) {
    const image = source.thumbnail.getBitmap();
    const { width, height } = source.thumbnail.getSize();

    // 直接在原数据上调整通道顺序 RGBA => BGRA
    for (let i = 0; i < image.length; i += 4) {
      const r = image[i];
      image[i] = image[i + 2]; // B
      image[i + 2] = r; // R
    }

    const webpStart = Date.now();
    await sharp(image, {
      raw: { width, height, channels: 4 },
    })
      .removeAlpha()
      .webp()
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

    console.log("WebP conversion time:", Date.now() - webpStart, "ms");

    try {
      const binaryHash = await calculateImageHash(tempWebpPath);
      if (!compareRecentScreenshotsAndDelete(binaryHash, tempWebpPath)) {
        recentBinaryHashes.push(binaryHash);
        if (recentBinaryHashes.length > 10) {
          recentBinaryHashes.shift();
        }
        fs.renameSync(tempWebpPath, finalWebpPath);
        console.log("WebP screenshot saved to:", finalWebpPath);
      }
      
    } catch (error) {
      console.error(error);
    }
    break;
  }
  console.log("截图完成，耗时：", Date.now() - now);
}

function compareRecentScreenshotsAndDelete(currentBinary: string, filePath: string) {
  try {
    const maxDistance = currentBinary.length;

    for (let i = recentBinaryHashes.length - 1; i >= 0; i--) {
      const distance = hammingDistance(currentBinary, recentBinaryHashes[i]);
      const similarity = ((1 - distance / maxDistance) * 100).toFixed(2);
      // console.log(`当前截图与第${i + 1}张截图的相似度: ${similarity}%`);
      if (parseFloat(similarity) >= readConfig().similarityThreshold) {
        console.log(`当前截图与第${i + 1}张截图的相似度: ${similarity}%，删除文件: ${filePath}`);
        fs.unlinkSync(filePath);
        return true; // 直接返回，避免重复删除
      }
      break;
    }
  } catch (error) {
    console.error('比较哈希值时出错:', error);
  }
  return false;
}

function calculateImageHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error, data) => {
      if (error) {
        reject("计算哈希值失败: " + error);
      } else if (typeof data !== "string") {
        reject("哈希值格式错误");
      } else {
        resolve(hexToBinary(data));
      }
    });
  });
}

// 修改存储格式为二进制字符串
let recentBinaryHashes: string[] = [];

function hexToBinary(hex: string): string {
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Invalid hexadecimal string");
  }
  return hex
    .split("")
    .map((char) => {
      return parseInt(char, 16).toString(2).padStart(4, "0");
    })
    .join("");
}

// 汉明距离
function hammingDistance(binary1: string, binary2: string): number {
  if (binary1.length !== binary2.length) {
    throw new Error("Binary string lengths must be equal");
  }

  let distance = 0;
  for (let i = 0; i < binary1.length; i++) {
    if (binary1[i] !== binary2[i]) {
      distance++;
    }
  }
  return distance;
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
