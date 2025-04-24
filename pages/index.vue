
<script lang="ts" setup>
import { appName } from "~/constants";
import { WsStatusEnum } from "~/types/chat/WsType";

const user = useUserStore();
const ws = useWsStore();
const setting = useSettingStore();
const chat = useChatStore();
const showWsStatusBtns = computed(() => ws.status !== WsStatusEnum.OPEN || !user.isLogin);
const showGroupDialog = computed({
  get() {
    return chat.inviteMemberForm.show;
  },
  set(val) {
    chat.inviteMemberForm = val
      ? {
          ...chat.inviteMemberForm,
          show: true,
        }
      : {
          show: false,
          roomId: undefined,
          uidList: [],
        };
  },
});
// 监听消息
useMsgLinear();
// 初始化设置
watch(() => user.isLogin, (val) => {
  if (val)
    setting.loadSettingPreData();
}, {
  immediate: true,
});
</script>

<template>
  <main
    v-loading.fullscreen.lock="!user.isLogin"
    class="main relative flex flex-col !overflow-hidden"
    element-loading-text="退出登录中..."
    element-loading-background="transparent"
    :element-loading-spinner="defaultLoadingIcon"
  >
    <div
      v-if="user.isLogin"
      class="h-full flex flex-1 flex-col overflow-hidden"
    >
      <MenuHeaderMenuBar nav-class="relative z-999 left-0 w-full top-0 ml-a h-3.5rem w-full flex flex-shrink-0 select-none items-center justify-right gap-4 rounded-b-0 px-3 sm:(absolute right-0 top-0  p-1 ml-a h-3.125rem h-fit border-b-0 !bg-transparent) border-default-b bg-color">
        <template #center="{ appTitle }">
          <!-- 移动端菜单 -->
          <div v-if="setting.isMobile" class="block tracking-0.1em absolute-center-center sm:hidden" :data-tauri-drag-region="setting.isDesktop">
            {{ appTitle || appName }}
          </div>
          <BtnWsStatusBtns v-if="showWsStatusBtns" class="offline" />
        </template>
      </MenuHeaderMenuBar>
      <div
        class="relative h-1 max-h-full flex flex-1"
      >
        <MenuChatMenu v-if="!setting.isMobileSize" class="w-fit shrink-0 !hidden !sm:flex" />
        <!-- 缓存 页面内容 -->
        <NuxtPage
          keepalive
          :transition="setting.isMobileSize && !setting.settingPage.isCloseAllTransition ? chat.pageTransition : false"
        />
      </div>
    </div>
    <!-- 邀请进群 -->
    <LazyChatNewGroupDialog
      v-model="showGroupDialog"
      hydrate-on-idle
      :form="chat.inviteMemberForm"
    />
    <!-- 视频播放器 -->
    <LazyUtilVideoPlayerDialog
      v-model="chat.showVideoDialog"
      hydrate-on-idle
    />
    <!-- 扩展菜单 -->
    <LazyMenuExtensionMenu
      v-model:show="chat.showExtension"
      hydrate-on-idle
    />
    <!-- RTC通话弹窗 -->
    <LazyChatRtcCallDialog
      v-model="chat.showRtcCall"
      v-model:call-type="chat.rtcCallType"
      hydrate-on-idle
    />
    <!-- 移动端菜单 - 小屏幕才加载 -->
    <LazyMenuBottomMenu
      v-if="setting.isMobileSize && user.isLogin && chat.isOpenContact"
      hydrate-on-media-query="(max-width: 768px)"
      class="grid sm:hidden"
    />
  </main>
</template>

<style lang="scss" scoped>
.main:hover {
  .offline {
    :deep(.btns) {
      --at-apply: "scale-100 op-100";
    }
  }
}
</style>
