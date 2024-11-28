import { BrowserWindow, ipcMain, nativeImage, session, Tray } from "electron";
import path from "node:path";
import { Menu } from "electron";
import { stopCapture, startCapture } from "./record";
import { app } from "electron";
import { preload, indexHtml, VITE_DEV_SERVER_URL } from "./index";
import { writeConfig } from "./config";

let tray: Tray | null = null; // 添加托盘变量

// 创建托盘
export function createTray() {
  let icon = nativeImage.createFromPath(
    path.join(process.env.VITE_PUBLIC, "time_box_icon.png")
  );

  if (process.platform === "darwin") {
    icon = icon.resize({
      width: 16,
      height: 16,
      quality: "best",
    });
    icon.setTemplateImage(true);
  } else {
    icon = icon.resize({
      width: 16,
      height: 16,
    });
  }
  tray = new Tray(icon);
  tray.setToolTip("您的应用名称");
  updateTrayMenu(false);

  tray.on("click", () => {
    // 点击托盘图标不显示主窗口
  });
}

// 更新托盘菜单
export function updateTrayMenu(isCapturing: boolean) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: isCapturing ? "停止记录" : "开始记录",
      click: isCapturing ? stopCapture : startCapture,
    },
    {
      label: "设置",
      click: createSettingsWindow, // 点击时打开设置窗口
    },
    {
      label: "退出",
      click: () => {
        stopCapture(); // 退出前停止定时截图
        app.quit();
      },
    },
  ]);
  tray?.setContextMenu(contextMenu);
}

// 创建设置窗口
export function createSettingsWindow() {
  

  const settingsWindow = new BrowserWindow({
    // width: 300,
    // height: 200,
    title: "设置",
    webPreferences: {
      preload,
      // nodeIntegration: true,
      // contextIsolation: false,
    },
  });

  
  if (VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${VITE_DEV_SERVER_URL}#/settings`);
  } else {
    settingsWindow.loadFile(indexHtml, { hash: "settings" });
  }
  if (process.platform === "darwin") {
    app.dock.show(); // 显示 Dock 图标
  }
}


