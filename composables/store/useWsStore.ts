import type { Message as BackMessage } from "@tauri-apps/plugin-websocket";
import type BackWebSocket from "@tauri-apps/plugin-websocket";
import { acceptHMRUpdate, defineStore } from "pinia";
import { WsStatusEnum } from "../../types/chat/WsType";


// @unocss-include
// https://pinia.web3doc.top/ssr/nuxt.html#%E5%AE%89%E8%A3%85
export const useWsStore = defineStore(
  WS_STORE_KEY,
  () => {
    const isWindBlur = ref<boolean>(false);

    // WebSocket核心hooks
    const {
      webSocketHandler,
      status,
      fullWsUrl,
      initBrowserWebSocket,
      initTauriWebSocket,
      handleTauriWsError,
      closeConnection,
      removeEventListeners,
      send,
      sendHeart,
    } = useWebSocket();

    // 消息处理hooks
    const {
      wsMsgList,
      isNewMsg,
      processWsMessage,
      resetMsgList,
    } = useWsMessage();

    /**
     * 重新加载WebSocket连接
     */
    const reload = () => mitter.emit(MittEventType.CHAT_WS_RELOAD);

    /**
     * 默认初始化WebSocket连接
     */
    async function initDefault(call: () => any) {
      const setting = useSettingStore();
      const user = useUserStore();
      if (!user.getToken) {
        await closeConnection();
        status.value = WsStatusEnum.SAFE_CLOSE;
        return false;
      }
      // 构建WebSocket URL
      fullWsUrl.value = `${BaseWSUrl}?Authorization=${user.getToken}`;
      // 如果已经连接且状态为OPEN，直接返回
      if (webSocketHandler.value && status.value === WsStatusEnum.OPEN) {
        return webSocketHandler.value;
      }

      // 根据设置选择WebSocket实现
      if (setting.isUseWebsocket) {
        return initBrowserWebSocket(fullWsUrl.value, call);
      }
      else {
        return initTauriWebSocket(fullWsUrl.value, call);
      }
    }

    /**
     * 接收消息
     */
    function onMessage(call: (data: WsMsgBodyVO) => void) {
      if (!webSocketHandler.value)
        return;

      const setting = useSettingStore();
      if (setting.isUseWebsocket) {
        // 浏览器WebSocket实现
        (webSocketHandler.value as WebSocket).onmessage = (event: MessageEvent) => {
          if (event && !event.data)
            return false;

          try {
            const data = JSON.parse(event.data) as Result<WsMsgBodyVO>;
            checkResponse(data); // 处理错误
            if (data) {
              processWsMessage(data, call);
            }
          }
          catch (err) {
            return null;
          }
        };
      }
      else {
        // Tauri WebSocket实现
        (webSocketHandler.value as BackWebSocket).addListener((msg: BackMessage) => {
          // 处理WebSocket错误
          if (handleTauriWsError(msg))
            return;

          // 处理关闭事件
          if (msg.type === "Close") {
            status.value = WsStatusEnum.SAFE_CLOSE;
            webSocketHandler.value = null;
            return;
          }

          // 处理文本消息
          if (msg.type === "Text" && msg.data) {
            try {
              const data = JSON.parse(String(msg.data)) as Result<WsMsgBodyVO>;
              if (data) {
                processWsMessage(data, call);
              }
            }
            catch (err) {
              return null;
            }
          }
          // 忽略其他类型的消息
          else if (!["Binary", "Ping", "Pong"].includes(msg.type)) {
            status.value = WsStatusEnum.SAFE_CLOSE;
            webSocketHandler.value = null;
          }
        });
      }
    }

    /**
     * 关闭WebSocket连接
     */
    async function close(isConfirm = true) {
      if (!isConfirm) {
        try {
          await closeConnection();
        }
        finally {
          webSocketHandler.value = null;
          status.value = WsStatusEnum.SAFE_CLOSE;
        }
        return;
      }

      // 需要确认的关闭
      ElMessageBox.confirm("是否断开会话？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        confirmButtonClass: "el-button--danger shadow border-default ",
        lockScroll: false,
        center: true,
        callback: async (res: string) => {
          if (res === "confirm") {
            if (!webSocketHandler.value)
              return;

            try {
              await closeConnection();
            }
            catch (err) {
              // 忽略错误
            }

            status.value = WsStatusEnum.SAFE_CLOSE;
            ElNotification.success("断开成功！");
          }
        },
      });
    }

    /**
     * 重置Store
     */
    function resetStore() {
      try {
        close(false);
        removeEventListeners();
        closeConnection();
      }
      catch (err) {
        // 忽略错误
      }
      finally {
        resetMsgList();
        status.value = WsStatusEnum.SAFE_CLOSE;
        fullWsUrl.value = "";
        isWindBlur.value = false;
        webSocketHandler.value = null;
      }
    }

    return {
      // state
      isNewMsg,
      webSocketHandler,
      status,
      isWindBlur,
      wsMsgList,
      // 方法
      resetStore,
      reload,
      initDefault,
      send,
      close,
      sendHeart,
      onMessage,
    };
  },
  {
    // https://prazdevs.github.io/pinia-plugin-persistedstate/frameworks/nuxt-3.html
    persist: false,
  },
);

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useWsStore, import.meta.hot));

