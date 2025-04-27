<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus";
import type { Result } from "~/types/result";
import { MdPreview } from "md-editor-v3";
import { DeviceType, getRegisterCode, toLoginByPwd } from "~/composables/api/user/auth";
import { checkUsernameExists } from "~/composables/api/user/info";
import { appTerms } from "~/constants";
import { RegisterType } from "~/types/user/index.js";
import "md-editor-v3/lib/preview.css";

const { size = "large" } = defineProps<{
  size?: "large" | "small" | "default"
}>();

const { t } = useI18n();

const setting = useSettingStore();
// 注册方式
const registerType = ref<number>(RegisterType.EMAIL);

const options = computed(() => [
  { label: t("email"), value: RegisterType.EMAIL },
  { label: t("phone"), value: RegisterType.PHONE },
  { label: t("password"), value: RegisterType.PASSWORD },
]);

// 请求加载
const isLoading = ref<boolean>(false);
const loadingText = ref<string>("Automatically logging in...");
const formRef = ref();
// 表单
const formUser = reactive({
  username: "", // 用户名
  phone: "", // 手机号 0
  email: "", // 邮箱 1
  code: "", // 验证码
  password: "", // 密码
  secondPassword: "", // 密码
});
const rules = reactive<FormRules>({
  username: [
    { required: true, message: "Username cannot be empty!", trigger: "blur" },
    {
      pattern: /^[a-z]\w*$/i,
      message: "English start, letters, numbers and underscores",
      trigger: "change",
    },
    { min: 6, max: 30, message: "The length is between 6 and 30 characters!", trigger: "blur" },
    {
      asyncValidator: checkUsername,
      message: "This username is already in use!",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "Password cannot be empty!", trigger: "blur" },
    { min: 6, max: 20, message: "The password must be 6-20 characters long!", trigger: "change" },
    {
      pattern: /^\w{6,20}$/,
      message: "Password consists of letters, numbers and underscores",
      trigger: "change",
    },
    {
      validator(rule: any, value: string, callback: any) {
        if (registerType.value === RegisterType.PASSWORD && value !== formUser.password?.trim())
          callback(new Error("The two passwords do not match"));
        else callback();
      },
    },
  ],
  secondPassword: [
    { required: true, message: "Password cannot be empty!", trigger: "blur" },
    { min: 6, max: 20, message: "The password must be 6-20 characters long!", trigger: "change" },
    {
      pattern: /^\w{6,20}$/,
      message: "Password consists of letters, numbers and underscores",
      trigger: "change",
    },
    {
      validator(rule: any, value: string, callback: any) {
        if (value !== formUser.password?.trim())
          callback(new Error("The two passwords do not match"));
        else callback();
      },
    },
  ],
  code: [
    {
      required: true,
      message: "The verification code consists of 6 digits!",
      trigger: "change",
    },
  ],
  email: [
    { required: true, message: "Email address cannot be empty!", trigger: "blur" },
    {
      pattern: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/i,
      message: "The email format is incorrect!",
      trigger: ["blur", "change"],
    },
  ],
  phone: [
    { required: true, message: "Phone number cannot be empty!", trigger: "blur" },
    {
      pattern: /^(?:(?:\+|00)86)?1[3-9]\d{9}$/,
      message: "The mobile phone number format is incorrect!",
      trigger: "change",
    },
  ],
});
const agreeDetail = reactive({
  value: false,
  showDetail: false,
  detail: appTerms,
});
const isAgreeTerm = computed({
  get: () => agreeDetail.value,
  set: (val: boolean) => {
    if (val) {
      agreeDetail.showDetail = true;
    }
    else {
      agreeDetail.value = val;
    }
  },
});

// Verification code validity period
const phoneTimer = ref(-1);
const emailTimer = ref(-1);
const emailCodeStorage = ref<number>(0);
const phoneCodeStorage = ref<number>(0);
/**
 * Get verification code
 * @param type
 */
