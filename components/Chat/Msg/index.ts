import ContextMenu from "@imengyu/vue3-context-menu";
// @unocss-include
// 常量定义
export const RECALL_TIME_OUT = 300000; // 默认5分钟
const COPY_IMAGE_TYPES = ["image/png", "image/jpg", "image/svg+xml"];

/**
 * 处理消息上下文菜单事件
 * @param {MouseEvent} e - 鼠标事件
 * @param {ChatMessageVO<any>} data - 聊天消息数据
 * @param {Function} onDownLoadFile - 可选的文件下载回调函数
 */
export function onMsgContextMenu(e: MouseEvent, data: ChatMessageVO<any>, onDownLoadFile?: () => any) {
  const chat = useChatStore();
  const user = useUserStore();
  const setting = useSettingStore();
  const showTranslation = ref(false);
  // 阻止默认上下文菜单
  e.preventDefault();

  // 从目标元素获取上下文名称
  let ctxName = String((e?.target as HTMLElement)?.getAttribute?.("ctx-name") || "");
  const isAiReplyMsg = data.message.type === MessageType.AI_CHAT_REPLY;

  // 如果没有上下文名称且不是AI回复，则返回
  if (!ctxName && !isAiReplyMsg) {
    return;
  }

  // 如果是未发送成功的消息
  if (chat.isExsistQueue(data.message.id)) {
    return;
  }

  // 为AI回复设置上下文名称
  if (!ctxName && isAiReplyMsg) {
    ctxName = "aiReply";
  }

  // 权限检查
  const isSelf = user.userInfo.id === data.fromUser.userId;
  const isTheGroupPermission = computed(() => {
    return chat.theContact?.member?.role === ChatRoomRoleEnum.OWNER
      || chat.theContact?.member?.role === ChatRoomRoleEnum.ADMIN;
  });

  // 选中的文本或消息内容
  const txt = window.getSelection()?.toString() || data.message.content;

  // 处理移动端@提及
  if (setting.isMobileSize && ctxName === "avatar" && chat.theContact?.type === RoomType.GROUP) {
    chat.setAtUid(data.fromUser.userId);
    return;
  }

  const translation = data?.message.body?.translation as TranslationVO | null;

  // 大多数消息类型的默认上下文菜单选项
  const defaultContextMenu = [
    {
      label: "撤回",
      hidden: !isSelf || data.message.sendTime < Date.now() - RECALL_TIME_OUT, // 超过5分钟
      customClass: "group",
      icon: "i-solar:backspace-broken group-hover:(scale-110 i-solar:backspace-bold) group-btn-danger",
      onClick: () => refundMsg(data, data.message.id),
    },
    {
      label: "回复",
      customClass: "group",
      icon: "i-solar:arrow-to-down-right-line-duotone -rotate-90 group-hover:(translate-x-1 translate-x-2px) group-btn-info",
      onClick: () => chat.setReplyMsg(data),
    },
    {
      label: "删除",
      customClass: "group",
      divided: "up",
      icon: "i-solar:trash-bin-minimalistic-outline group-hover:(shake i-solar:trash-bin-minimalistic-bold) group-btn-danger",
      hidden: !isTheGroupPermission.value,
      onClick: () => deleteMsg(data, data.message.id),
    },
  ];

  // 不同消息类型的上下文菜单配置
  const contextMenuType: Record<string, any> = {
    // 文本内容
    content: [
      {
        label: "复制",
        hidden: !txt,
        customClass: "group",
        icon: "i-solar-copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: () => {
          if (!txt) {
            return ElMessage.error("复制失败，请选择文本！");
          }
          useCopyText(txt as string);
        },
      },
      {
        label: translation ? "关闭翻译" : "翻译",
        hidden: !txt,
        customClass: "group",
        icon: `i-solar:text-field-focus-line-duotone group-hover:(scale-110 i-solar:text-field-focus-bold) ${translation ? "group-btn-danger" : "group-btn-success"}`,
        onClick: async () => {
          if (translation) {
            closeTranslation(data.message.id, translation.targetLang);
            data.message.body._textTranslation = null;
          }
          else {
            const res = await useTranslateTxt(data.message.id, data.message.content as string, user.getToken);
            if (res) {
              data.message.body._textTranslation = res;
            }
            else {
              ElMessage.error("翻译失败，请稍后再试！");
            }
          }
        },
      },
      {
        label: "打开链接",
        hidden: !txt || !txt?.match(/https?:\/\/\S+/g)?.length,
        customClass: "group",
        icon: "i-solar:link-line-duotone group-hover:(scale-110 i-solar:link-bold-duotone) group-btn-info",
        onClick: () => {
          if (!txt)
            return;
          const urls = txt?.match(/https?:\/\/\S+/g);
          if (!urls?.length) {
            return ElMessage.error("抱歉找不到链接！");
          }
          if (urls.length === 1) {
            return window.open(urls[0], "_blank");
          }
        },
      },
      {
        label: "搜一搜",
        hidden: !data.message.content,
        customClass: "group",
        icon: "i-solar:magnifer-linear group-hover:(rotate-15 i-solar:magnifer-bold) group-btn-info",
        onClick: () => {
          if (!txt) {
            return ElMessage.error("选择内容为空，无法搜索！");
          }
          const bingUrl = `https://bing.com/search?q=${encodeURIComponent(txt as string)}`;
          window.open(bingUrl, "_blank");
        },
      },
      ...defaultContextMenu,
    ],
    // 翻译
    translation: [
      {
        label: "复制翻译",
        hidden: !txt || !data.message.body._textTranslation,
        customClass: "group",
        icon: "i-solar-copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: () => {
          useCopyText(data.message.body._textTranslation?.result as string);
        },
      },
      {
        label: "关闭翻译",
        hidden: !txt || !data.message.body._textTranslation,
        customClass: "group",
        icon: "i-solar:text-field-focus-line-duotone group-hover:(scale-110 i-solar:text-field-focus-bold) group-btn-danger",
        onClick: async () => {
          if (!txt || !data.message.id || !translation)
            return;
          if (closeTranslation(data.message.id, translation.targetLang)) {
            //
            data.message.body._textTranslation = null;
          }
        },
      },
    ],

    // 图片内容
    img: [
      {
        label: "复制",
        customClass: "group",
        hidden: !data.message.body.url || setting.isMobile,
        icon: "i-solar:copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: async () => {
          let img = await getImgBlob(BaseUrlImg + data.message.body.url);
          if (!img) {
            return ElMessage.error("图片加载失败！");
          }

          if (!COPY_IMAGE_TYPES.includes(img.type)) {
            img = await convertImgToPng(img);
          }

          if (!img) {
            return ElMessage.error("图片处理失败！");
          }

          const { copy, isSupported } = useClipboardItems({
            read: false,
            source: [new ClipboardItem({ [img.type]: img })],
          });

          if (isSupported.value) {
            copy()
              .then(() => {
                ElMessage.success("图片已复制到剪切板！");
              })
              .catch((e) => {
                console.warn(e);
                ElMessage.error("复制失败，请手动保存！");
              });
            img = null;
          }
          else {
            ElMessage.error("当前设备不支持复制图片！");
            img = null;
          }
        },
      },
      {
        label: "保存图片",
        customClass: "group",
        hidden: !data.message.body.url,
        icon: "i-solar-download-minimalistic-broken group-hover:(translate-y-2px i-solar-download-minimalistic-bold) group-btn-success",
        onClick: async () => saveImageLocal(BaseUrlImg + data.message.body.url),
      },
      ...defaultContextMenu,
    ],

    // 文件内容
    file: [
      {
        label: setting.fileDownloadMap?.[BaseUrlFile + data.message.body.url] ? "打开文件" : "下载文件",
        hidden: setting.isWeb || data.message.type !== MessageType.FILE,
        customClass: "group",
        icon: setting.fileDownloadMap?.[BaseUrlFile + data.message.body.url]
          ? "i-solar-file-line-duotone group-hover:(scale-110 i-solar-file-bold-duotone) group-btn-info"
          : "i-solar-download-minimalistic-broken group-hover:(translate-y-2px i-solar-download-minimalistic-bold) group-btn-success",
        onClick: () => onDownLoadFile && onDownLoadFile(),
      },
      {
        label: "文件夹打开",
        hidden: setting.isWeb || data.message.type !== MessageType.FILE
          || !setting.fileDownloadMap?.[BaseUrlFile + data.message.body.url],
        customClass: "group",
        icon: "i-solar:folder-with-files-line-duotone group-hover:(scale-110 i-solar:folder-with-files-bold-duotone) group-btn-info",
        onClick: () => setting.openFileFolder(setting.fileDownloadMap?.[BaseUrlFile + data.message.body.url] as FileItem),
      },
      ...defaultContextMenu,
    ],

    // 语音内容
    sound: [
      {
        label: showTranslation.value ? "折叠转文字" : "转文字",
        hidden: data.message.type !== MessageType.SOUND || !translation,
        customClass: "group",
        icon: "i-solar:text-broken group-hover:(scale-110 i-solar:text-bold) group-btn-info",
        onClick: () => (showTranslation.value = !showTranslation.value),
      },
      ...defaultContextMenu,
    ],

    // 昵称内容
    nickname: [
      {
        label: "复制",
        hidden: !data.fromUser.nickName,
        customClass: "group",
        icon: "i-solar-copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: () => {
          const txt = window.getSelection()?.toString() || data.fromUser.nickName;
          useCopyText(txt as string);
        },
      },
      {
        label: "个人资料",
        icon: "i-solar:user-broken group-hover:(scale-110 i-solar:user-bold) group-btn-info",
        customClass: "group",
        hidden: isSelf,
        onClick: () => navigateToUserDetail(data.fromUser.userId),
      },
      {
        label: "TA",
        icon: "i-solar:mention-circle-broken group-hover:(rotate-15 i-solar:mention-circle-bold) group-btn-info",
        customClass: "group",
        hidden: isSelf || chat.theContact.type === RoomType.SELFT,
        onClick: () => chat.setAtUid(data.fromUser.userId),
      },
    ],

    // 头像内容
    avatar: [
      {
        label: isSelf ? "查看自己" : "个人资料",
        icon: "i-solar:user-broken group-btn-info",
        customClass: "group",
        onClick: () => navigateToUserDetail(data.fromUser.userId),
      },
      {
        label: "TA",
        icon: "i-solar:mention-circle-broken group-btn-info",
        customClass: "group",
        hidden: isSelf || chat.theContact.type === RoomType.SELFT,
        onClick: () => chat.setAtUid(data.fromUser.userId),
      },
    ],

    // RTC通话内容
    rtc: [
      {
        label: "重新拨打",
        icon: "i-solar:call-dropped-bold p-2.6 group-btn-warning",
        customClass: "group",
        onClick: () => chat.rollbackCall(data.message.roomId, data.message.body?.type, data),
      },
      {
        label: "回复",
        icon: "i-solar:arrow-to-down-right-line-duotone -rotate-90 group-btn-info",
        onClick: () => chat.setReplyMsg(data),
      },
    ],

    // 视频内容
    video: [
      {
        label: "静音播放",
        icon: "i-solar:volume-cross-line-duotone group-hover:(scale-110 i-solar:volume-cross-bold-duotone) group-btn-warning",
        customClass: "group",
        onClick: () => {
          const body = data.message.body as VideoBodyMsgVO;
          if (!body?.url) {
            return;
          }

          mitter.emit(MittEventType.VIDEO_READY, {
            type: "play-dbsound",
            payload: {
              mouseX: e.clientX,
              mouseY: e.clientY,
              url: BaseUrlVideo + body.url,
              duration: body.duration,
              size: body.size,
              thumbUrl: BaseUrlImg + body.thumbUrl,
              thumbSize: body.thumbSize,
              thumbWidth: body.thumbWidth,
              thumbHeight: body.thumbHeight,
            },
          });
        },
      },
      {
        label: "另存视频",
        icon: "i-solar:download-line-duotone group-hover:(scale-110 i-solar:download-bold-duotone) group-btn-success",
        customClass: "group",
        onClick: async () => saveVideoLocal(BaseUrlVideo + data.message.body.url),
      },
      ...defaultContextMenu,
    ],

    // AI回复内容
    aiReply: [
      {
        label: "分享图片",
        icon: "i-solar:share-line-duotone group-hover:(scale-110 i-solar:share-bold-duotone) group-btn-war",
        customClass: "group",
        onClick: () => {
          ElMessage.warning("暂不支持分享图片");
        },
      },
      {
        label: "复制",
        hidden: !txt,
        customClass: "group",
        icon: "i-solar-copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: () => {
          if (!txt) {
            return ElMessage.error("复制失败，请选择文本！");
          }
          useCopyText(txt as string);
        },
      },
      {
        label: translation ? "关闭翻译" : "翻译",
        hidden: !txt,
        customClass: "group",
        icon: `i-solar:text-field-focus-line-duotone group-hover:(scale-110 i-solar:text-field-focus-bold) ${translation ? "group-btn-danger" : "group-btn-success"}`,
        onClick: async () => {
          if (translation) {
            closeTranslation(data.message.id, translation.targetLang);
            data.message.body._textTranslation = null;
          }
          else {
            const res = await useTranslateTxt(data.message.id, data.message.content as string, user.getToken);
            if (res) {
              data.message.body._textTranslation = res;
            }
            else {
              ElMessage.error("翻译失败，请稍后再试！");
            }
          }
        },
      },
      {
        label: "搜一搜",
        hidden: !data.message.content,
        customClass: "group",
        icon: "i-solar:magnifer-linear group-hover:(rotate-15 i-solar:magnifer-bold) group-btn-info",
        onClick: () => {
          if (!txt) {
            return ElMessage.error("选择内容为空，无法搜索！");
          }
          const bingUrl = `https://bing.com/search?q=${encodeURIComponent(txt as string)}`;
          window.open(bingUrl, "_blank");
        },
      },
      ...defaultContextMenu,
    ],
  };

  // 获取适当的上下文菜单项
  const items = contextMenuType[ctxName] || [];
  if (items.length === 0) {
    return;
  }

  // 显示上下文菜单
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    theme: setting.contextMenuTheme,
    items,
  });
}

