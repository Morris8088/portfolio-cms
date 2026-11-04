<template>
  <div class="editor container">
    <div class="bar">
      <div class="left">
        <router-link to="/admin" class="back">← 返回列表</router-link>
        <h1>{{ isEdit ? '编辑文章' : '写文章' }}</h1>
      </div>
      <div class="right">
        <el-button :disabled="saving" @click="cancel">取消</el-button>
        <el-button :loading="saving" @click="save('draft')">存为草稿</el-button>
        <el-button type="primary" :loading="saving" @click="save('published')">
          {{ isEdit && form.status === 'published' ? '保存修改' : '发布' }}
        </el-button>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="12" animated />

    <template v-else>
      <div class="meta-bar" v-if="isEdit && original">
        <span>创建于 {{ formatDate(original.created_at) }}</span>
        <span>·</span>
        <span>最后更新 {{ relativeTime(original.updated_at) }}</span>
        <span>·</span>
        <span>{{ original.views }} 次阅读</span>
        <span class="status">
          <el-tag size="small" :type="form.status === 'published' ? 'success' : 'info'">
            {{ form.status === 'published' ? '已发布' : '草稿' }}
          </el-tag>
        </span>
      </div>

      <div class="panel">
        <el-tabs v-model="tab" class="tabs">
          <!-- ---------- 编辑 ---------- -->
          <el-tab-pane label="编辑" name="edit">
            <div class="field">
              <label>标题 <em>*</em></label>
              <el-input v-model="form.title" size="large" placeholder="一句话说清这篇讲什么" maxlength="120" show-word-limit />
            </div>

            <div class="row">
              <div class="field">
                <label>slug<span class="tip">留空会自动按标题生成</span></label>
                <el-input v-model="form.slug" placeholder="build-fullstack-cms" />
              </div>
              <div class="field">
                <label>标签<span class="tip">多个用英文逗号分隔</span></label>
                <el-input v-model="form.tags" placeholder="Vue3,Node,复盘" />
              </div>
            </div>

            <div class="field">
              <label>摘要<span class="tip">留空会自动截取正文前 80 字</span></label>
              <el-input v-model="form.summary" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </div>

            <div class="field">
              <label>
                正文 <em>*</em>
                <span class="tip">支持 Markdown，右边「预览」可实时查看</span>
                <span class="spacer" />
                <button type="button" class="upload-btn" :disabled="uploading" @click.prevent="pickImage">
                  {{ uploading ? `上传中 ${progress}%` : '插入图片' }}
                </button>
              </label>
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/avif"
                hidden
                @change="onFileChange"
              />
              <div
                class="drop-zone"
                :class="{ dragging }"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
              >
                <el-input
                  ref="contentRef"
                  v-model="form.content"
                  type="textarea"
                  :rows="22"
                  resize="vertical"
                  placeholder="## 小标题&#10;&#10;正文…&#10;&#10;（图片可以直接拖到这里上传）"
                  class="content-input"
                />
                <div v-if="dragging" class="drop-mask">松手上传图片</div>
              </div>
            </div>
          </el-tab-pane>

          <!-- ---------- 预览 ---------- -->
          <el-tab-pane label="预览" name="preview">
            <div v-if="!form.content.trim()" class="preview-empty">
              还没写内容，切回「编辑」开始吧。
            </div>
            <div v-else class="preview">
              <h1 class="preview-title">{{ form.title || '（无标题）' }}</h1>
              <p v-if="form.summary" class="preview-summary">{{ form.summary }}</p>
              <div class="prose" v-html="previewHtml"></div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <p class="foot-tip">
        正文用 Markdown 写，发布后自动渲染。渲染结果经过 DOMPurify 消毒，
        即使内容里有 script 标签也不会被执行。
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getPost, createPost, updatePost, uploadImage } from '../../api';
import { formatDate, relativeTime } from '../../utils/date';
import { renderMarkdown } from '../../utils/markdown';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => Boolean(route.params.id));
const loading = ref(true);
const saving = ref(false);
const tab = ref('edit');
const original = ref(null);