async function getRegCode(type: RegisterType) {
  try {
    if (isLoading.value)
      return;
    let data;
    // 获取邮箱验证码
    if (type === RegisterType.EMAIL) {
      // 简单校验
      if (formUser.email.trim() === "")
        return;
      if (!checkEmail(formUser.email))
        return ElMessage.error("The email format is incorrect!");

      isLoading.value = true;

      // 请求验证码
      data = await getRegisterCode(formUser.email, DeviceType.EMAIL);
      // 成功
      if (data.code === 20000) {
        ElMessage.success({
          message: "The verification code has been sent to your email, valid for 5 minutes!",
          duration: 5000,
        });
        useInterval(emailTimer, emailCodeStorage, 60, -1);
      }
    }
    // 获取手机号验证码
    else if (type === RegisterType.PHONE) {
      if (formUser.phone.trim() === "")
        return;
      if (!checkPhone(formUser.phone))
        return ElMessage.error("The mobile phone number format is incorrect!");

      isLoading.value = true;
      data = await getRegisterCode(formUser.phone, DeviceType.PHONE);
      if (data.code === StatusCode.SUCCESS) {
        // 开启定时器
        formUser.code = data.data;
        useInterval(phoneTimer, phoneCodeStorage, 60, -1);
        ElMessage.success({
          message: data.message,
          duration: 5000,
        });
      }
    }
  }
  catch (err) {
  }
  finally {
    // Close Loading
    isLoading.value = false;
  }
}
/**
 *
 * @param timer local timer
 * @param num counting object
 * @param target starting seconds
 * @param step self-increment and self-decrement
 * @param fn callback
 */
function useInterval(timer: any, num: Ref<number>, target?: number, step: number = -1, fn?: () => void) {
  num.value = target || timer.value;
  timer.value = setInterval(() => {
    num.value += step;
    // 清除定时器
    if (num.value <= 0) {
      num.value = -1;
      timer.value = -1;
      clearInterval(timer.value);
      fn && fn();
    }
  }, 1000);
}
const store = useUserStore();
/**
 * 注册
 * @param formEl 表单实例
 */
async function onRegister(formEl: FormInstance) {
  if (!formEl)
    return;
  await formEl.validate((valid) => {
    if (!valid) {
      isLoading.value = false;
      return;
    }
    if (!agreeDetail.value) {
      ElMessage.warning("Please read and agree to the User Agreement!");
      agreeDetail.showDetail = true;
      return;
    }
    isLoading.value = true;
    onRegisterHandle();
  });
}
async function onRegisterHandle() {
  let res: Result<string> = { code: 20001, message: "Registration failed, please try again later!", data: "" };
  try {
    switch (registerType.value) {
      case RegisterType.PHONE:
        res = await toRegisterV2({
          username: formUser.username,
          phone: formUser.phone,
          // password: formUser.password,
          code: formUser.code,
          type: registerType.value,
        });
        break;
      case RegisterType.EMAIL:
        res = await toRegisterV2({
          username: formUser.username,
          // password: formUser.password,
          code: formUser.code,
          email: formUser.email,
          type: registerType.value,
        });
        break;
      case RegisterType.PASSWORD:
        res = await toRegisterV2({
          username: formUser.username,
          password: formUser.password,
          secondPassword: formUser.secondPassword,
          type: RegisterType.PASSWORD,
        });
        break;
    }
  }
  catch (error) {
    isLoading.value = false;
  }

  if (res.code === StatusCode.SUCCESS) {
    // 注册成功
    if (res.data !== "") {
      const token = res.data;
      ElMessage.success({
        message: "Congratulations, your registration is successful 🎉",
        duration: 2000,
      });
      // 先预取一下热点会话
      setMsgReadByRoomId(1, token).catch((e) => {
        console.warn("Prefetch hotspot session failed", e);
        ElMessage.closeAll("error");
      });
      // 登录
      let count = 2;
      const timers = setInterval(() => {
        isLoading.value = true;
        loadingText.value = `Automatically log in after ${count}s...`;
        if (count <= 0) {
          toLogin(token);
          // 清除
          clearInterval(timers);
        }
        count--;
      }, 1000);
    }
  }
  else {
    ElMessage.closeAll("error");
    ElMessage.error({
      message: res.message || "Sorry, something went wrong with your registration!",
      duration: 4000,
    });
    isLoading.value = false;
    // store
    store.$patch({
      token: "",
      isLogin: false,
    });
  }
}

