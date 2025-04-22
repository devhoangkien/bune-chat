import type { Message as BackMessage } from "@tauri-apps/plugin-websocket";
import type { WSAiStreamMsg, WSFriendApply, WSMemberChange, WsMsgBodyVO, WSMsgDelete, WSMsgRecall, WSOnlineOfflineNotify, WSPinContactMsg, WsSendMsgDTO } from "../../types/chat/WsType";
import type { ChatMessageVO } from "../api/chat/message";
import BackWebSocket from "@tauri-apps/plugin-websocket";
import { acceptHMRUpdate, defineStore } from "pinia";
import { WsMsgBodyType, WsMsgType, WsStatusEnum } from "../../types/chat/WsType";


export interface WsMsgItemMap {
  newMsg: ChatMessageVO[];
  onlineNotice: WSOnlineOfflineNotify[];
  recallMsg: WSMsgRecall[];
  deleteMsg: WSMsgDelete[];
  applyMsg: WSFriendApply[];
  memberMsg: WSMemberChange[];
  tokenMsg: object[];
  rtcMsg: WSRtcCallMsg[];
  pinContactMsg: WSPinContactMsg[];
  aiStreamMsg: WSAiStreamMsg[];
  other: object[];
}

/**
 * 消息类型映射
 */
const wsMsgMap: Record<WsMsgBodyType, keyof WsMsgItemMap> = {
  [WsMsgBodyType.MESSAGE]: "newMsg",
  [WsMsgBodyType.ONLINE_OFFLINE_NOTIFY]: "onlineNotice",
  [WsMsgBodyType.RECALL]: "recallMsg",
  [WsMsgBodyType.DELETE]: "deleteMsg",
  [WsMsgBodyType.APPLY]: "applyMsg",
  [WsMsgBodyType.MEMBER_CHANGE]: "memberMsg",
  [WsMsgBodyType.TOKEN_EXPIRED_ERR]: "tokenMsg",
  [WsMsgBodyType.RTC_CALL]: "rtcMsg",
  [WsMsgBodyType.PIN_CONTACT]: "pinContactMsg",
  [WsMsgBodyType.AI_STREAM]: "aiStreamMsg",
};


