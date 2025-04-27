<script lang="ts" setup>
import { DeviceType, getLoginCodeByType, toLoginByPwd } from "~/composables/api/user/auth";
import { LoginType } from "~/types/user/index.js";

const { t } = useI18n();
const user = useUserStore();
const loginType = useLocalStorage<LoginType>("loginType", LoginType.EMAIL);
const { historyAccounts, addHistoryAccount, removeHistoryAccount } = useHistoryAccount();
const isLoading = ref<boolean>(false);
const autoLogin = ref<boolean>(true);
// Form
const userForm = ref({
  username: "",
  password: "",
  code: "", // 验证码
  email: "", // 邮箱登录
  phone: "", // 手机登录
});

const rules = reactive({
  username: [
    { required: true, message: "Username cannot be empty!", trigger: "change" },
    { min: 6, max: 30, message: "The length is between 6 and 30 characters!", trigger: "blur" },
  ],
  password: [
    { required: true, message: "Password cannot be empty!", trigger: "change" },
    { min: 6, max: 20, message: "The password length is 6-20 characters!", trigger: "blur" },
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
      trigger: "blur",
    },
  ],
  phone: [
    { required: true, message: "Mobile phone number cannot be empty!", trigger: "blur" },
    {
      pattern: /^(?:(?:\+|00)86)?1[3-9]\d{9}$/,
      message: "The mobile phone number format is incorrect!",
      trigger: "change",
    },
  ],
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
async function getLoginCode(type: LoginType) {
  let data;
  try {
    // Get email verification code
    if (type === LoginType.EMAIL) {
      // Simple verification
      if (userForm.value.email.trim() === "")
        return;
      if (!checkEmail(userForm.value.email)) {
        isLoading.value = false;
        return ElMessage.error("The email format is incorrect!");
      }
      // Open
      isLoading.value = true;
      // Request verification code
      data = await getLoginCodeByType(userForm.value.email, DeviceType.EMAIL);
      // success
      if (data.code === StatusCode.SUCCESS) {
        ElMessage.success({
          message: "The verification code has been sent to your email, valid for 5 minutes!",
          duration: 3000,
        });
        useInterval(emailTimer, emailCodeStorage, 60, -1);
      }
    }
    // Get the verification code from your mobile phone number
    else if (type === LoginType.PHONE) {
      if (userForm.value.phone.trim() === "")
        return;
      if (!checkPhone(userForm.value.phone)) {
        isLoading.value = false;
        ElMessage.closeAll("error");
        return ElMessage.error("The mobile phone number format is incorrect!");
      }
      isLoading.value = true;
      data = await getLoginCodeByType(userForm.value.phone, DeviceType.PHONE);
      if (data.code === 20000) {
        // Start timer
        useInterval(phoneTimer, phoneCodeStorage, 60, -1);
        ElMessage.success({
          message: data.message,
          duration: 5000,
        });
        // userForm.value.code = data?.data?;
      }
      else {
        ElMessage.closeAll("error");
        ElMessage.error(data.message);
      }
    }
  }
  catch (error) {
    isLoading.value = false;
  }
  // Close Loading
  isLoading.value = false;
}
/**
 * Timer
 * @param timer local timer
 * @param num counting object
 * @param target starting seconds
 * @param step auto-increment auto-decrement
 * @param fn callback
 */
function useInterval(timer: any, num: Ref<number>, target?: number, step = -1, fn?: () => void) {
  num.value = target || timer.value;
  timer.value = setInterval(() => {
    num.value += step;
    // Clear Timer
    if (num.value <= 0) {
      num.value = -1;
      clearInterval(timer.value);
      timer.value = -1;
    }
    fn && fn();
  }, 1000);
}

// Turn off the timer
onUnmounted(() => {
  onCloseTimer();
});
onDeactivated(() => {
  onCloseTimer();
});
// Turn off the timer
function onCloseTimer() {
  if (emailTimer.value !== -1) {
    clearInterval(emailTimer.value);
    emailTimer.value = -1;
  }
  if (phoneTimer.value !== -1) {
    clearInterval(phoneTimer.value);
    phoneTimer.value = -1;
  }
}

const store = useUserStore();
function toRegister() {
  store.showLoginAndRegister = "register";
}

const formRef = ref();
function done() {
  isLoading.value = false;
  user.isOnLogining = false;
}
/**
 * Login
 * @param formEl Form example
 */
async function onLogin(formEl: any | undefined) {
  if (!formEl || isLoading.value)
    return;
  formEl.validate(async (valid: boolean) => {
    if (!valid)
      return;
    isLoading.value = true;
    user.isOnLogining = true;
    let res: GraphQLResponse<ILoginResponse | null> | null = null;
    try {
      switch (loginType.value) {
        case LoginType.PWD:
          res = await toLoginByPwd(userForm.value.username, userForm.value.password);
          break;
        // case LoginType.PHONE:
        //   res = await toLoginByPhone(userForm.value.phone, userForm.value.code);

        //       break;
        //     case LoginType.EMAIL:
        //       res = await toLoginByEmail(userForm.value.email, userForm.value.code);
        // console.log("11111111111111", res);

        //       break;
        //     case LoginType.ADMIN:
        //       res = (await toLoginByPwd(userForm.value.username, userForm.value.password, true)) as { code: number; data: any; message: string };
        // console.log("222222", res);

        //       break;
      }
    }
    catch (error) {
      done();
    }

    if (res && res.data) {
      // Login successful
      const data = res.data;
      if (data) {
        if (data.login) {
          // const { onLogin } = useApollo();
          onLogin(data.login.accessToken);
          // await store.onUserLogin(res.data, autoLogin.value, "/", (info) => {
          // initialization
          useWsStore().reload();
          // Save account
          // if (!autoLogin.value) {
          //   return;
          // }
          addHistoryAccount({
            type: loginType.value,
            account: userForm.value.username,
            password: userForm.value.password,
            userInfo: {
              id: data.login.userId,
              avatar: data.login.avatar,
              nickname: data.login.email,
            },
          });
          // });
          store.$patch({
            token: data.login.accessToken,
            isLogin: true,
            userInfo: {
              email: data.login.email,
            },
          });
          done();
        }
      }
      // Login Failed
      else {
        console.log("res", res);
        ElMessage.error({
          message: res.errors?.[0]?.message || "Unknown error",
          duration: 2000,
        });
        // store
        store.$patch({
          token: "",
          isLogin: false,
        });
        done();
      }
    }
    else {
      done();
    }
  });
}

const options = computed(() => [
  { label: t("email"), value: LoginType.EMAIL },
  { label: t("phone"), value: LoginType.PHONE },
  { label: t("password"), value: LoginType.PWD },
]);

const theHistoryAccount = ref({
  type: LoginType.EMAIL,
  account: "",
  password: "",
  userInfo: {
    avatar: "",
    nickname: "",
  },
});
async function handleSelectAccount(item: Record<string, any>) {
  if (!item || !item.account)
    return;
  const pwd = await decrypt(JSON.parse(item.password), item.account);
  userForm.value.username = item.account;
  userForm.value.password = pwd || "";
  loginType.value = item.type;
  theHistoryAccount.value = {
    type: item.type,
    account: item.account,
    password: item.password || "",
    userInfo: item.userInfo,
  };
}

function querySearchAccount(queryString: string, cb: (data: any[]) => void) {
  const results = queryString ? historyAccounts.value.filter(p => p.account.toLowerCase().indexOf(queryString.toLowerCase()) === 0) : historyAccounts.value;
  cb(results);
}
</script>

<template>
  <!-- Log in -->
  <el-form
    ref="formRef" :disabled="isLoading" label-position="top" hide-required-asterisk :rules="rules"
    :model="userForm" style="border: none" class="form" autocomplete="off"
  >
    <template v-if="!user.isLogin">
      <div mb-4 text-sm tracking-0.2em op-80>
        Chat whatever you want, chat as you like ✨
      </div>
      <!-- Switch Login -->
      <el-segmented
        v-show="loginType !== LoginType.ADMIN" v-model="loginType"
        class="toggle-login grid grid-cols-3 mb-4 w-full gap-2 card-bg-color-2" :options="options"
      />
      <!-- Verification code login (client) -->
      <!-- Email Login -->
      <el-form-item v-if="loginType === LoginType.EMAIL" prop="email" class="animated">
        <el-input
          v-model.trim="userForm.email" type="email" autocomplete="off" :prefix-icon="ElIconMessage"
          size="large" placeholder="Email" @keyup.enter="getLoginCode(loginType)"
        >
          <template #append>
            <el-button type="primary" :disabled="emailCodeStorage > 0 || isLoading" @click="getLoginCode(loginType)">
              {{ emailCodeStorage > 0 ? `Resend after ${emailCodeStorage}s` : 'Send code' }}
            </el-button>
          </template>
        </el-input>
      </el-form-item>
      <!-- Login by mobile phone number -->
      <el-form-item v-if="loginType === LoginType.PHONE" type="tel" prop="phone" class="animated">
        <el-input
          v-model.trim="userForm.phone" :prefix-icon="ElIconIphone" size="large" type="tel" autocomplete="off"
          placeholder="Phone" @keyup.enter="getLoginCode(loginType)"
        >
          <template #append>
            <el-button type="primary" :disabled="phoneCodeStorage > 0 || isLoading" @click="getLoginCode(loginType)">
              {{ phoneCodeStorage > 0 ? `Resend after ${phoneCodeStorage}s` : 'Send code' }}
            </el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item v-if="loginType === LoginType.EMAIL || loginType === LoginType.PHONE" prop="code" class="animated">
        <el-input
          v-model.trim="userForm.code" :prefix-icon="ElIconChatDotSquare" autocomplete="off" size="large"
          :placeholder="t('enterCode')" @keyup.enter="onLogin(formRef)"
        />
      </el-form-item>
      <!-- Password login -->
      <el-form-item
        v-if="loginType === LoginType.PWD || loginType === LoginType.ADMIN" label="" prop="username"
        class="animated"
      >
        <el-autocomplete
          v-model.trim="userForm.username" autocomplete="off" :prefix-icon="ElIconUser" size="large"
          :fetch-suggestions="querySearchAccount" :trigger-on-focus="true" placement="bottom" clearable fit-input-width
          select-when-unmatched teleported hide-loading value-key="account" placeholder="Username, Phone or Email"
          @select="handleSelectAccount"
        >
          <template #default="{ item }">
            <div :title="item.account" class="group w-full flex items-center px-2">
              <el-avatar :size="30" class="mr-2 flex-shrink-0" :src="BaseUrlImg + item.userInfo.avatar" />
              <span class="block max-w-14em truncate">{{ item.account }}</span>
              <i
                title="Delete"
                class="i-carbon:close ml-a h-0 w-0 flex-shrink-0 overflow-hidden transition-all group-hover:(h-1.5em w-1.5em) btn-danger"
                @click.stop.capture="removeHistoryAccount(item.account)"
              />
              <span
                v-if="item.type === LoginType.ADMIN"
                class="ml-2 flex-shrink-0 rounded-4px bg-theme-primary px-1 py-1px text-xs text-white"
              >Administrator</span>
            </div>
          </template>
        </el-autocomplete>
      </el-form-item>
      <el-form-item
        v-if="loginType === LoginType.PWD || loginType === LoginType.ADMIN" type="password" show-password
        label="" prop="password" class="animated"
      >
        <el-input
          v-model.trim="userForm.password" :prefix-icon="ElIconLock" autocomplete="off" size="large"
          placeholder="Password" show-password type="password" @keyup.enter="onLogin(formRef)"
        />
      </el-form-item>
      <el-form-item style="margin: 0">
        <el-button
          type="primary" class="submit w-full tracking-0.2em shadow" style="padding: 20px"
          @keyup.enter="onLogin(formRef)" @click="onLogin(formRef)"
        >
          <!-- :loading="user.isOnLogining" -->
          Log in
        </el-button>
      </el-form-item>
      <!-- 底部 -->
      <div class="mt-2 text-right text-0.8em sm:mt-4 sm:text-sm">
        <el-checkbox
          v-model="autoLogin" class="mt-1"
          style="padding: 0; font-size: inherit; float: left; height: fit-content"
        >
          Remember Me
        </el-checkbox>
        <!-- <span class="mr-2 cursor-pointer border-r-(1px [var(--el-border-color-base)] solid) pr-2 transition-300"
          @click="loginType = loginType === LoginType.ADMIN ? LoginType.PHONE : LoginType.ADMIN">
          {{ loginType !== LoginType.ADMIN ? 'Administrator' : 'User login' }}
        </span> -->
        <span cursor-pointer class="text-color-primary" transition-300 @click="toRegister"> Register an account </span>
      </div>
    </template>
    <template v-else>
      <div class="mt-16 flex-row-c-c flex-col gap-8">
        <CardElImage
          :src="BaseUrlImg + user.userInfo.avatar"
          class="h-6rem w-6rem sm:(h-8rem w-8rem) border-default card-default"
        />
        <div text-center>
          <span>
            {{ user.userInfo.username || 'Not logged in' }}
          </span>
          <br>
          <small op-80 el-color-info>（{{ user.userInfo.username ? 'Already logged in' : 'Please log in' }}）</small>
        </div>
        <div>
          <BtnElButton
            style="width: 8em" type="primary" transition-icon icon-class="i-solar-alt-arrow-left-bold" mr-2
            sm:mr-4 @click="navigateTo('/')"
          >
            {{ user.isOnLogining ? 'Logging in...' : 'Go to chat' }}
          </BtnElButton>
          <BtnElButton
            style="width: 8em" type="danger" transition-icon plain icon-class="i-solar:logout-3-broken"
            @click="user.exitLogin"
          >
            Log out
          </BtnElButton>
        </div>
      </div>
    </template>
  </el-form>
</template>

<style scoped lang="scss">
.form {
  display: block;
  overflow: hidden;
  animation-delay: 0.1s;

  :deep(.el-input__wrapper) {
    padding: 0.3em 1em;
  }

  // Error message
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

.animate__animated {
  animation-duration: 0.5s;
}

// label总体
:deep(.el-form-item) {
  margin-bottom: 1.25rem;
}

// 切换登录
:deep(.toggle-login.el-segmented) {
  --el-segmented-item-selected-bg-color: var(--el-color-primary);
  --el-border-radius-base: 6px;
  height: 2.6rem;
  padding: 0.4rem;

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
</style>
