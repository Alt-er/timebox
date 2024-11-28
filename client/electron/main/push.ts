import { readConfig } from "./config";
import fs from "fs";
import path from "path";
import FormData from "form-data"; // 添加这一行
import axios from "axios";
import { session } from "electron";
// 上传截图到远程服务器
async function uploadScreenshot(
  serverUrl: string,
  cookieString: string,
  filePath: string
) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

  try {
    const response = await axios.post(
      `${serverUrl}/timebox/api/image/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Cookie: cookieString,
        },
      }
    );
    if (response.data.status === 200) {
      // 上传成功后删除图片
      fs.unlinkSync(filePath);
    } else {
      console.error("文件上传失败:", response.data);
    }
  } catch (error) {
    console.error("文件上传失败:", error);
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
  const config = readConfig();
  
  async function schedulePush() {
    try {
      await pushImages();
    } catch (error) {
      console.error('推送图片时发生错误:', error);
    } finally {
      setTimeout(schedulePush, config.pushIntervalTime);  // 无论成功失败都继续调度
    }
  }

  schedulePush();  // 开始第一次执行
}
