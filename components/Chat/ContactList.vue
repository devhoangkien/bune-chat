<script lang="ts" setup>
import type { ChatContactVO } from "@/composables/api/chat/contact";
import { RoomType } from "@/composables/api/chat/contact";
import ContextMenu from "@imengyu/vue3-context-menu";

const props = defineProps<{
  dto?: ContactPageDTO
}>();
const isLoading = ref<boolean>(false);
const setting = useSettingStore();
const user = useUserStore();
const chat = useChatStore();
const isReload = ref(false);
const visiblePopper = ref(false);
const pageInfo = ref({
  cursor: undefined as undefined | string,
  isLast: false,
  size: 20,
});
const historyContactId = useLocalStorage<number | undefined>(`${user.userId}-history-contact-id`, undefined);
const isLoadRoomMap: Record<number, boolean> = {};
// 滚动顶部触发
const scrollbarRef = useTemplateRef("scrollbarRef");
const isScrollTop = ref(true);
function onScroll(e: {
  scrollTop: number;
  scrollLeft: number;
}) {
  isScrollTop.value = e.scrollTop === 0;
}
/**
 * 加载会话列表
 */
async function loadData(dto?: ContactPageDTO) {
  if (isLoading.value || pageInfo.value.isLast)
    return;
  isLoading.value = true;
  const { data } = await getChatContactPage({
    pageSize: pageInfo.value.size,
    cursor: pageInfo.value.cursor,
  }, user.getToken);
  if (!data) {
    return;
  }
  if (data && data.list) {
    for (const item of data.list) {
      chat.refreshContact(item);
    }
  }
  pageInfo.value.isLast = data.isLast;
  pageInfo.value.cursor = data.cursor || undefined;
  isLoading.value = false;
  return data.list;
}

// 刷新
async function reload(size: number = 20, dto?: ContactPageDTO, isAll: boolean = true, roomId?: number) {
  if (isReload.value)
    return;
  isReload.value = true;
  if (isAll) {
    pageInfo.value = {
      cursor: undefined,
      isLast: false,
      size,
    };
    if (setting.isMobileSize) { // 移动端
      setting.isOpenGroupMember = false;// 关闭群成员列表
      setting.isOpenContactSearch = true;// 打开搜索框
    }
    // const list = await loadData(dto || props.dto);
    await loadData(dto || props.dto);
    // 默认加载首个会话
    if (!setting.isMobileSize && historyContactId.value && chat.contactMap[historyContactId.value]) {
      chat.setContact(chat.contactMap[historyContactId.value]);
    }
  }
  else if (roomId) { // 刷新某一房间
    refreshItem(roomId);
  }
  nextTick(() => {
    isReload.value = false;
  });
}

// 刷新某一房间
async function refreshItem(roomId: number) {
  if (!roomId || isLoadRoomMap[roomId])
    return;
  isLoadRoomMap[roomId] = true;
  try {
    const item = chat.contactMap[roomId] as ChatContactVO | undefined;
    if (item?.type !== undefined && item.type !== null)
      return;
    if (item?.type === RoomType.GROUP) {
      const res = await getChatContactInfo(roomId, user.getToken, RoomType.GROUP);
      if (res)
        chat.refreshContact(res.data);
    }
  }
  catch (error) {
    console.log(error);
  }
  finally {
    delete isLoadRoomMap[roomId];
  }
}

// 右键菜单
function onContextMenu(e: MouseEvent, item: ChatContactVO) {
  e.preventDefault();
  const isPin = !!chat.contactMap?.[item.roomId]?.pinTime;
  const opt = {
    x: e.x,
    y: e.y,
    theme: setting.contextMenuTheme,
    items: [
      { // 置顶功能
        customClass: "group",
        icon: isPin ? "i-solar:pin-bold-duotone  group-hover:(i-solar:pin-outline scale-110)" : "i-solar:pin-outline group-hover:i-solar:pin-bold-duotone",
        label: isPin ? "取消置顶" : "置顶",
        onClick: () => {
          chat.setPinContact(item.roomId, isPin ? isTrue.FALESE : isTrue.TRUE);
        },
      },
      {
        customClass: "group",
        divided: "up",
        icon: "i-solar:trash-bin-minimalistic-outline group-btn-danger group-hover:i-solar:trash-bin-minimalistic-bold-duotone",
        label: "不显示聊天",
        onClick: () => {
          chat.deleteContactConfirm(item.roomId, () => {
          });
        },
      },
    ] as any,
  };
  // 群聊
  if (item.type === RoomType.GROUP) {
    // 在第一个后插入
    opt.items.splice(1, 0, {
      customClass: "group",
      icon: "i-solar:user-speak-broken group-btn-warning group-hover:i-solar:user-speak-bold-duotone",
      label: "邀请好友",
      onClick: () => {
        chat.inviteMemberForm = {
          show: true,
          roomId: item.roomId,
          uidList: [],
        };
      },
    });
  }
  else if (item.type === RoomType.SELFT) {
    opt.items.splice(1, 0, {
      customClass: "group",
      icon: "i-solar:user-outline group-btn-info group-hover:i-solar:user-bold-duotone",
      label: "联系TA",
      onClick: async () => {
        // 跳转到好友页面
        const friendId = chat.contactMap?.[item.roomId]?.targetUid;
        if (!friendId) {
          await chat.reloadContact(item.roomId);
        }
        chat.setTheFriendOpt(FriendOptType.User, {
          id: chat.contactMap?.[item.roomId]?.targetUid,
        });
        navigateTo({
          path: "/friend",
          query: {
            dis: 1,
          },
        });
      },
    });
  }

  ContextMenu.showContextMenu(opt);
}

