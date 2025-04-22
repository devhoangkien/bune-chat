import type { OsType, Platform } from "@tauri-apps/plugin-os";
import type { Update } from "@tauri-apps/plugin-updater";
import type { Action } from "element-plus";
import type { ExtendItem } from "~/components/menu/extension";
import type { SystemConstantVO } from "~/init/system";
import { appDataDir } from "@tauri-apps/api/path";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { disable as disableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { filename as windowStateFilename } from "@tauri-apps/plugin-window-state";
import { acceptHMRUpdate, defineStore } from "pinia";

/**
 * 默认呼叫铃声
 */
export const DEFAULT_RTC_CALL_BELL_URL = "/sound/bell.mp3";
export enum NotificationEnums {
  SYSTEM = "system",
  TRAY = "tray",
  CLOSE = "close",
}

// @unocss-include
// https://pinia.web3doc.top/ssr/nuxt.html#%E5%AE%89%E8%A3%85
export const useSettingStore = defineStore(
  SETTING_STORE_KEY,
  () => {
    const sysPermission = ref({
      isNotification: false,
      isNotificationSound: true,
    });
    const appUploader = ref({
      isCheckUpdatateLoad: false,
      isUpdating: false,
      isUpload: false,
      version: "",
      newVersion: "",
      contentLength: 0,
      downloaded: 0,
      downloadedText: "",
      ignoreVersion: [] as string[],
    });
    const appPlatform = ref<Platform | "web">("web");
    const osType = ref<OsType | "web">("web");
    const isWeb = computed(() => appPlatform.value === "web");
    // 用户页折叠
    const isUserFold = ref(true);
    const isUserCollapse = ref(true);
    // 主页页折叠
    const isCollapse = ref(true);// 侧边栏折叠
    // 设备状态
    const isMobileSize = ref(false);// 是否移动尺寸
    const isOpenContactSearch = ref(true); // 是否会话搜索
    const isUseWebsocket = ref(true); // 是否使用 websocket
    const isDesktop = computed(() => ["windows", "linux", "macos"].includes(osType.value));
    const isMobile = computed(() => ["android", "ios"].includes(osType.value));
    // --------------------- 系统环境常量 -----------------
    const systemConstant = ref<SystemConstantVO>({
      ossInfo: {
        image: {
          type: "image",
          path: "image/",
          code: 0,
          timeOut: 2400,
          fileSize: 3145728, // 3M
          fileType: "image/*",
        },
        file: {
          type: "file",
          path: "file/",
          code: 2,
          timeOut: 12000,
          fileSize: 52428800, // 50M
          fileType: "text/plain;application/vnd.ms-excel;application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;application/octet-stream;application/vnd.ms-powerpoint;application/pdf;application/x-pdf;application/x-bzpdf;application/x-gzpdf;application/vnd.openxmlformats-officedocument.presentationml.presentation;application/msword;application/vnd.openxmlformats-officedocument.wordprocessingml.document;",
        },
        video: {
          type: "video",
          path: "video/",
          code: 1,
          timeOut: 2400,
          fileSize: 20971520, // 20M
          fileType: "mp4/*",
        },
        audio: {
          type: "audio",
          path: "audio/",
          code: 4,
          timeOut: 2400,
          fileSize: 10485760, // 10M
          fileType: "audio/mp3;audio/x-mpeg;audio/mpeg;audio/webm;audio/wav;video/webm;",
        },
        font: {
          type: "font",
          path: "font/",
          code: 3,
          timeOut: 2400,
          fileSize: 12582912,
          fileType: "font/*",
        },
      },
    });
    // ---------------------菜单-----------------
    const selectExtendMenuList = ref<ExtendItem[]>([]);
    // ---------------------设置-----------------
    const settingPage = ref({
      // 字体
      fontFamily: {
        value: "Alimama",
        list: [] as { name: string; value: string }[],
      },
      fontSize: {
        value: 16,
        list: [
          { name: "小", value: 12 },
          { name: "中", value: 14 },
          { name: "默认", value: 16 },
          { name: "超大", value: 18 },
        ],
      },
      modeToggle: {
        value: "system",
        list: [
          { name: "系统", value: "system" },
          { name: "日间", value: "light" },
          { name: "夜间", value: "dark" },
        ],
      },
      // 翻译
      translation: {
        value: 1,
        targetLang: "zh" as TranslationEnums,
        stream: false,
        list: [] as TranslationToolVO[],
      },
      isAutoStart: false, // 开机自启
      isCloseAllTransition: false, // 是否关闭所有动画效果，包括页面切换动画和组件动画。
      isEscMin: true, // esc
      notificationType: NotificationEnums.TRAY as NotificationEnums, // 托盘通知
      rtcCallBellUrl: DEFAULT_RTC_CALL_BELL_URL as string, // 呼叫铃声
    });
    const translationTool = computed(() => settingPage.value.translation.list.find(item => item.value === settingPage.value.translation.value));
    const isDefaultRtcCallBell = computed(() => settingPage.value.rtcCallBellUrl === DEFAULT_RTC_CALL_BELL_URL);
    const isChatFold = ref(false);
    const isThemeChangeLoad = ref(false);

    // --------------------- 右键菜单 -----------------
    const colorMode = useColorMode();
    const contextMenuTheme = computed(() => colorMode.value === "dark" ? "mac dark" : "mac");

    // --------------------- 聊天设置 -----------------
    const isOpenGroupMember = ref(true); // 是否打开 群聊成员菜单列表
    const showChatMenu = ref(true);
    const downUpChangeContact = ref(true); // 向上向下切换联系人列表
    async function checkMainWinVisible() {
      try {
        if (isWeb.value) {
          return true;
        }
        const wind = await WebviewWindow.getByLabel(MAIN_WINDOW_LABEL);
        if (!wind)
          return true;
        return wind.isFocused();
      }
      catch (e) {
        return true;
      }
    };

    // ---------------------- 下载管理 -----------------
    const BaseDirCode = BaseDirectory.AppData;
    const showDownloadPanel = ref(false);
    const fileDownloadMap = ref<Record<string, FileItem>>({});
    const fileDownloadList = computed(() => Object.values(fileDownloadMap.value).sort((a, b) => b.downloadTime - a.downloadTime));
    const appDataDownloadDirUrl = ref("");

    // 下载文件回调
    function fileDownProgressCallback(url: string, currentSize: number = 0, totalSize: number = 0, status: FileStatus = FileStatus.DOWNLOADING) {
      const item = fileDownloadMap.value[url];
      if (!item)
        return;
      item.currentSize = currentSize;
      item.totalSize = totalSize;
      item.status = status;
      if (currentSize >= totalSize)
        item.status = FileStatus.DOWNLOADED;
    }

    // 删除文件
    async function deleteDownloadFile(item: FileItem, checked: boolean = true) {
      const file = fileDownloadMap.value?.[item.url];
      if (!file)
        return;
      if (file.status === FileStatus.NOT_FOUND) {
        delete fileDownloadMap.value[item.url];
        return;
      }
      try {
        // 是否存在
        const isExists = await existsFile(file.localPath);
        if (checked && !isExists) {
          ElMessage.warning("文件已不存在，请重新删除记录！");
          file.status = FileStatus.NOT_FOUND;
          return;
        }
        await removeFile(item.localPath);
        delete fileDownloadMap.value[item.url];
      }
      catch (error) {
        console.warn(error);
        if (checked)
          ElMessage.warning("文件已打开，请关闭后再尝试删除！");
      }
    }

    // 打开文件
    async function openFileByDefaultApp(item: FileItem) {
      if (!item.mimeType)
        return;
      if (item.status === FileStatus.DOWNLOADING)
        return;
      // 是否存在
      const isExists = await existsFile(item.localPath);
      if (!item.localPath || !isExists) {
        ElMessage.warning("文件已不存在，请重新删除记录！");
        item.status = FileStatus.NOT_FOUND;
        return;
      }
      try {
        await openPath(item.localPath);
      }
      catch (error) {
        console.warn(error);
        item.status = FileStatus.ERROR;
        ElMessage.error("打开文件失败！");
      }
    }

    // 确认下载文件
    async function checkDownloadPath() {
      if (!appDataDownloadDirUrl.value) {
        await changeDownloadDir();
        return;
      }
      if (!await existsFile(appDataDownloadDirUrl.value))
        await mkdirFile(appDataDownloadDirUrl.value);
    }

    // 切换下载目录
    async function changeDownloadDir() {
      const setting = useSettingStore();
      const path = await openDialog({
        multiple: false,
        directory: !!setting.isDesktop, // 仅桌面端支持选择文件夹
      });
      if (!path)
        return;
      if (!await existsFile(path)) {
        ElMessage.error("选择路径不存在，请重新选择！");
        return;
      }
      appDataDownloadDirUrl.value = computedPath(setting.isDesktop ? path : path.split("\\").slice(0, -1).join("\\")); // 兼容移动端
      ElMessage.success("下载路径已更改！");
      return appDataDownloadDirUrl.value;
    }

    // 打开文件所在文件夹
    async function openFileFolder(item: FileItem) {
      if (!item.localPath) {
        ElMessage.error("文件不存在！");
        item.status = FileStatus.NOT_FOUND;
        return;
      }
      // 去除文件名
      const folderPath = computedPath(item.localPath.split("\\").slice(0, -1).join("\\"));
      try {
        if (!await existsFile(folderPath)) {
          ElMessage.error("文件夹不存在！");
          return;
        }
        openPath(folderPath);
      }
      catch (error) {
        console.warn(error);
        ElMessage.error("打开文件夹失败！");
      }
    }
    /**
     * 检查更新
     * @returns 是否更新
     */
    async function checkUpdates(checkLog = false, {
      handleUploadInfo,
      handleOnUpload,
    }: {
      handleUploadInfo?: (update: Update) => void,
      handleOnUpload?: (update: Update) => void,
    } = {

    }) {
      appUploader.value.isCheckUpdatateLoad = true;
      try {
        if (isWeb.value || isMobile.value)
          return false;
        const update = (await check()) as Update;
        if (!update) {
          handleUploadInfo && handleUploadInfo(update);
        }
        appUploader.value.isUpload = !!update?.available;
        appUploader.value.isCheckUpdatateLoad = false;
        if (!appUploader.value.isUpload || !update.version) {
          appUploader.value.isCheckUpdatateLoad = false;
          appUploader.value.isUpdating = false;
          appUploader.value.isUpload = false;
          const route = useRoute();
          if (route.path.includes("/setting") && checkLog)
            ElMessage.info("当前版本已是最新版本！");
          return false;
        }
        appUploader.value.newVersion = update?.version; // 新版本号
        // 检查是否忽略当前版本
        if (!checkLog && appUploader.value.ignoreVersion.includes(update.version))
          return false;
        await ElMessageBox.confirm("检测到新版本，是否更新？", `版本 ${update.version}`, {
          confirmButtonText: "确定",
          cancelButtonText: "忽略此版本",
          center: true,
          callback: async (action: Action) => {
            if (action === "confirm") {
              handleOnUpload && handleOnUpload(update);
              appUploader.value.isUpdating = true;
              try {
                appUploader.value.contentLength = 0;
                appUploader.value.downloaded = 0;
                await update
                  .download((e) => {
                    switch (e.event) {
                      case "Started":
                        appUploader.value.contentLength = e.data.contentLength || 0;
                        appUploader.value.downloaded = 0;
                        appUploader.value.downloadedText = "";
                        console.log(`开始下载，长度 ${e.data.contentLength} bytes`);
                        break;
                      case "Progress":
                        appUploader.value.downloaded += e.data.chunkLength || 0;
                        appUploader.value.downloadedText = `${((appUploader.value.downloaded || 0) / 1024 / 1024).toFixed(2)}MB / ${((appUploader.value.contentLength || 0) / 1024 / 1024).toFixed(2)}MB`;
                        console.log(`下载中 ${appUploader.value.downloadedText}`);
                        break;
                      case "Finished":
                        appUploader.value.downloadedText = "安装中...";
                        break;
                    }
                  })
                  .finally(() => {
                    appUploader.value.isUpload = false;
                    appUploader.value.isCheckUpdatateLoad = false;
                    appUploader.value.newVersion = "";
                  });
                // 安装中
                appUploader.value.downloadedText = "安装中...";
                setTimeout(() => {
                  update.install().catch((err) => {
                    appUploader.value.isUpdating = false;
                    console.warn(err);
                    ElMessage.error("安装失败，请稍后再试！");
                    appUploader.value.isCheckUpdatateLoad = false;
                  }).finally(() => {
                    appUploader.value.downloaded = 0;
                    appUploader.value.contentLength = 0;
                    appUploader.value.isUpdating = false;
                  });
                }, 1000);
              }
              catch (error) {
                console.log(error);
                ElMessage.error("更新失败！请检查网络或稍后再试！");
                appUploader.value.isCheckUpdatateLoad = false;
                appUploader.value.isUpload = false;
                appUploader.value.isCheckUpdatateLoad = false;
                appUploader.value.isUpdating = false;
                appUploader.value.downloaded = 0;
                appUploader.value.downloadedText = "";
                appUploader.value.contentLength = 0;
                appUploader.value.newVersion = "";
              }
            }
            else if (action === "cancel") {
              if (!appUploader.value.ignoreVersion.includes(update.version))
                appUploader.value.ignoreVersion.push(update.version);
            }
          },
        });
      }
      catch (error) {
        console.warn(error);
        appUploader.value.isCheckUpdatateLoad = false;
        appUploader.value.isUpload = false;
        appUploader.value.isCheckUpdatateLoad = false;
        appUploader.value.isUpdating = false;
        appUploader.value.downloaded = 0;
        appUploader.value.downloadedText = "";
        appUploader.value.contentLength = 0;
      }
    }

    async function loadSystemFonts() {
      settingPage.value.fontFamily.list = [
        { name: "阿里妈妈方圆体", value: "Alimama" },
        { name: "字玩哥特黑白无常体", value: "ZiWanGeTe" },
        { name: "阿里健康体2.0", value: "AlibabaHealthFont2" },
        { name: "阿里妈妈刀隶体", value: "AlimamaDaoLiTi" },
        { name: "阿里妈妈东方大楷", value: "Alimama_DongFangDaKai" },
      ];
      // @ts-expect-error
      if (window.queryLocalFonts) {
        try {
          // @ts-expect-error
          const availableFonts = await window.queryLocalFonts();
          // 获取前20个可用字体
          const fontsMap = {} as { [key: string]: { name: string; value: string } };
          availableFonts.forEach((font: any) => {
            if (fontsMap[font.family])
              return;
            fontsMap[font.family] = {
              name: font.family,
              value: font.family,
            };
          });
          settingPage.value.fontFamily.list = [...settingPage.value.fontFamily.list, ...Object.values(fontsMap)];
        }
        catch (err) {
          console.error(err);
        }
      }
    }


    /**
     * 加载设置预设数据
     */
    function loadSettingPreData() {
      // 在组件挂载时获取翻译工具列表
      fetchTranslationTools();
    }
    // 获取翻译工具列表
    async function fetchTranslationTools() {
      try {
        const user = useUserStore(); // 假设有一个 user store 提供 token
        const token = user.getToken; // 获取用户 token
        const res = await getTranslationToolList(token);
        if (res.code === StatusCode.SUCCESS) {
          settingPage.value.translation.list = res.data;
        }
      }
      catch (error) {
        console.error("获取翻译工具列表错误:", error);
      }
    }

    /**
     * 重置设置
     */
    async function reset() {
      settingPage.value.fontFamily.value = "Alimama";
      settingPage.value.modeToggle.value = "system";
      settingPage.value.isCloseAllTransition = false;
      settingPage.value.isEscMin = true;
      isChatFold.value = false;
      isOpenGroupMember.value = true;
      showChatMenu.value = true;
      isThemeChangeLoad.value = false;
      isUseWebsocket.value = true;
      appUploader.value = {
        isCheckUpdatateLoad: false,
        isUpdating: false,
        isUpload: false,
        version: "",
        newVersion: "",
        contentLength: 0,
        downloaded: 0,
        downloadedText: "",
        ignoreVersion: [] as string[],
      };
      isCollapse.value = true;
      isUserFold.value = true;
      isOpenContactSearch.value = true;
      isUserCollapse.value = true;
      // 下载管理
      showDownloadPanel.value = false;
      sysPermission.value = {
        isNotification: false,
        isNotificationSound: true,
      };
      settingPage.value = {
        // 字体
        fontFamily: {
          value: "Alimama",
          list: [],
        },
        fontSize: {
          value: 16,
          list: [
            { name: "小", value: 12 },
            { name: "中", value: 14 },
            { name: "默认", value: 16 },
            { name: "超大", value: 18 },
          ],
        },
        modeToggle: {
          value: "system",
          list: [
            { name: "系统", value: "system" },
            { name: "日间", value: "light" },
            { name: "夜间", value: "dark" },
          ],
        },
        // 翻译
        translation: {
          value: 1,
          targetLang: "zh" as TranslationEnums,
          stream: false,
          list: [],
        },
        isAutoStart: settingPage.value.isAutoStart, // 开机自启
        isCloseAllTransition: false, // 是否关闭所有动画效果，包括页面切换动画和组件动画。
        isEscMin: true, // esc
        notificationType: isWeb.value ? NotificationEnums.SYSTEM : NotificationEnums.TRAY, // 托盘通知
        rtcCallBellUrl: DEFAULT_RTC_CALL_BELL_URL, // 呼叫铃声铃声
      };
      selectExtendMenuList.value = [];
      fileDownloadMap.value = {};
      appDataDownloadDirUrl.value = "";
      downUpChangeContact.value = true;
      loadSystemFonts();
      if (!isWeb.value) {
        await nextTick();
        await resetAllWindow();
        appDataDownloadDirUrl.value = `${await appDataDir()}\\downloads`;
        if (appDataDownloadDirUrl.value && !await existsFile(appDataDownloadDirUrl.value))
          await mkdirFile(appDataDownloadDirUrl.value);
        setTimeout(async () => { // 延迟300ms，防止闪屏
          if (isDesktop.value)
            await relaunch();
          else
            window?.location?.reload?.();
        }, 300);
      }
    }

    // 重置所有窗口状态
    async function resetAllWindow() {
      if (isWeb.value || !isDesktop.value)
        return false;

      try {
        // 自动重启
        if (await isAutostartEnabled())
          await disableAutostart();
        // 窗口状态
        const file = await windowStateFilename();
        if (file)
          await removeFile(`${await appDataDir()}\\${file}`);
        return true;
      }
      catch (error) {
        console.error(error);
        return false;
      }
    }

    return {
      isMobileSize,
      isOpenContactSearch,
      isDesktop,
      isMobile,
      isChatFold,
      // state
      isCollapse,
      isOpenGroupMember,
      contextMenuTheme,
      isUserCollapse,
      isUserFold,
      sysPermission,
      settingPage,
      isThemeChangeLoad,
      appUploader,
      showChatMenu,
      downUpChangeContact,
      showDownloadPanel,
      fileDownloadMap,
      fileDownloadList,
      appPlatform,
      systemConstant,
      translationTool,
      appDataDownloadDirUrl,
      BaseDirCode,
      osType,
      isUseWebsocket,
      isWeb,
      isDefaultRtcCallBell,
      selectExtendMenuList,
      // actions
      checkUpdates,
      checkMainWinVisible,
      loadSystemFonts,
      loadSettingPreData,
      reset,
      fileDownProgressCallback,
      openFileByDefaultApp,
      deleteDownloadFile,
      openFileFolder,
      changeDownloadDir,
      checkDownloadPath,
      // getter
    };
  },
  {
    // https://prazdevs.github.io/pinia-plugin-persistedstate/frameworks/nuxt-3.html
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
    },
  },
);
if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useSettingStore, import.meta.hot));
