
/**
 * 获取消息列表（游标）
 * @param roomId 房间号
 * @param pageSize 大小
 * @param cursor 游标
 * @param token token
 * @returns 分页
 */
export function getChatMessagePage(roomId: number, pageSize = 10, cursor: string | number | null = null, token: string) {
  return useHttp.get<Result<CursorPage<ChatMessageVO>>>(
    "/chat/message/page",
    {
      roomId,
      pageSize,
      cursor,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
  // if (res.code === StatusCode.SUCCESS) {
  //   res.data.list.
  // }
  // return res;
}
export function getDBMsgPage(roomId: number, pageSize = 10, cursor: string | number | null = null): Promise<Result<CursorPage<ChatMessageVO>>> {
  const res = {
    data: {
      list: [],
      cursor: null,
      isLast: false,
    },
    code: StatusCode.SUCCESS,
    message: "",
  } as Result<CursorPage<ChatMessageVO>>;
  // const db = useDB().getItem("message", "roomId");
  return Promise.resolve(res);
}


/**
 * 发送消息
 * @param dto 参数
 * @param token tokn
 * @returns 发送的组合消息
 */
export function addChatMessage(dto: ChatMessageDTO, token: string) {
  return useHttp.post<Result<ChatMessageVO>>(
    "/chat/message",
    { ...dto },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}


/**
 * 撤回消息
 * @param roomId 房间号
 * @param id 消息id
 * @param token 身份
 * @returns 影响行
 */
export function refundChatMessage(roomId: number, id: number, token: string) {
  return useHttp.put<Result<ChatMessageVO>>(
    `/chat/message/recall/${roomId}/${id}`,
    {},
    {
      headers: {
        Authorization: token,
      },
    },
  );
}

/**
 * 删除消息
 * @param roomId 房间号
 * @param id 消息id
 * @param token 身份
 * @returns 影响行
 */
export function deleteChatMessage(roomId: number, id: number, token: string) {
  return useHttp.deleted<Result<ChatMessageVO>>(
    `/chat/message/recall/${roomId}/${id}`,
    {},
    {
      headers: {
        Authorization: token,
      },
    },
  );
}


/**
 * 获取消息的已读未读列表（单条消息）

 * @param msgId 消息id
 * @param searchType 类型
 * @param pageSize 页码
 * @param cursor 游标
 * @param token 身份
 * @returns 数据
 */
export function getChatMessageReadPage(msgId: number, searchType: number, pageSize = 10, cursor: string | number | null = null, token: string) {
  return useHttp.get<Result<CursorPage<ChatMessageReadVO>>>(
    "/chat/message/read/page",
    {
      msgId,
      pageSize,
      searchType,
      cursor,
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}

/**
 * 消息阅读上报
 * @param roomId 房间号
 * @param token 身份
 * @returns 影响
 */
export function setMsgReadByRoomId(roomId: number, token: string) {
  return useHttp.put<Result<number>>(
    `/chat/message/msg/read/${roomId}`,
    {
    },
    {
      headers: {
        Authorization: token,
      },
    },
  );
}


export enum MessageType {
  TEXT = 1,
  RECALL = 2,
  IMG = 3,
  FILE = 4,
  SOUND = 5,
  VIDEO = 6,
  EMOJI = 7, // 暂无
  SYSTEM = 8,
  AI_CHAT = 9, // AI发起人消息
  DELETE = 10,
  RTC = 11, // rtc通话
  AI_CHAT_REPLY = 12, // AI回复消息
  GROUP_NOTICE = 13, // 群通知消息
}


/**
 * 消息返回体
 * Date: 2023-03-23
 *
 * ChatMessageVO
 */
export interface ChatMessageVO<T = any> {
  /**
   * 发送者信息
   */
  fromUser: ChatUserInfo;
  /**
   * 消息详情
   */
  message: Message<T>;
}

/**
 * 发送者信息
 *
 * UserInfo
 */
export interface ChatUserInfo {
  userId: string;
  avatar?: null | string;
  gender?: Gender;
  nickName: string;
  [property: string]: any;
}
/**
 * 消息详情
 *
 * Message
 */
export interface Message<T> {
  id: number;
  roomId: number;
  sendTime: number;
  /**
   * 文本内容
   */
  content?: null | string;
  /**
   * 消息类型
   */
  type?: MessageType;
  /**
   * 消息内容不同的消息类型，内容体不同，见https://www.yuque.com/snab/mallcaht/rkb2uz5k1qqdmcmd
   */
  body?: T;
  // body?:T  MessageBodyMap[MessageType] | ;
}

export interface MessageBodyMap {
  [MessageType.TEXT]: TextBodyMsgVO;
  [MessageType.RECALL]: string;
  [MessageType.IMG]: ImgBodyMsgVO;
  [MessageType.FILE]: FileBodyMsgVO;
  [MessageType.SOUND]: SoundBodyMsgVO;
  [MessageType.VIDEO]: VideoBodyMsgVO;
  [MessageType.EMOJI]: any; //   暂无
  [MessageType.SYSTEM]: SystemBodyMsgVO;
  [MessageType.AI_CHAT]: AiChatBodyMsgVO;
  [MessageType.DELETE]: string;
  [MessageType.RTC]: RtcLiteBodyMsgVO;
  [MessageType.AI_CHAT_REPLY]: AiChatReplyBodyMsgVO;
  [MessageType.GROUP_NOTICE]: GroupNoticeBodyMsgVO;
}

/**
 * 文本消息
 */
export interface TextBodyMsgVO {
  // content: string;
  urlContentMap: { [key: string]: UrlInfoDTO };
  atUidList: string[];
  reply: {
    id: number;
    uid: string;
    nickName: string;
    type: MessageType;
    canCallback: isTrue;
    gapCount: number;
    body?: string
  };
  // [property: string]: any;
}
/**
 * 系统消息
 */
export type SystemBodyMsgVO = string;

/**
 * 群通知
 */
export interface GroupNoticeBodyMsgVO {
  noticeAll?: isTrue;
  imgList: string[];
  reply: {
    id: number;
    uid: string;
    nickName: string;
    type: MessageType;
    canCallback: isTrue;
    gapCount: number;
    body?: string
  }
}

export interface UrlInfoDTO {
  title?: string;
  description?: string;
  /**
   * 网站LOGO
   */
  image?: string;

}

/**
 * 语音消息
 */
export interface SoundBodyMsgVO {
  url: string;
  second: number;
  translation?: string; // 转文本
  reply: {
    id: number;
    uid: string;
    nickName: string;
    type: MessageType;
    canCallback: isTrue;
    gapCount: number;
  };
}
/**
 * 图片消息
 */
export interface ImgBodyMsgVO {
  url: string;
  size?: number;
  width?: number;
  height?: number;
  reply: {
    id: number;
    uid: string;
    nickName: string;
    type: MessageType;
    /**
     * 是否可消息跳转 0否 1是
     */
    canCallback: isTrue;
    /**
     * 跳转间隔的消息条数
     */
    gapCount: number;
    body?: any;
  };
}


/**
 * 视频消息
 */
export interface VideoBodyMsgVO {
  url: string;
  size?: number;
  duration: number;
  thumbUrl: string;
  thumbSize?: number;
  thumbWidth?: number;
  thumbHeight?: number;
  reply: {
    id: number;
    uid: string;
    nickName: string;
    type: MessageType;
    /**
     * 是否可消息跳转 0否 1是
     */
    canCallback: isTrue;
    /**
     * 跳转间隔的消息条数
     */
    gapCount: number;
    body?: any;
  };
}

/**
 * 文件消息
 */
export interface FileBodyMsgVO {
  url: string;
  size: number;
  fileName: string;
  mimeType?: string;
  fileType?: FileBodyMsgTypeEnum;
  reply: {
    id: number;
    uid: string;
    nickName: string;
    type: MessageType;
    /**
     * 是否可消息跳转 0否 1是
     */
    canCallback: isTrue;
    /**
     * 跳转间隔的消息条数
     */
    gapCount: number;
    body?: any;
  };
}


/**
 * RTC消息 （公共系统显示的）
 */
export interface RtcLiteBodyMsgVO {
  // 发送者ID
  senderId?: string;
  // 通话状态
  status: CallStatusEnum;
  // 通话状态文本
  statusText: string;
  // 通话类型
  type: CallTypeEnum;
  // 通话类型文本
  typeText: string;
  // 开始时间戳
  startTime?: number;
  // 结束时间戳
  endTime?: number;
  // 通话时长文本
  durationText?: string;
}

/**
 * AI发起人消息
 */
export interface AiChatBodyMsgVO {
  /**
   * 机器人id
   */
  userId: string;
  /**
   * 机器人信息
   */
  robotInfo: RobotUserVO;
  /**
   * 机器人列表
   */
  robotList: RobotUserVO[];
  /**
   * 机器人业务类型
   * 文生 1：文本 2：图片 3：视频
   */
  businessCode: AiBusinessType;
}

/** AI回复消息 */
export interface AiChatReplyBodyMsgVO {
  content?: string;
  urlContentMap?: { [key: string]: UrlInfoDTO };
  atUidList?: string[];
  reply?: {
    id: number;
    uid: string;
    nickName: string;
    type: MessageType;
    canCallback: isTrue;
    gapCount: number;
    body?: string
  };
  status: AiReplyStatusEnum;
  /**
   * 部分模型的思考经过
   */
  reasoningContent?: string;
  // imgMsgDTO?: ImgBodyMsgVO;
  // videoMsgDTO?: VideoBodyMsgVO;
}

export enum FileBodyMsgTypeEnum {
  //  "TXT" | "EXCEL" | "XLSX" | "PDF" | "PPT" | "PPTX" | "DOC" | "DOCX"
  TXT = "TXT",
  EXCEL = "EXCEL",
  XLSX = "XLSX",
  PDF = "PDF",
  PPT = "PPT",
  PPTX = "PPTX",
  DOC = "DOC",
  DOCX = "DOCX",
}
export const MessageTypeText = {
  [MessageType.TEXT]: "正常消息",
  [MessageType.RECALL]: "撤回消息",
  [MessageType.IMG]: "图片",
  [MessageType.FILE]: "文件",
  [MessageType.SOUND]: "语音",
  [MessageType.VIDEO]: "视频",
  [MessageType.EMOJI]: "表情",
  [MessageType.SYSTEM]: "系统消息",
  [MessageType.AI_CHAT]: "机器人消息",
  [MessageType.DELETE]: "删除消息",
  [MessageType.RTC]: "RTC通讯消息",
  [MessageType.AI_CHAT_REPLY]: "AI回复消息",
  [MessageType.GROUP_NOTICE]: "群通知消息",
};


export type CanSendMessageType = MessageType.TEXT | MessageType.IMG | MessageType.SOUND | MessageType.VIDEO | MessageType.FILE | MessageType.AI_CHAT | MessageType.GROUP_NOTICE;

/**
 * ChatMessageDTO
 */
export interface ChatMessageDTO {
  /**
   * 房间id
   */
  roomId: number;
  /**
   * 文本消息（可选）
   */
  content?: string;
  /**
   * 消息类型
   */
  msgType?: CanSendMessageType;
  /**
   * 消息内容，类型不同传值不同
   */
  body?: MessageBodyDTOMap[CanSendMessageType] | any;
}

/**
 * 表单提交消息Body的类型
 */
interface MessageBodyDTOMap {
  [MessageType.TEXT]: TextBodyDTO;
  [MessageType.IMG]: ImgBodyDTO;
  [MessageType.SOUND]: SoundBodyDTO;
  [MessageType.RECALL]: RecallBodyDTO;
  [MessageType.VIDEO]: VideoBodyDTO;
  [MessageType.FILE]: FileBodyDTO;
  [MessageType.AI_CHAT]: AiChatBodyDTO;
  [MessageType.GROUP_NOTICE]: GroupNoticeBodyDTO;
}
export interface TextBodyDTO {
  replyMsgId?: string;
  atUidList?: string[];
}
export interface ImgBodyDTO {
  url: string;
  size?: number;
  width?: number;
  height?: number;
  replyMsgId?: string;
}
export interface SoundBodyDTO {
  fileName: string;
  url: string;
  second: number;
}
export interface RecallBodyDTO {
  recallUid?: string;
  recallTime?: number;
}

export interface FileBodyDTO {
  url: string;
  size: number;
  fileType?: FileBodyMsgTypeEnum;
  mimeType?: string;
}

export interface VideoBodyDTO {
  url: string;
  size?: number;
  duration: number;
  thumbUrl: string;
  thumbSize?: number;
  thumbWidth?: number;
  thumbHeight?: number;
}

export interface AiChatBodyDTO {
  // modelCode: number;
  businessCode: AiBusinessType;
  content: string;
}

export interface GroupNoticeBodyDTO {
  replyMsgId?: string;
  noticeAll?: isTrue;
  imgList?: string[];
}

/**
 * 消息已读未读VO
 *
 * ChatMessageReadVO
 */
export interface ChatMessageReadVO {
  /**
   * 已读或者未读的用户uid
   */
  uid?: null | string;
  [property: string]: any;
}

export enum ChatReadType {
  /**
   * 已读
   */
  READ = 0,
  /**
   * 未读
   */
  UNREAD = 1,
}