/**
 * 撤回消息
 * @param {ChatMessageVO} data - 消息数据
 * @param {number} msgId - 消息ID
 */
async function refundMsg(data: ChatMessageVO<any>, msgId: number) {
  const oldData = JSON.parse(JSON.stringify(data));
  const user = useUserStore();
  const chat = useChatStore();
  const roomId = data.message.roomId;

  const res = await refundChatMessage(roomId, msgId, user.getToken);

  if (res.code === StatusCode.SUCCESS) {
    if (data.message.id === msgId) {
      if (data.message.content) {
        // 存储撤回的消息以便潜在的恢复
        chat.setRecallMsg(oldData);
      }

      data.message.type = MessageType.RECALL;
      data.message.content = `${data.fromUser.userId === user.userInfo.id ? "我" : `"${data.fromUser.nickName}"`}撤回了一条消息`;
      data.message.body = undefined;
    }
  }
}

/**
 * 删除消息
 * @param {ChatMessageVO} data - 消息数据
 * @param {number} msgId - 消息ID
 */
function deleteMsg(data: ChatMessageVO<any>, msgId: number) {
  ElMessageBox.confirm("是否确认删除消息？", "删除提示", {
    lockScroll: false,
    confirmButtonText: "确 认",
    confirmButtonClass: "el-button--primary is-plain border-default",
    cancelButtonText: "取 消",
    center: true,
    callback: async (action: string) => {
      if (action !== "confirm")
        return;

      const user = useUserStore();
      const roomId = data.message.roomId;

      const res = await deleteChatMessage(roomId, msgId, user.getToken);

      if (res.code === StatusCode.SUCCESS) {
        if (data.message.id === msgId) {
          data.message.type = MessageType.DELETE;
          data.message.content = `${
            data.fromUser.userId === user.userInfo.id
              ? "我删除了一条消息"
              : `我删除了一条"${data.fromUser.nickName}"成员消息`
          }`;
          data.message.body = undefined;
        }
      }
    },
  });
}