const form = reactive({
  title: '',
  slug: '',
  tags: '',
  summary: '',
  content: '',
  status: 'draft'
});

const previewHtml = computed(() => renderMarkdown(form.content));

// 有没有未保存的改动（离开页面前提醒用）
const dirty = ref(false);

// ---------- 图片上传 ----------
const fileInput = ref(null);
const contentRef = ref(null);
const uploading = ref(false);
const progress = ref(0);
const dragging = ref(false);
// 点「插入图片」那一刻的光标位置。文件选择框一弹出来，textarea 就失焦了，
// 等上传完再去读 selectionStart 已经不准，所以必须提前记下来。
const savedCursor = ref(null);

function pickImage() {
  if (uploading.value) return;
  const el = textareaEl();
  savedCursor.value = el ? el.selectionStart : form.content.length;
  fileInput.value?.click();
}

function textareaEl() {
  // el-input 组件实例上取真实 DOM 的方式：$el 是外层 div，里面才是 textarea。
  // 用可选链兜底，避免组件还没挂载时抛错。
  const root = contentRef.value?.$el;
  if (root?.querySelector) return root.querySelector('textarea');
  // ref 拿到 null 时退化为全局查找：本页只有一个正文 textarea
  return document.querySelector('.content-input textarea');
}

function onFileChange(e) {
  const file = e.target.files?.[0];
  // 清空 value，否则连续选同一个文件不会再触发 change
  e.target.value = '';
  if (file) handleUpload(file);
}

function onDrop(e) {
  dragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const el = textareaEl();
  savedCursor.value = el ? el.selectionStart : form.content.length;
  handleUpload(file);
}

async function handleUpload(file) {
  if (uploading.value) return;

  // 先在本地挡一层，省一次白跑的网络请求（后端还会再校验一次，不能只靠前端）
  if (!file.type.startsWith('image/')) {
    return ElMessage.warning('只能上传图片文件');
  }
  const MAX = 5 * 1024 * 1024;
  if (file.size > MAX) {
    return ElMessage.warning(`图片不能超过 ${MAX / 1024 / 1024}MB`);
  }

  uploading.value = true;
  progress.value = 0;
  try {
    const { url } = await uploadImage(file, (p) => {
      progress.value = p;
    });
    insertAt(savedCursor.value, `![](${url})`);
    ElMessage.success('图片已插入');

    // 切到预览让用户确认效果
    tab.value = 'preview';
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    uploading.value = false;
    progress.value = 0;
    savedCursor.value = null;
  }
}

/** 把一段文本插到指定位置，前后各留一个换行，保证 Markdown 图片独占一行 */
function insertAt(pos, text) {
  // 以 textarea 的真实内容为准：v-model 正常情况下是同步的，
  // 但万一有输入法组词中 / 程序化赋值没触发 input 的情况，
  // 用 DOM 里的值兜底，避免把用户已写的正文覆盖掉。
  const dom = textareaEl();
  const content = dom && dom.value !== form.content ? dom.value : form.content;

  const at = typeof pos === 'number' ? Math.min(pos, content.length) : content.length;
  const before = content.slice(0, at);
  const after = content.slice(at);
  const lead = before === '' || before.endsWith('\n') ? '' : '\n\n';
  const tail = after === '' || after.startsWith('\n') ? '\n' : '\n\n';
  form.content = `${before}${lead}${text}${tail}${after}`;
  dirty.value = true;
}

// 有没有未保存的改动（离开页面前提醒用）
watch(
  form,
  () => {
    if (!loading.value) dirty.value = true;
  },
  { deep: true }
);

