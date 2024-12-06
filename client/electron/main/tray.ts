import { BrowserWindow, ipcMain, nativeImage, session, Tray, shell } from "electron";
import path from "node:path";
import { Menu } from "electron";
import { stopCapture, startCapture } from "./record";
import { app } from "electron";
import { preload, indexHtml, VITE_DEV_SERVER_URL } from "./index";
import { writeConfig, readConfig } from "./config";

let tray: Tray | null = null; // 添加托盘变量

// 添加设置窗口的引用
let settingsWindow: BrowserWindow | null = null;

// 创建托盘
export function createTray() {
  let iconPath = process.platform === "win32" 
    ? "logo.png" 
    : "time_box_icon.png";

  let icon = nativeImage.createFromPath(
    path.join(process.env.VITE_PUBLIC, iconPath)
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
  tray.setToolTip("Timebox");
  updateTrayMenu(false);

  tray.on("click", () => {
    // 点击托盘图标不显示主窗口
  });
}

// 更新托盘菜单
export function updateTrayMenu(isCapturing: boolean) {
  const config = readConfig();
  const serverUrl = config.serverUrl?.trim();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Timebox",
      enabled: !!serverUrl,
      click: () => {
        shell.openExternal(serverUrl || 'http://localhost:3000');
      },
    },
    {
      label: isCapturing ? "停止记录" : "开始记录",
      click: isCapturing ? stopCapture : startCapture,
    },
    {
      label: "设置",
      click: createSettingsWindow,
    },
    {
      label: "退出",
      click: () => {
        stopCapture();
        app.quit();
      },
    },
  ]);
  tray?.setContextMenu(contextMenu);
}

// 创建设置窗口
export function createSettingsWindow() {
  // 如果设置窗口已经存在，则聚焦并返回
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    title: "设置",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
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

  // 监听窗口关闭事件，清除引用
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  if (process.platform === "darwin") {
    app.dock.show();
  }
}


