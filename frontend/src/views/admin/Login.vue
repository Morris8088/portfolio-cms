<template>
  <div class="login-page">
    <div class="card">
      <div class="brand">
        <span class="mark">M</span>
        <div>
          <strong>后台登录</strong>
          <small>只有我本人需要进来写东西</small>
        </div>
      </div>

      <el-form @submit.prevent="submit" class="form">
        <label class="label">用户名</label>
        <el-input
          v-model="username"
          placeholder="admin"
          size="large"
          autocomplete="username"
          @keyup.enter="submit"
        />

        <label class="label">密码</label>
        <el-input
          v-model="password"
          type="password"
          placeholder="••••••"
          size="large"
          show-password
          autocomplete="current-password"
          @keyup.enter="submit"
        />

        <p v-if="error" class="error">{{ error }}</p>

        <el-button
          type="primary"
          size="large"
          class="submit"
          :loading="loading"
          native-type="submit"
        >
          {{ loading ? '登录中…' : '登录' }}
        </el-button>
      </el-form>

      <p class="hint">
        演示账号：<code>admin</code> / <code>admin123</code>
        <br />
        <span>密码在库里存的是 scrypt 哈希，登录后拿到的是 8 小时有效的令牌。</span>
      </p>

      <router-link to="/" class="back">← 回到站点</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const username = ref('admin');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  if (loading.value) return;
  error.value = '';

  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  try {
    await auth.login(username.value.trim(), password.value);
    // 登录前想去的页面（被守卫拦下来时记在 query.redirect 里）
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin';
    router.replace(redirect);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 64px);
  display: grid;
  place-items: center;
  padding: 40px 24px 80px;
  /* 一层很淡的径向渐变，避免大面积纯色显得空 */
  background:
    radial-gradient(900px 420px at 50% -10%, rgba(31, 111, 92, 0.08), transparent 70%),
    var(--bg);
}

.card {
  width: 100%;
  max-width: 380px;
  padding: 32px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 26px;
}

.mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--brand);
  color: #fff;
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
}

.brand div {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.brand strong {
  font-size: 16px;
}

.brand small {
  font-size: 12px;
  color: var(--ink-faint);
}

.form {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 12.5px;
  color: var(--ink-soft);
  margin-bottom: 6px;
}

.label:not(:first-child) {
  margin-top: 16px;
}

.error {
  margin: 14px 0 0;
  font-size: 12.5px;
  color: #c0392b;
  padding: 8px 10px;
  background: #fdecea;
  border-radius: 6px;
}

.submit {
  margin-top: 22px;
  width: 100%;
}

.hint {
  margin: 22px 0 0;
  padding-top: 18px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
  line-height: 1.8;
  color: var(--ink-faint);
}

.hint code {
  font-family: var(--font-mono);
  background: var(--surface-sunk);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--ink-soft);
}

.back {
  display: inline-block;
  margin-top: 16px;
  font-size: 12.5px;
  color: var(--brand);
}
</style>
