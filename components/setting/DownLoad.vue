<script lang="ts" setup>
import { openPath } from "@tauri-apps/plugin-opener";

const setting = useSettingStore();

// 打开下载文件夹
async function openFileFolder() {
  if (!await existsFile(setting.appDataDownloadDirUrl)) {
    ElMessageBox.confirm("下载目录不存在，是否创建？", {
      title: "提示",
      center: true,
      confirmButtonText: "创建",
      cancelButtonText: "取消",
      confirmButtonClass: "el-button-warning",
      lockScroll: true,
      callback: async (action: string) => {
        if (action === "confirm") {
          mkdirFile(setting.appDataDownloadDirUrl);
        }
      },
    });
    return;
  }
  await openPath(setting.appDataDownloadDirUrl);
}
</script>

<template>
  <div v-if="!setting.isWeb" class="group h-8 flex-row-bt-c">
    下载
    <div class="ml-a flex items-center gap-3" :title="setting.appDataDownloadDirUrl">
      <small class="mr-2 max-w-40vw flex-1 truncate op-60">{{ setting.appDataDownloadDirUrl }}</small>
      <span
        class="cursor-pointer text-0.8rem tracking-0.1em !btn-warning"
        @click="setting.changeDownloadDir()"
      >更改</span>
      <span
        class="cursor-pointer text-0.8rem tracking-0.1em !btn-info"
        @click="openFileFolder()"
      >打开目录</span>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
