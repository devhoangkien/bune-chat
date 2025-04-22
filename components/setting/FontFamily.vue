<script lang="ts" setup>
const setting = useSettingStore();

// 创建临时变量用于滑块实时显示
const tempFontSize = ref(+setting?.settingPage?.fontSize?.value || 16);

// 使用计算属性处理字体大小
const fontSize = computed({
  get: () => tempFontSize.value,
  set: (value: number) => {
    tempFontSize.value = value;
  },
});

// 防抖处理字体大小变化
const updateFontSize = useDebounceFn((value: any) => {
  setting.settingPage.fontSize.value = value;
  applyFontSettings();
}, 200);

// 应用字体设置
function applyFontSettings() {
  const fontSize = setting.settingPage.fontSize.value;
  document.documentElement.style.setProperty("--font-size", `${fontSize}px`);
}
</script>

<template>
  <!-- 字体 -->
  <div class="group h-8 flex-row-bt-c">
    字体设置
    <el-select
      v-model="setting.settingPage.fontFamily.value"

      :teleported="false"
      placement="bottom"
      :show-arrow="false"
      v-bind="$attrs"


      class="inputs"
      fit-input-width allow-create filterable default-first-option
      placeholder="请选择主题字体"
    >
      <el-option
        v-for="item in setting.settingPage.fontFamily.list"
        :key="item.value"
        :value="item.value"
        :label="item.name"
      >
        {{ item.name }}
      </el-option>
    </el-select>
  </div>
  <!-- 字体大小 -->
  <div class="group h-8 flex-row-bt-c">
    字体大小
    <el-slider
      v-model="fontSize"
      :min="10"
      title="双击重置"
      :max="24"
      :step="1"
      v-bind="$attrs"
      class="inputs px-1"
      @dblclick.stop="fontSize = 16"
      @change="updateFontSize"
    />
  </div>
</template>


<style scoped lang="scss">
:deep(.inputs.el-select) {
  position: relative;
  z-index: 99;
  width: fit-content;

  .el-select__wrapper {
    border-radius: 2rem;
    background-color: transparent;
    box-shadow: none;
    font-size: 0.8rem;
    --at-apply: "!border-default";
  }

  .el-select-dropdown__list {
    padding: 0.4rem;
  }
  .el-popper.el-select__popper {
    border-radius: 0.5rem;
    overflow: hidden;
  }
  .el-input__inner {
    padding-left: 2rem;
  }
  .el-select-dropdown__item {
    border-radius: 0.25rem;
  }
}
</style>