// 跳转好友页面
async function toFriendPage() {
  visiblePopper.value = false;
  await nextTick();
  await navigateTo("/friend");
  setTimeout(async () => {
    chat.setTheFriendOpt(FriendOptType.Empty);
    const com = document?.getElementById?.(applyUserSearchInputDomId);
    if (com) {
      com?.focus();
    }
  }, 200);
}

function onClickContact(room: ChatContactVO) {
  chat.isOpenContact = false;
  historyContactId.value = room.roomId;
  chat.onChangeRoom(room.roomId);
}

// 监听当前选中的房间ID变化
watchDebounced(() => chat.theRoomId, (newRoomId) => {
  if (newRoomId) {
    requestAnimationFrame(() => {
      // 查找当前选中的联系人元素
      const selectedElement = document.querySelector(`#contact-${newRoomId}`);
      if (selectedElement) {
        // 检查元素是否在视图中可见
        const rect = selectedElement.getBoundingClientRect();
        const scrollContainer = scrollbarRef.value?.wrapRef;
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          // 如果元素不在视图中，则滚动到可见位置
          if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
            selectedElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }
        }
      }
    });
  }
}, { immediate: false, debounce: 80 });

reload();

const RoomTypeTagType: Record<number, "" | "primary" | "info" | any> = {
  [RoomType.AICHAT]: "warning",
};

// @unocss-include
const menuList = [
  {
    label: "添加好友",
    icon: "i-tabler:user-plus",
    onClick: () => {
      toFriendPage();
    },
  },
  {
    label: "发起群聊",
    icon: "i-solar:chat-round-dots-outline",
    onClick: () => {
      visiblePopper.value = false;
      chat.inviteMemberForm = {
        show: true,
        roomId: undefined,
        uidList: [],
      };
    },
  },
];
</script>