export interface ImgSizeOptions {
  maxWidth: number;
  maxHeight: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * 获取图片尺寸
 * @param {number} rawWidth - 原始宽度
 * @param {number} rawWeight - 原始高度
 * @returns {object} 图片尺寸对象
 */
export function getImgSize(rawWidth?: number, rawWeight?: number, options: ImgSizeOptions = { maxWidth: 280, maxHeight: 280, minWidth: 40, minHeight: 40 }) {
  const width = rawWidth || 0;
  const height = rawWeight || 0;
  const { maxWidth = 300, maxHeight = 300, minWidth = 40, minHeight = 40 } = options;

  // 提前返回默认值
  if (!width || !height) {
    return {
      width: "",
      height: "",
    };
  }
  const ratio = width / height;
  const maxRatio = maxWidth / maxHeight;

  let finalWidth: number;
  let finalHeight: number;

  if (ratio > maxRatio) {
    // 宽度优先
    finalWidth = Math.min(width, maxWidth);
    finalHeight = finalWidth / ratio;
  }
  else {
    // 高度优先
    finalHeight = Math.min(height, maxHeight);
    finalWidth = finalHeight * ratio;
  }

  return {
    width: `${Math.max(finalWidth, minWidth)}px`,
    height: `${Math.max(finalHeight, minHeight)}px`,
  };
}
