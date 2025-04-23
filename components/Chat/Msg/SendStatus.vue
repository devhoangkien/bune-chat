<script lang="ts" setup>
const {
  status,
} = defineProps<{
  status: MessageSendStatus
  msgId: any
}>();
const chat = useChatStore();
const titleMap: Record<MessageSendStatus, { title: string, className?: string }> = {
  [MessageSendStatus.ERROR]: {
    title: "发送失败，点击重试",
    className: "i-solar:refresh-linear  bg-theme-danger hover:rotate-180 btn-danger",
  },
  [MessageSendStatus.PENDING]: {
    title: "待发送",
    className: "i-solar:clock-circle-line-duotone op-60",
  },
  [MessageSendStatus.SENDING]: {
    title: "发送中...",
    className: "i-ri:loader-5-line  animate-spin h-5 w-5 op-70",
  },
  [MessageSendStatus.SUCCESS]: {
    title: "",
  },
};
const types = computed(() => titleMap[status as MessageSendStatus]);
</script>

<template>
  <i
    v-if="status"
    :title="types?.title"
    class="my-a inline-block h-4.5 w-4.5"
    :class="types?.className"
    @click="chat.retryMessage(msgId)"
  />
</template>

<style lang="scss" scoped>
</style>
