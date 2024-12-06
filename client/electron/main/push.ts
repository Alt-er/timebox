import { readConfig } from "./config";
import fs from "fs";
import path from "path";
import FormData from "form-data"; // 添加这一行
import axios, { Axios, AxiosError } from "axios";
import { session, Notification } from "electron";
import { login } from "./auth";
import pkg from "../../package.json";
// 添加错误通知的时间记录
let lastErrorNotificationTime = 0;
const ONE_HOUR = 60 * 60 * 1000; // 1小时的毫秒数

// 上传截图到远程服务器
async function uploadScreenshot(
  serverUrl: string,
  cookieString: string,
  filePath: string
) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

  async function doUpload(currentCookieString: string) {
    const response = await axios.post(
      `${serverUrl}/timebox/api/image/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Cookie: currentCookieString,
          "X-Client-Version": pkg.version,
        },
      }
    );

    if (response.data.status === 200) {
      fs.unlinkSync(filePath);
      //   new Notification({
      //     title: '截图上传成功',
      //     body: path.basename(filePath)
      //   }).show();
      return true;
    }
    throw new Error("上传失败: " + response.data.message);
  }

  try {
    await doUpload(cookieString);
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 401) {
      try {
        // 尝试重新登录
        const config = readConfig();
        await login(config.serverUrl, config.username, config.password);

        // 重新获取 cookies
        const cookies = await session.defaultSession.cookies.get({});
        const newCookieString = cookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; ");

        // 重新发起请求
        await doUpload(newCookieString);
      } catch (retryError) {
        showErrorNotification("重新登录后上传仍然失败");
      }
    } else {
      // 处理其他错误，限制通知频率
      showErrorNotification(
        "上传失败: " + (axiosError.message || axiosError.code || "未知错误")
      );
    }
  }
}

// 添加错误通知函数
function showErrorNotification(message: string) {
  const now = Date.now();
  if (now - lastErrorNotificationTime > ONE_HOUR) {
    new Notification({
      title: "截图上传失败",
      body: message,
    }).show();
    lastErrorNotificationTime = now;
  }
}

async function pushImages() {
  const config = readConfig();
  if (config.serverUrl === "") {
    return;
  }
  const screenshotDir = config.screenshotDir;
  const files = fs.readdirSync(screenshotDir);
  // 只获取webp格式的文件
  const webpFiles = files.filter(
    (file) => path.extname(file).toLowerCase() === ".webp"
  );
  const imagesToPush = webpFiles.slice(0, config.maxImagesPerPush);

  // 获取 cookies
  const cookies = await session.defaultSession.cookies.get({});
  const cookieString = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  await Promise.all(
    imagesToPush.map((image) => {
      const imagePath = path.join(screenshotDir, image);
      return uploadScreenshot(config.serverUrl, cookieString, imagePath);
    })
  );
}

export function startPushInterval() {
  async function schedulePush() {
    try {
      await pushImages();
    } catch (error) {
      console.error("推送图片时发生错误:", error);
    } finally {
      setTimeout(schedulePush, readConfig().pushIntervalTime); // 无论成功失败都继续调度
    }
  }

  schedulePush(); // 开始第一次执行
}
