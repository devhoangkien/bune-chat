<script lang="ts" setup>
import { ArrowDown } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";

const { locales, locale, setLocale } = useI18n();
const availableLocales = computed(() => {
  return locales.value.filter(i => i.code !== locale.value);
});
const currentLocale = computed(() => {
  return locales.value.find(i => i.code === locale.value);
});
const currentLocaleName = computed(() => {
  return currentLocale.value?.name;
});
</script>

<template>
  <div class="flex flex-wrap items-center">
    <el-dropdown>
      <el-button type="primary">
        {{ currentLocaleName }}<el-icon class="el-icon--right">
          <ArrowDown />
        </el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-for="locale in availableLocales" :key="locale.code" @click.prevent.stop="setLocale(locale.code)">
            {{ locale.name }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>
.example-showcase .el-dropdown + .el-dropdown {
  margin-left: 15px;
}
.example-showcase .el-dropdown-link {
  cursor: pointer;
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
}
</style>