// @unocss-include
// https://pinia.web3doc.top/ssr/nuxt.html#%E5%AE%89%E8%A3%85
export const useWsStore = defineStore(
  WS_STORE_KEY,
  () => {
    const webSocketHandler = ref<WebSocket | BackWebSocket | null>(null);
    const fullWsUrl = ref<string>("");
    const isWindBlur = ref<boolean>(false);
    const status = ref<WsStatusEnum>(WsStatusEnum.CLOSE);
    // 未消费信箱
    const emptyMsgList = (): WsMsgItemMap => ({
      /**
       * 常规消息
       */
      newMsg: [] as ChatMessageVO[],
      /**
       * 上下线消息
       */
      onlineNotice: [] as WSOnlineOfflineNotify[],
      /**
       * 撤回消息
       */
      recallMsg: [] as WSMsgRecall[],
      /**
       * 删除消息
       */
      deleteMsg: [] as WSMsgDelete[],
      /**
       * 申请好友消息
       */
      applyMsg: [] as WSFriendApply[],
      /**
       * 群成员变动消息 WsMsgBodyType.MEMBER_CHANGE
       */
      memberMsg: [] as WSMemberChange[],
      /**
       * token失效
       */
      tokenMsg: [] as object[],
      /**
       * rtc通讯 WsMsgBodyType.RTC_CALL
       */
      rtcMsg: [] as WSRtcCallMsg[],
      /**
       * 置顶联系人消息 WsMsgBodyType.PIN_CONTACT
       */
      pinContactMsg: [] as WSPinContactMsg[],
      /**
       * ai推送流
       */
      aiStreamMsg: [] as WSAiStreamMsg[],
      other: [] as object[],
    });
    const wsMsgList = ref<WsMsgItemMap>(emptyMsgList());

    const isNewMsg = computed(() => wsMsgList.value.newMsg.length > 0);

    /**
     * 重新加载WebSocket连接
     */
    const reload = () => {
      // 实现重载逻辑
    };

    /**
     * 处理WebSocket错误和关闭事件
     * @param eventType 事件类型
     * @param wsStatus 要设置的状态
     */
    const handleSocketEvent = (eventType: "error" | "close", wsStatus: WsStatusEnum) => {
      return (e: Event) => {
        status.value = wsStatus;
        webSocketHandler.value = null;
      };
    };

    /**
     * 默认初始化WebSocket连接
     * @param call 连接成功后的回调函数
     */
    async function initDefault(call: () => any) {
      const setting = useSettingStore();
      const user = useUserStore();

      // 检查token
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
        return initBrowserWebSocket(call);
      }
      else {
        return initTauriWebSocket(call);
      }
    }

    /**
     * 初始化浏览器原生WebSocket
     */
    function initBrowserWebSocket(call: () => any) {
      status.value = WsStatusEnum.CONNECTION;
      webSocketHandler.value = new WebSocket(fullWsUrl.value);
      status.value = WsStatusEnum.OPEN;

      if (!webSocketHandler.value) {
        status.value = WsStatusEnum.SAFE_CLOSE;
        return;
      }

      // 设置事件处理器
      webSocketHandler.value.onopen = call;
      webSocketHandler.value.addEventListener("error", handleSocketEvent("error", WsStatusEnum.CLOSE));
      webSocketHandler.value.addEventListener("close", handleSocketEvent("close", WsStatusEnum.SAFE_CLOSE));

      return true;
    }

    /**
     * 初始化Tauri WebSocket
     */
    async function initTauriWebSocket(call: () => any) {
      const ws = await BackWebSocket.connect(fullWsUrl.value);
      webSocketHandler.value = ws; // 保存连接

      // 设置状态
      status.value = ws.id ? WsStatusEnum.OPEN : WsStatusEnum.CLOSE;

      if (ws.id) {
        call();
      }

      return ws;
    }

    /**
     * 处理接收到的WebSocket消息
     * @param msgData 消息数据
     * @param callback 回调函数
     */
    function processWsMessage(msgData: Result<WsMsgBodyVO>, callback: (data: WsMsgBodyVO) => void) {
      if (!msgData)
        return;

      const wsMsg = msgData.data;
      const body = wsMsg.data;

      // 如果消息类型在映射中存在，则处理该消息
      if (wsMsgMap[wsMsg.type] !== undefined) {
        wsMsgList.value[wsMsgMap[wsMsg.type]].push(body as any);
        mitter.emit(resolteChatPath(wsMsg.type), body);
      }

      callback(wsMsg);
    }

    /**
     * 接收消息
     * @param call 消息处理回调
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
     * 处理Tauri WebSocket错误
     */
    function handleTauriWsError(msg: BackMessage): boolean {
      if ("WebSocket protocol error: Connection reset without closing handshake".includes(msg?.data?.toString() || "")) {
        status.value = WsStatusEnum.SAFE_CLOSE;
        webSocketHandler.value = null;
        return true;
      }
      else if (msg?.data?.toString().includes("WebSocket protocol error")) {
        status.value = WsStatusEnum.CLOSE;
        webSocketHandler.value = null;
        return true;
      }
      return false;
    }

    /**
     * 关闭WebSocket连接
     */
    async function closeConnection() {
      try {
        await (webSocketHandler.value as BackWebSocket)?.disconnect?.();
        await (webSocketHandler.value as WebSocket)?.close?.();
      }
      catch (err) {
        // 忽略错误
      }
    }

    /**
     * 关闭WebSocket连接
     * @param isConfirm 是否需要确认
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
     * 发送心跳包
     */
    function sendHeart() {
      send({
        type: WsMsgType.HEARTBEAT,
        data: null,
      });
    }

    /**
     * 发送消息
     * @param dto 消息数据
     */
    function send(dto: WsSendMsgDTO) {
      if (status.value === WsStatusEnum.OPEN) {
        webSocketHandler.value?.send(JSON.stringify(dto));
      }
    }

    /**
     * 移除事件监听器
     */
    function removeEventListeners() {
      if (webSocketHandler.value) {
        if (webSocketHandler.value instanceof WebSocket) {
          webSocketHandler.value.onmessage = null;
          webSocketHandler.value.onerror = null;
          webSocketHandler.value.onclose = null;
          webSocketHandler.value.onopen = null;
        }
      }
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
        wsMsgList.value = emptyMsgList();
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