<template>
  <div
    class="group main main-bg-color"
  >
    <!-- 搜索群聊 -->
    <div
      class="header"
      :class="setting.isMobileSize && !setting.isOpenContactSearch ? '!h-0 overflow-y-hidden' : ''"
    >
      <ElInput
        id="search-contact"
        v-model.lazy="chat.searchKeyWords"
        class="mr-2 text-0.8rem hover:op-80"
        style="height: 2rem;"
        name="search-content"
        type="text"
        clearable
        autocomplete="off"
        :prefix-icon="ElIconSearch"
        minlength="2"
        maxlength="30"
        placeholder="搜索"
      />
      <!-- 添加 -->
      <MenuPopper
        v-model:visible="visiblePopper"
        placement="bottom-end"
        transition="popper-fade"
        trigger="click"
        :menu-list="menuList"
      >
        <template #reference>
          <div class="icon">
            <i i-carbon:add-large p-2 />
          </div>
        </template>
      </MenuPopper>
    </div>
    <!-- 会话列表 -->
    <el-scrollbar
      ref="scrollbarRef"
      wrap-class="w-full h-full"
      class="contact-list"
      wrapper-class="relative"
      @scroll="onScroll"
    >
      <ListAutoIncre
        :immediate="false"
        :auto-stop="false"
        :is-scroll-top="isScrollTop"
        :no-more="pageInfo.isLast"
        enable-pull-to-refresh
        loading-class="op-0"
        :damping="0.7"
        :pull-distance="90"
        :pull-trigger-distance="60"
        :refresh-timeout="3000"
        :on-refresh="reload"
        @load="loadData(dto)"
      >
        <!-- 添加骨架屏 -->
        <div v-if="isReload" key="skeleton" class="main-bg-color absolute z-2 w-full overflow-y-auto">
          <ChatContactSkeleton v-for="i in 10" :key="i" class="contact" />
        </div>
        <ListTransitionGroup
          :immediate="false"
          tag="div"
          :class="{
            reload: isReload,
          }"
          class="relative"
        >
          <div
            v-for="room in chat.getContactList"
            :id="`contact-${room.roomId}`"
            :key="room.roomId"
            class="contact"
            :class="{
              'is-pin': room.pinTime,
              'is-checked': room.roomId === chat.theRoomId,
            }"
            @contextmenu.stop="onContextMenu($event, room)"
            @click="onClickContact(room)"
          >
            <el-badge
              :hidden="!room.unreadCount" :max="99" :value="room.unreadCount"
              class="h-3em w-3em flex-shrink-0"
            >
              <CardElImage
                :error-class="contactTypeIconClassMap[room.type]"
                :default-src="room.avatar" fit="cover"
                class="h-full w-full card-rounded-df object-cover shadow-sm card-bg-color-2"
              />
            </el-badge>
            <div class="flex flex-1 flex-col justify-between truncate">
              <div flex truncate>
                <p class="text truncate text-black dark:text-white">
                  {{ room.name }}
                </p>
                <!-- AI机器人 -->
                <i v-if="RoomTypeTagType[room.type]" i-ri:robot-2-line class="ai-icon" />
                <span class="text ml-a w-fit flex-shrink-0 text-right text-0.7em leading-2em text-color">
                  {{ formatContactDate(room.activeTime) }}
                </span>
              </div>
              <p class="text mt-1 flex text-small">
                <small
                  class="h-1.5em flex-1 truncate"
                  :class="{ 'text-[var(--el-color-info)] font-600': room.unreadCount }"
                >
                  {{ room.text }}
                </small>
                <small v-if="room.pinTime" class="text ml-a flex-shrink-0 overflow-hidden text-color">
                  &nbsp;置顶
                </small>
              </p>
            </div>
          </div>
        </ListTransitionGroup>
        <template #done>
          <!-- <div class="my-4 w-full text-center text-mini">
             {{ pageInfo.isLast ? '没有更多了' : '' }}
          </div> -->
        </template>
      </ListAutoIncre>
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
.main {
  --at-apply: "z-4 h-full flex flex-shrink-0 flex-col select-none overflow-hidden border-0 border-0 rounded-0 sm:(relative left-0 top-0 w-1/4 pl-0)";
}
.main-bg-color {
  --at-apply: "sm:card-bg-color-2 bg-color-3";
}
.contact-list {
  --at-apply: "sm:p-2 p-0";

  .contact {
    // transition: background-color 100ms ease-in-out;
    --at-apply: "h-18 card-bg-color dark:bg-transparent flex items-center gap-3 p-4 sm:(border-transparent p-3 w-full text-color card-rounded-df mb-2 card-bg-color)  w-full text-sm  cursor-pointer  !hover:bg-[#f8f8f8] !dark:hover:bg-[#151515]";
    .text {
      --at-apply: "transition-none";
    }

    .ai-icon {
      --at-apply: "mx-0.5em pt-0.2em h-1.4em w-1.4em text-theme-primary dark:text-theme-info";
    }
    &.is-pin {
      --at-apply: "bg-transparent dark:bg-dark-5 sm:(!border-default-2 shdow-sm card-bg-color)";
    }
    &.is-checked {
      --at-apply: "!sm:(bg-[var(--el-color-primary)] color-white dark:text-light  dark:bg-[var(--el-color-primary-light-3)] hover:op-90)  ";
      .text {
        --at-apply: "sm:(color-white dark:text-light)";
      }
      .ai-icon {
        --at-apply: "sm:!text-light";
      }
    }
  }
}
.header {
  --at-apply: "sm:(h-16 px-4) h-14 px-3 flex-row-c-c flex-shrink-0 transition-200 transition-height  card-bg-color";
  :deep(.el-input) {
    .el-input__wrapper {
      --at-apply: "!shadow-none !outline-none !input-bg-color";
    }
  }
  .icon {
    --at-apply: "h-2rem px-2 w-2rem  !btn-primary-bg flex-row-c-c input-bg-color";
  }
}
// 影响高度变化
@media screen and (max-width: 768px) {
  .contact {
    border-top: 1px solid #7e7e7e0e !important;
    border-bottom: 1px solid transparent !important;
    border-left: 1px solid transparent !important;
    border-right: 1px solid transparent !important;
  }
}

:deep(.el-scrollbar__bar) {
  right: 1px;
  --at-apply: "!hidden sm:block";
  --el-scrollbar-bg-color: #9292928a;

  .el-scrollbar__thumb {
    width: 6px;
  }
}
.reload {
  transition: none !important;
  * {
    transition: none !important;
  }
}
</style>
