import type { NavigationGuardReturn, RouteLocationNormalized } from "vue-router";
import { type } from "@tauri-apps/plugin-os";

type DialogCleanupFunction = (() => void) | undefined;
type OSType = "windows" | "macos" | "linux" | string;

// 常量定义
const DESKTOP_OS_TYPES: OSType[] = ["windows", "macos", "linux"];
const MAIN_ROUTES: Record<string, number> = {
  "/": 1,
  "/friend": 2,
  "/ai": 3,
  "/user": 4,
  "/setting": 5,
};

// 路由中间件
export default defineNuxtRouteMiddleware((to: RouteLocationNormalized, from: RouteLocationNormalized): NavigationGuardReturn => {
  // 处理对话框和弹窗
  const dialogCleanupFunction = checkAndCleanupDialogs();
  if (dialogCleanupFunction) {
    dialogCleanupFunction();
    return abortNavigation();
  }

  // 设置页面过渡动画
  setPageTransition(to.path, from.path);

  // 特定路径限制
  if (shouldBlockNavigation(to, from)) {
    return abortNavigation(getBlockNavigationMessage(to.path));
  }

  // 桌面端导航逻辑
  if (checkIsDesktop()) {
    return handleDesktopNavigation(to, from);
  }
  // 移动端和Web端导航逻辑
  else {
    return handleMobileWebNavigation(to, from);
  }
});

/**
 * 检查是否应该阻止导航
 */
function shouldBlockNavigation(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): boolean {
  const chat = useChatStore() as any;
  const setting = useSettingStore() as any;

  // 消息页面限制
  if (from.path !== "/msg" && to.path === "/msg") {
    return true;
  }

  // 极物圈商品页限制
  if (to.path.startsWith("/goods/detail")) {
    return true;
  }

  // 移动尺寸特定限制
  if (setting.isMobileSize) {
    // 聊天详情页移动端返回处理
    if (from.path === "/" && to.path !== "/" && !to.query?.dis
      && !chat.isOpenContact && setting.isMobileSize) {
      chat.isOpenContact = true;
      setting.isOpenGroupMember = false;
      return true;
    }

    // 好友面板处理
    if (from.path === "/friend" && to.path !== "/friend"
      && chat.showTheFriendPanel && setting.isMobileSize) {
      chat.showTheFriendPanel = false;
      return true;
    }
  }

  return false;
}

/**
 * 获取阻止导航的提示消息
 */
function getBlockNavigationMessage(path: string): string {
  if (path.startsWith("/goods/detail")) {
    return "请使用「极物圈」查看商品详情";
  }
  return "";
}

/**
 * 处理桌面端导航
 */
function handleDesktopNavigation(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): NavigationGuardReturn {
  const user = useUserStore() as any;

  // 扩展页面权限检查
  if ((!from.path.startsWith("/extend") && to.path.startsWith("/extend"))
    || (to.path.startsWith("/extend") && !user.isLogin)) {
    return abortNavigation();
  }

  // 登录状态路由控制
  if (!user.isLogin) {
    loadLoginWindow();

    // 登录页面导航限制
    if ((from.path !== "/login" && to.path === "/login")
      || (from.path === "/login" && to.path !== "/login")) {
      return abortNavigation();
    }
  }
  else {
    // 已登录用户的登录页面访问限制
    if (from.path !== "/login" && to.path === "/login") {
      return abortNavigation();
    }

    // 从登录页导航逻辑
    if (from.path === "/login") {
      loadMainWindow();
      if (to.path !== "/login") {
        return abortNavigation();
      }
    }
  }
}

/**
 * 处理移动端和Web端导航
 */
function handleMobileWebNavigation(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): NavigationGuardReturn {
  const user = useUserStore() as any;

  if (to.path !== "/login") {
    if (!user.isLogin) {
      user.showLoginAndRegister = "login";
      return "/login";
    }
  }
  else {
    if (user.isLogin) {
      return from.path && from.path !== "/login" ? from.path : "/";
    }
  }
}

/**
 * 检查并清理对话框和弹窗
 */
function checkAndCleanupDialogs(): DialogCleanupFunction {
  const chat = useChatStore() as any;
  if (!chat.notDialogShow) {
    return () => {
      chat.notDialogShow = false;
    };
  }

  return undefined;
}

/**
 * 设置页面过渡动画
 */
function setPageTransition(
  toPath: string,
  fromPath: string,
): void {
  const chat = useChatStore() as any;

  if (MAIN_ROUTES[toPath] && MAIN_ROUTES[fromPath]) {
    if (MAIN_ROUTES[toPath] > MAIN_ROUTES[fromPath]) {
      chat.pageTransition.name = "page-slide-left";
    }
    else if (MAIN_ROUTES[toPath] < MAIN_ROUTES[fromPath]) {
      chat.pageTransition.name = "page-slide-right";
    }
  }
  else {
    chat.pageTransition.name = "page-fade-in";
  }
}

/**
 * 检查是否为桌面端
 */
function checkIsDesktop(): boolean {
  const setting = useSettingStore() as any;

  try {
    if (setting.isDesktop) {
      return true;
    }
    const osType = type();
    return DESKTOP_OS_TYPES.includes(osType);
  }
  catch (error) {
    return false;
  }
}

/**
 * 加载登录页
 */
async function loadLoginWindow(): Promise<void> {
  try {
    await createWindow(LOGIN_WINDOW_LABEL);
    await destroyWindow(MSGBOX_WINDOW_LABEL);
    destroyWindow(MAIN_WINDOW_LABEL);
    destroyWindow(EXTEND_WINDOW_LABEL);
  }
  catch (e) {
    console.error(e);
  }
}

/**
 * 加载主页
 */
async function loadMainWindow(): Promise<void> {
  try {
    await createWindow(MSGBOX_WINDOW_LABEL);
    await createWindow(MAIN_WINDOW_LABEL);
    await destroyWindow(LOGIN_WINDOW_LABEL);
  }
  catch (e) {
    console.error(e);
  }
}