async function toLogin(token?: string) {
  if (token) {
    // Login successful
    await store.onUserLogin(token, true);
    await navigateTo("/");
    store.onUserLogin(token, true);
    ElMessage.success({
      message: "Login successful!",
    });
    return;
  }
  const result: GraphQLResponse<ILoginResponse | null> | null = await toLoginByPwd(formUser.username, formUser.password);
  // Automatic login successful
  store.$patch({
    token: result?.data?.login?.accessToken,
    showLoginAndRegister: "",
    isLogin: true,
  });
  ElMessage.success({
    message: "Login successful!",
  });
  if (result?.data?.login) {
    store.onUserLogin(result?.data?.login?.accessToken);
  }
  isLoading.value = false;
}

/**
 * Verify that the user exists
 */
async function checkUsername() {
  if (formUser.username.trim() === "")
    return Promise.reject("Username cannot be empty");
  const data = await checkUsernameExists(formUser.username);
  if (!data)
    return Promise.resolve();
  return Promise.reject("This username is already in use!");
}

function toLoginForm() {
  store.showLoginAndRegister = "login";
}

// onMounted(() => {
//   if (setting.isDesktop) {
//     const windows = getCurrentWebviewWindow();
//     windows.setSize(new LogicalSize(340, 460));
//   }
// });
</script>

<template>
  <!-- register -->
  <el-form
    ref="formRef" v-loading="isLoading" :disabled="isLoading" label-position="top" style="border: none"
    :element-loading-text="loadingText" element-loading-background="transparent"
    :element-loading-spinner="defaultLoadingIcon" autocomplete="off" hide-required-asterisk :rules="rules"
    :model="formUser" class="form relative"
  >
    <h4 mb-4 tracking-0.2em op-80 sm:mb-6>
      Open your own exclusive circle ✨
    </h4>
    <!-- Switch Registration -->
    <el-segmented
      v-model="registerType" :size="size" style=""
      class="toggle-btns grid grid-cols-3 mb-4 w-full gap-2 card-bg-color-2" :options="options"
    />
    <!-- 验证码注册(客户端 ) -->
    <!-- 用户名 -->
    <el-form-item label="" prop="username" class="animated">
      <el-input
        v-model.trim="formUser.username" :prefix-icon="ElIconUser" :size="size" autocomplete="off"
        placeholder="Username"
      />
    </el-form-item>
    <!-- 邮箱 -->
    <el-form-item v-if="registerType === RegisterType.EMAIL" prop="email" class="animated" autocomplete="off">
      <el-input
        v-model.trim="formUser.email" type="email" :prefix-icon="ElIconMessage" :size="size" autocomplete="off"
        placeholder="Email"
      >
        <template #append>
          <el-button type="primary" :disabled="emailCodeStorage > 0" @click="getRegCode(registerType)">
            {{ emailCodeStorage > 0 ? `Resend after ${emailCodeStorage}s` : 'Send Code' }}
          </el-button>
        </template>
      </el-input>
    </el-form-item>
    <!-- 手机号 -->
    <el-form-item v-if="registerType === RegisterType.PHONE" type="tel" prop="phone" class="animated">
      <el-input
        v-model.trim="formUser.phone" :prefix-icon="ElIconIphone" autocomplete="off" :size="size"
        placeholder="Phone number"
      >
        <template #append>
          <el-button type="primary" :disabled="phoneCodeStorage > 0" @click="getRegCode(registerType)">
            {{ phoneCodeStorage > 0 ? `Resend after ${phoneCodeStorage}s` : 'Send Code' }}
          </el-button>
        </template>
      </el-input>
    </el-form-item>
    <!-- 验证码 -->
    <el-form-item
      v-if="registerType === RegisterType.PHONE || registerType === RegisterType.EMAIL" prop="code"
      class="animated"
    >
      <el-input
        v-model.trim="formUser.code" :prefix-icon="ElIconChatDotSquare" :size="size" autocomplete="off"
        placeholder="Enter Code"
      />
    </el-form-item>
    <!-- 密 码 -->
    <el-form-item
      v-if="registerType === RegisterType.PASSWORD" type="password" show-password label="" prop="password"
      class="animated"
    >
      <el-input
        v-model.trim="formUser.password" :prefix-icon="ElIconLock" :size="size"
        placeholder="Password (6-20 digits)" show-password type="password" autocomplete="off"
      />
    </el-form-item>
    <!-- Confirm Password -->
    <el-form-item
      v-if="registerType === RegisterType.PASSWORD" type="password" show-password label=""
      prop="secondPassword" class="animated"
    >
      <el-input
        v-model.trim="formUser.secondPassword" :prefix-icon="ElIconLock" :size="size"
        placeholder="Enter password again" show-password autocomplete="off" type="password"
      />
    </el-form-item>
    <el-form-item style="margin: 0">
      <BtnElButton
        type="info" class="submit w-full tracking-0.2em shadow" style="padding: 1.1em; font-size: 1rem"
        @click="onRegister(formRef)"
      >
        Register
      </BtnElButton>
    </el-form-item>
    <div mt-3 flex items-center text-right text-0.8em sm:text-sm>
      <el-checkbox
        v-model="isAgreeTerm"
        style="--el-color-primary: var(--el-color-info); padding: 0; font-size: inherit; opacity: 0.8; float: left; height: fit-content"
      >
        Agree and comply
        <span text-color-info>User Agreement</span>
      </el-checkbox>
    </div>
    <div items-left mt-3 text-left text-0.8em sm:text-sm>
      <span ml-a cursor-pointer transition-300 btn-info @click="toLoginForm"> Back to Login </span>
    </div>
    <DialogPopup
      v-model="agreeDetail.showDetail" :duration="360" :show-close="false" destroy-on-close
      content-class="z-1200"
    >
      <div
        class="h-100vh w-100vw flex flex-col sm:(card-rounded-df h-500px w-400px border-default shadow-lg) p-4 border-default-2 card-default bg-color"
      >
        <h3 :data-tauri-drag-region="setting.isDesktop" class="relative mb-4 select-none text-center text-1.2rem">
          User Agreement
          <ElButton
            text size="small" class="absolute right-0 -top-1" style="width: 2rem; height: 1.4rem"
            @click="agreeDetail.showDetail = false"
          >
            <i i-carbon:close p-3 btn-danger title="Close" />
          </ElButton>
        </h3>
        <el-scrollbar class="flex-1 px-2">
          <MdPreview
            language="en-US" style="font-size: 0.8rem" :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
            :code-foldable="false" code-theme="a11y" class="markdown" :model-value="agreeDetail.detail"
          />
        </el-scrollbar>
        <div class="mt-2 mt-4 flex-row-c-c">
          <BtnElButton
            :icon="ElIconCheck" type="info" plain @click.stop="
              () => {
                agreeDetail.showDetail = false
                agreeDetail.value = true
              }
            "
          >
            I have read and agree
          </BtnElButton>
        </div>
      </div>
    </DialogPopup>
  </el-form>
