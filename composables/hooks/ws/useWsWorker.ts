import { WsStatusEnum } from "~/types/chat/WsType";

/**
 * WebSocket Worker管理Hook
 */
export function useWsWorker() {
  const isReload = ref(false);
  const worker = shallowRef<Worker>();
  const ws = useWsStore();
  const user = useUserStore();

  /**
   * 初始化Web Worker
   */
  async function initWorker() {
    if (isReload.value)
      return;

    console.log("web worker reload");
    isReload.value = true;

    // 关闭现有连接
    worker.value?.terminate?.();
    await ws?.close?.(false);

    if (!user?.getTokenFn()) {
      isReload.value = false;
      return;
    }

    // 创建新Worker
    worker.value = new Worker("/useWsWorker.js");

    // 设置Worker消息处理
    setupWorkerHandlers();

    isReload.value = false;
    return worker.value;
  }

  /**
   * 设置Worker事件处理器
   */
  function setupWorkerHandlers() {
    if (!worker.value)
      return;

    // Web Worker 消息处理
    worker.value.onmessage = (e) => {
      if (e.data.type === "reload")
        reload();
      if (e.data.type === "heart") {
        if (ws.status !== WsStatusEnum.OPEN || !ws.webSocketHandler)
          return reload();
        ws.sendHeart();
      }
      if (e.data.type === "log")
        console.log(e.data.data);
    };

    // Web Worker 错误处理
    worker.value.onerror = (e) => {
      console.error(e);
      reload();
    };

    // Web Worker 消息错误处理
    worker.value.onmessageerror = (e) => {
      console.error(e);
      reload();
    };
  }

  /**
   * 重新加载Worker
   */
  async function reload() {
    await initWorker();

    // 初始化WebSocket连接
    ws.initDefault(() => {
      // 设置消息处理
      setupMessageHandlers();

      // 发送状态到Worker
      sendStatusToWorker();
    });
  }

  /**
   * 设置消息处理器
   */
  function setupMessageHandlers() {
    const { handleNotification } = useWsNotification();
    ws.onMessage(handleNotification);
  }

  /**
   * 发送状态到Worker
   */
  function sendStatusToWorker() {
    if (!worker.value)
      return;

    const { noticeType } = useWsNotification();
    worker.value.postMessage({
      status: ws.status,
      noticeType,
    });
  }

  /**
   * 清理Worker
   */
  function cleanupWorker() {
    worker.value?.terminate?.();
    worker.value = undefined;
  }

  return {
    worker,
    isReload,
    initWorker,
    reload,
    cleanupWorker,
  };
}