async function load() {
  if (!isEdit.value) {
    loading.value = false;
    return;
  }
  try {
    const data = await getPost(route.params.id);
    original.value = data;
    form.title = data.title;
    form.slug = data.slug;
    form.tags = data.tags || '';
    form.summary = data.summary || '';
    form.content = data.content;
    form.status = data.status;
    dirty.value = false;
  } catch (e) {
    ElMessage.error(e.message);
    router.replace('/admin');
  } finally {
    loading.value = false;
  }
}

async function save(nextStatus) {
  if (saving.value) return;

  if (!form.title.trim()) {
    tab.value = 'edit';
    return ElMessage.warning('标题不能为空');
  }
  if (!form.content.trim()) {
    tab.value = 'edit';
    return ElMessage.warning('正文不能为空');
  }

  saving.value = true;
  try {
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      tags: form.tags.trim(),
      summary: form.summary.trim(),
      content: form.content,
      status: nextStatus
    };

    if (isEdit.value) {
      await updatePost(route.params.id, payload);
      ElMessage.success('已保存');
    } else {
      await createPost(payload);
      ElMessage.success(nextStatus === 'published' ? '已发布' : '已存为草稿');
    }

    dirty.value = false;
    router.push('/admin');
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    saving.value = false;
  }
}

function cancel() {
  if (dirty.value) {
    ElMessageBox.confirm('有未保存的修改，确定离开吗？', '提示', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑'
    })
      .then(() => {
        dirty.value = false;
        router.push('/admin');
      })
      .catch(() => {});
    return;
  }
  router.push('/admin');
}

// 直接点导航栏 / 浏览器后退时也拦一下
onBeforeRouteLeave(async () => {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm('有未保存的修改，确定离开吗？', '提示', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑'
    });
    return true;
  } catch {
    return false;
  }
});

onMounted(load);
</script>

<style scoped>
.editor {
  padding-top: 36px;
  padding-bottom: 48px;
  max-width: 900px;
}

.bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back {
  font-size: 13px;
  color: var(--ink-soft);
}

.back:hover {
  color: var(--brand);
}

.bar h1 {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  margin: 0;
}

.right {
  display: flex;
  gap: 8px;
}

.meta-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--ink-faint);
  margin-bottom: 14px;
}

.meta-bar .status {
  margin-left: 6px;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 8px 22px 22px;
}

.field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

label {
  font-size: 12.5px;
  color: var(--ink-soft);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

label em {
  color: var(--accent);
  font-style: normal;
}

.tip {
  font-size: 11.5px;
  color: var(--ink-faint);
  font-weight: 400;
}

.content-input :deep(textarea) {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.75;
}

/* ---------- 图片上传 ---------- */
.spacer {
  flex: 1;
}

.upload-btn {
  font-size: 12px;
  color: var(--brand);
  background: var(--brand-soft);
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 3px 12px;
  cursor: pointer;
  transition: 0.15s;
  font-family: inherit;
}

.upload-btn:hover:not(:disabled) {
  border-color: var(--brand);
}

.upload-btn:disabled {
  cursor: progress;
  opacity: 0.7;
}

.drop-zone {
  position: relative;
  border-radius: 8px;
  transition: 0.15s;
}

.drop-zone.dragging {
  outline: 2px dashed var(--brand);
  outline-offset: 3px;
}

.drop-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(45, 106, 90, 0.08);
  border-radius: 8px;
  font-size: 14px;
  color: var(--brand);
  pointer-events: none;
}

.preview {
  padding: 8px 4px 24px;
}

.preview-title {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 12px;
}

.preview-summary {
  margin: 0 0 24px;
  padding: 14px 16px;
  background: var(--brand-soft);
  border-left: 3px solid var(--brand);
  border-radius: 0 8px 8px 0;
  font-size: 14px;
  color: #3c4a46;
}

.preview-empty {
  padding: 60px 0;
  text-align: center;
  color: var(--ink-faint);
  font-size: 14px;
}

.foot-tip {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--ink-faint);
  line-height: 1.7;
}

@media (max-width: 700px) {
  .row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