</template>

<style scoped lang="scss">
.markdown {
  --at-apply: '!bg-transparent card-rounded-df';

  :deep(.md-editor-preview) {
    --at-apply: 'text-0.76rem p-0';
  }
}

.form {
  display: block;
  overflow: hidden;
  animation-delay: 0.1s;

  :deep(.el-input__wrapper) {
    padding: 0.3em 1em;
  }

  // 报错信息
  :deep(.el-form-item) {
    padding: 0.3em 0.1em;

    .el-form-item__error {
      padding-top: 0;
    }
  }
}

:deep(.el-button) {
  padding: 0.3em 1em;
}

// label总体
:deep(.el-form-item) {
  margin-bottom: 14px;
}

// 切换注册
:deep(.toggle-btns.el-segmented) {
  --el-segmented-item-selected-bg-color: var(--el-color-info);
  --el-border-radius-base: 6px;
  height: 2.6rem;
  padding: 0.4rem;
  font-size: small;

  .el-segmented__item:hover:not(.is-selected) {
    background: transparent;
  }

  .el-segmented__item.is-selected {
    color: #fff;
    font-weight: 600;
  }
}

.dark .active {
  background-color: var(--el-color-primary);
}

.submit {
  font-size: 1.2em;
  font-weight: 600;
  transition: 0.3s;
  cursor: pointer;
}

:deep(.el-input__wrapper.is-focus) {
  --el-input-focus-border-color: var(--el-color-info);
}
</style>
