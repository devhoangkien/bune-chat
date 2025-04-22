<script lang="ts" setup>
import { getImgSize } from ".";

/**
 * 图片消息
 */
const {
  data,
} = defineProps<{
  data: ChatMessageVO<ImgBodyMsgVO>
  prevMsg: Partial<ChatMessageVO<TextBodyMsgVO>>
  index: number
}>();

// 获取聊天store
const chat = useChatStore();
// 具体
const body: Partial<ImgBodyMsgVO> & { showWidth?: string, showHeight?: string } = data.message?.body || {};
// 计算图片宽高
const { width, height } = getImgSize(body?.width, body?.height);
body.showWidth = width;
body.showHeight = height;

// 处理图片点击预览
function handleImagePreview() {
  if (!body?.url)
    return;

  // 获取当前房间的所有图片
  const imgs = chat.theContact?.msgList?.filter(msg => msg.message?.type === MessageType.IMG) as ChatMessageVO<ImgBodyMsgVO>[];
  if (!imgs?.length)
    return;
  const currentImgUrl = BaseUrlImg + body?.url;
  const imgsUrl = imgs.map(msg => BaseUrlImg + msg.message?.body?.url);
  useImageViewer.open({
    urlList: imgsUrl,
    index: imgsUrl.indexOf(currentImgUrl),
    ctxName: "img",
  });
}
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  >
    <template #body>
      <!-- 内容 -->
      <div
        v-if="body?.url"
        ctx-name="img"
        :style="{ width, height }"
        class="max-h-50vh max-w-76vw cursor-pointer shadow-sm transition-shadow md:(max-h-18rem max-w-18rem) border-default-2 card-default hover:shadow"
        @click="handleImagePreview"
      >
        <CardElImage
          :src="BaseUrlImg + body?.url"
          load-class="sky-loading block absolute  top-0"
          class="h-full w-full card-rounded-df"
          :alt="body?.url"
          fit="cover"
          ctx-name="img"
          :preview="false"
        />
      </div>
      <!-- 内容 -->
      <p v-if="data.message?.content?.trim()" ctx-name="content" class="msg-popper msg-wrap">
        {{ data.message.content }}
      </p>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use './msg.scss';
</style>
