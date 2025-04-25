import { WsMsgBodyType } from "~/types/chat/WsType";


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
 * WebSocket消息处理Hook
 */
export function useWsMessage() {
  // 消息类型映射
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

  // 创建空消息列表
  const emptyMsgList = (): WsMsgItemMap => ({
    /** 1 新消息 */
    newMsg: [],
    /** 2 在线离线通知 */
    onlineNotice: [],
    /** 3 撤回消息 */
    recallMsg: [],
    /** 4 删除消息 */
    deleteMsg: [],
    /** 5 好友申请 */
    applyMsg: [],
    /** 6 群成员变更 */
    memberMsg: [],
    /** 7 token过期 */
    tokenMsg: [],
    /** 8 RTC消息 */
    rtcMsg: [],
    /** 9 置顶联系人 */
    pinContactMsg: [],
    /** 10 AI流式消息 */
    aiStreamMsg: [],
    /** 其他消息 */
    other: [],
  });

  // 消息列表
  const wsMsgList = ref<WsMsgItemMap>(emptyMsgList());

  // 是否有新消息
  const isNewMsg = computed(() => wsMsgList.value.newMsg.length > 0);

  /**
   * 处理接收到的WebSocket消息
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
   * 重置消息列表
   */
  function resetMsgList() {
    wsMsgList.value = emptyMsgList();
  }

  return {
    wsMsgMap,
    wsMsgList,
    isNewMsg,
    processWsMessage,
    resetMsgList,
    emptyMsgList,
  };
}
