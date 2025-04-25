import type { Message as BackMessage } from "@tauri-apps/plugin-websocket";
import type { WsSendMsgDTO } from "~/types/chat/WsType";
import BackWebSocket from "@tauri-apps/plugin-websocket";
import { WsMsgType, WsStatusEnum } from "~/types/chat/WsType";

/**
 * WebSocket核心Hook
 * 提供WebSocket基础功能
 */
export function useWebSocket() {
  const webSocketHandler = ref<WebSocket | BackWebSocket | null>(null);
  const fullWsUrl = ref<string>("");
  const status = ref<WsStatusEnum>(WsStatusEnum.CLOSE);

  /**
   * 处理WebSocket错误和关闭事件
   */
  const handleSocketEvent = (eventType: "error" | "close", wsStatus: WsStatusEnum) => {
    return (e: Event) => {
      status.value = wsStatus;
      webSocketHandler.value = null;
    };
  };

  /**
   * 初始化浏览器原生WebSocket
   */
  function initBrowserWebSocket(url: string, call: () => any) {
    status.value = WsStatusEnum.CONNECTION;
    webSocketHandler.value = new WebSocket(url);
    status.value = WsStatusEnum.OPEN;

    if (!webSocketHandler.value) {
      status.value = WsStatusEnum.SAFE_CLOSE;
      return null;
    }

    // 设置事件处理器
    webSocketHandler.value.onopen = call;
    webSocketHandler.value.addEventListener("error", handleSocketEvent("error", WsStatusEnum.CLOSE));
    webSocketHandler.value.addEventListener("close", handleSocketEvent("close", WsStatusEnum.SAFE_CLOSE));

    return webSocketHandler.value;
  }

  /**
   * 初始化Tauri WebSocket
   */
  async function initTauriWebSocket(url: string, call: () => any) {
    try {
      const ws = await BackWebSocket.connect(url);
      webSocketHandler.value = ws;

      // 设置状态
      status.value = ws.id ? WsStatusEnum.OPEN : WsStatusEnum.CLOSE;

      if (ws.id) {
        call();
      }

      return ws;
    }
    catch (err) {
      console.error("初始化Tauri WebSocket失败:", err);
      status.value = WsStatusEnum.CLOSE;
      return null;
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
   * 移除事件监听器
   */
  function removeEventListeners() {
    if (webSocketHandler.value && webSocketHandler.value instanceof WebSocket) {
      webSocketHandler.value.onmessage = null;
      webSocketHandler.value.onerror = null;
      webSocketHandler.value.onclose = null;
      webSocketHandler.value.onopen = null;
    }
  }

  /**
   * 发送消息
   */
  function send(dto: WsSendMsgDTO) {
    if (status.value === WsStatusEnum.OPEN && webSocketHandler.value) {
      webSocketHandler.value.send(JSON.stringify(dto));
    }
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

  return {
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
  };
}
