<script lang="ts" setup>
const {
  animteClass = "", // sky-loading
} = defineProps<{
  isSelf?: boolean;
  animteClass?: string;
}>();
</script>

<template>
  <div
    class="h-18 w-full flex cursor-pointer items-center gap-3 sm:(card-rounded-df mb-2 w-full border-transparent card-bg-color p-3 text-color) p-4 text-sm card-bg-color dark:bg-transparent !hover:bg-[#f8f8f8] !dark:hover:bg-[#151515]"
  >
    <!-- 头像 -->
    <div
      class="h-2.6rem w-2.6rem flex-shrink-0 rounded bg-light-400 object-cover dark:bg-dark-400"
      :class="animteClass"
    />
    <!-- 信息 -->
    <div class="info-skeleton">
      <!-- 昵称 -->
      <div
        :class="animteClass"
        class="nickname-skeleton h-3 w-8em rounded bg-light-400 dark:bg-dark-400"
      />
      <!-- 最近消息 -->
      <div
        class="mt-4 h-3 w-10em rounded bg-light-400 dark:bg-dark-400"
        :class="animteClass"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
</style>
