<script lang="ts" setup>
import { appDescription, appKeywords, appName } from "@/constants/index";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

useSeoMeta({
  title: "登录 - 极物聊天",
  description: appDescription,
  keywords: appKeywords,
});
const user = useUserStore();
definePageMeta({
  key: route => route.fullPath,
  layout: "default",
});

const setting = useSettingStore();
onMounted(async () => {
  user.showLoginAndRegister = "login";
});

if (setting.isDesktop) {
  watch(() => user.showLoginAndRegister, async (val) => {
    if (val !== "") {
      // 关闭窗口动画
      if (setting.settingPage.isCloseAllTransition) {
        getCurrentWindow()?.setSize(new LogicalSize(360, val === "login" ? 450 : 480));
        return;
      }
      // 窗口动画
      invoke("animate_window_resize", {
        windowLabel: LOGIN_WINDOW_LABEL,
        toWidth: 360,
        toHeight: val === LOGIN_WINDOW_LABEL ? 450 : 480,
        duration: 160,
        steps: 12,
      }).catch((err: any) => console.error("窗口动画失败:", err));
    }
  }, {
    immediate: true,
  });
}
</script>

<template>
  <div
    class="main-box relative overflow-hidden shadow bg-color"
    grid="~ cols-1 md:cols-2"
    :class="{
      'img-none is-desktop': setting.isDesktop,
      'is-mobile': setting.isMobileSize,
      'show-register': user.showLoginAndRegister === 'register',
    }"
  >
    <div data-tauri-drag-region absolute right-0 z-1000 w-100vw flex cursor-move items-center gap-2 sm:w-50vw>
      <div class="group ml-a flex flex items-center gap-2 p-2 sm:p-4">
        <BtnTheme
          :class="setting.isDesktop ? 'scale-90 op-50 group-hover:op-100' : ' h-2rem w-2rem rounded-1/2 card-default border-default' "
          title="切换主题"
        />
        <BtnAppDownload />
        <MenuController v-if="setting.isDesktop" key="header" :size="setting.isDesktop ? 'small' : ''" :show-max="false" />
      </div>
    </div>
    <!-- bg -->
    <div
      class="hidden h-full w-full select-none border-0 border-r-1px shadow-md shadow-inset md:block border-default"
    >
      <ElImage
        src="https://quang.kiwi2333.top/user_bg/login_bg.jpg" fit="cover"
        class="h-full w-full select-none overflow-hidden rounded-r-0 card-default"
      />
    </div>
    <!-- 表单 -->
    <div
      class="flex flex-row-c-c flex-col select-none rounded-t-8 shadow-lg sm:(mt-0 h-full animate-none border-0 rounded-t-0 shadow-none) bg-color"
      :class="setting.isDesktop ? 'w-full h-full !rounded-0 animate-none pt-4' : 'h-fit pt-16 pb-10 min-h-7/10 sm:static absolute bottom-0 left-0 w-full   shadow-lg border-default-t'"
      data-fade
    >
      <div class="form-main mx-a w-86/100 text-center sm:(w-3/5 text-left)">
        <!-- 添加背景动画球 -->
        <div class="animated-background">
          <div class="blob blob-1" />
          <div class="blob blob-2" />
          <div class="blob blob-3" />
        </div>
        <div
          v-if="setting.isDesktop"
          key="login-bg"
          class="flex items-center gap-3 sm:(relative left-a top-a)"
        />
        <div data-fades>
          <div
            key="login-bg"
            style="--anima: blur-in;"
            class="login-logo absolute left-6 top-6 my-4 block flex items-center gap-3 sm:(static mb-6)"
          >
            <ElImage src="/logo.png" class="logo h-8 w-8" />
            <h3 class="app-name text-1.2rem font-bold tracking-0.2em">
              {{ appName }}
            </h3>
          </div>
          <!-- 登录 -->
          <FormLoginForm
            v-if="user.showLoginAndRegister === 'login'"
            key="login-form"
            style="--anima: blur-in;"
            class="login-form mt-a"
          />
          <!-- 注册 -->
          <FormRegisterForm
            v-else-if="user.showLoginAndRegister === 'register'"
            key="register-form"
            style="--anima: blur-in;"
            :size="setting.isDesktop ? 'default' : 'large'"
            class="register-form"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@media (max-width: 640px) {
  .main-box:not(.img-none) {
    background-image: url("https://quang.kiwi2333.top/user_bg/login_bg.jpg");
    background-repeat: no-repeat;
    background-position: top center;
    background-size: contain;
    overflow: hidden;
  }
}
.main-box {
  --el-border-radius-base: 0.5rem;

  :deep(.el-form) {
    --el-border-radius-base: 0.5rem;
  }
}
.main-box {
  --el-input-border: transparent;
  --el-border-radius-base: 0.5rem;
  :deep(.el-form) {
    --el-border-radius-base: 0.5rem;

    .el-button,
    .el-input-group__append,
    .el-input__wrapper {
      --el-input-bg-color: rgba(250, 250, 250, 0.95);
      --el-input-shadow: transparent;
      box-shadow: 0 0 0 1px rgba(133, 133, 133, 0.05) inset;
      &.is-focus {
        box-shadow: 0 0 0 1px var(--el-input-focus-border-color) inset;
      }
    }
  }
}
.dark .main-box {
  :deep(.el-form) {
    .el-input__wrapper {
      --el-input-bg-color: rgba(26, 26, 26, 0.4);
    }
  }
}


/* 适配桌面版 */
.is-desktop {

  .login-logo {
    --at-apply: ' !static mb-4 p-0  flex-row-c-c';
    .logo {
      --at-apply: 'w-8 h-8';
    }
    .app-name {
      --at-apply: 'text-1.2em';
    }
  }
  .login-form {
    --at-apply: 'pb-6';
  }
}

.show-register {
  .login-logo {
    --at-apply: 'hidden';
    .logo {
      --at-apply: 'w-6 h-6';
    }
    .app-name {
      --at-apply: 'text-1em';
    }
  }
}

/* 背景动画球样式 */
.animated-background {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
  filter: blur(4px);
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(3rem);
  opacity: 0.7;
}
.dark {
  .blob {
    opacity: 0.3;
  }
}

.blob-1 {
  width: 22rem;
  height: 22rem;
  background: radial-gradient(circle, rgba(74, 144, 226, 0.4) 0%, rgba(74, 144, 226, 0.2) 70%);
  left: -50%;
  top: -50%;
  animation: float-blob-1 12s ease-in-out infinite;
}

.blob-2 {
  width: 18rem;
  height: 18rem;
  background: radial-gradient(circle, rgba(107, 74, 226, 0.4) 0%, rgba(107, 74, 226, 0.2) 70%);
  right: -40%;
  top: 20%;
  animation: float-blob-2 18s ease-in-out infinite;
}

.blob-3 {
  width: 16rem;
  height: 16rem;
  background: radial-gradient(circle, rgba(103, 178, 240, 0.4) 0%, rgba(103, 178, 240, 0.2) 70%);
  left: -40%;
  bottom: -20%;
  animation: float-blob-3 20s ease-in-out infinite;
}

@keyframes float-blob-1 {
  0% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(80px, 60px) rotate(20deg); }
  66% { transform: translate(20px, 120px) rotate(-10deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

@keyframes float-blob-2 {
  0% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(-60px, 40px) rotate(-15deg); }
  66% { transform: translate(-30px, -60px) rotate(10deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

@keyframes float-blob-3 {
  0% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(50px, -50px) rotate(10deg); }
  66% { transform: translate(-40px, -20px) rotate(-15deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
</style>
