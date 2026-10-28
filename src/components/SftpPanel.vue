<template>
  <div class="sftp-container">
    <div class="sftp-toolbar">
      <div class="toolbar-left">
        <el-button @click="goUp" :disabled="currentPath === '/'">
          <el-icon><ArrowUp /></el-icon>
          上级目录
        </el-button>
        <el-button @click="refresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="showMkdirDialog">
          <el-icon><FolderAdd /></el-icon>
          新建文件夹
        </el-button>
        <el-button type="primary" @click="uploadFiles">
          <el-icon><Upload /></el-icon>
          上传文件
        </el-button>
      </div>
      <div class="toolbar-right">
        <span class="path-display">{{ currentPath }}</span>
      </div>
    </div>

    <div class="sftp-content">
      <div class="sftp-loading" v-if="loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <el-table
        v-else
        :data="files"
        style="width: 100%"
        @row-dblclick="handleRowDblClick"
        highlight-current-row
        :row-class-name="tableRowClassName"
      >
        <el-table-column label="名称" min-width="300">
          <template #default="{ row }">
            <div class="file-name">
              <el-icon class="file-icon">
                <Folder v-if="row.isDirectory" />
                <Document v-else />
              </el-icon>
              <span>{{ row.filename }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120">
          <template #default="{ row }">
            {{ row.isDirectory ? '-' : formatSize(row.attrs.size) }}
          </template>
        </el-table-column>
        <el-table-column label="权限" width="120">
          <template #default="{ row }">
            {{ formatPermissions(row.attrs.mode) }}
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.attrs.mtime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.isDirectory"
              type="primary"
              size="small"
              link
              @click.stop="downloadFile(row)"
            >
              下载
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click.stop="deleteFile(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="mkdirDialogVisible" title="新建文件夹" width="400px">
      <el-form @submit.prevent="createDirectory">
        <el-form-item label="文件夹名称">
          <el-input v-model="newDirName" placeholder="请输入文件夹名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mkdirDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createDirectory">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  ArrowUp, Refresh, FolderAdd, Upload, Loading,
  Folder, Document
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Tab } from '@/stores/tab'

const props = defineProps<{
  tab: Tab
}>()

interface FileInfo {
  filename: string
  longname: string
  attrs: {
    size: number
    mode: number
    mtime: number
    atime: number
    isDirectory: boolean
  }
  isDirectory: boolean
}

const loading = ref(true)
const files = ref<FileInfo[]>([])
const currentPath = ref('/')
const mkdirDialogVisible = ref(false)
const newDirName = ref('')
let sftpSessionId: string | null = null

onMounted(async () => {
  await connectSftp()
})

watch(() => props.tab, async () => {
  if (sftpSessionId) {
    await connectSftp()
  }
}, { immediate: true })

async function connectSftp() {
  loading.value = true
  try {
    const result = await window.electronAPI.sftpConnect({
      host: props.tab.config.host,
      port: props.tab.config.port,
      username: props.tab.config.username,
      password: props.tab.config.password
    })
    
    sftpSessionId = result.sessionId
    currentPath.value = '/'
    await loadDirectory()
  } catch (err: any) {
    ElMessage.error(`连接失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

async function loadDirectory() {
  if (!sftpSessionId) return
  
  loading.value = true
  try {
    const list = await window.electronAPI.sftpList(sftpSessionId, currentPath.value)
    files.value = list.map((item: any) => ({
      ...item,
      isDirectory: item.longname.startsWith('d'),
      attrs: {
        ...item.attrs,
        isDirectory: item.longname.startsWith('d')
      }
    })).sort((a: FileInfo, b: FileInfo) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.filename.localeCompare(b.filename)
    })
  } catch (err: any) {
    ElMessage.error(`加载目录失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

function handleRowDblClick(row: FileInfo) {
  if (row.isDirectory) {
    if (currentPath.value === '/') {
      currentPath.value = '/' + row.filename
    } else {
      currentPath.value = currentPath.value + '/' + row.filename
    }
    loadDirectory()
  }
}

function goUp() {
  if (currentPath.value === '/') return
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = '/' + parts.join('/')
  loadDirectory()
}

function refresh() {
  loadDirectory()
}

function showMkdirDialog() {
  newDirName.value = ''
  mkdirDialogVisible.value = true
}

async function createDirectory() {
  if (!newDirName.value || !sftpSessionId) return
  
  const path = currentPath.value === '/'
    ? '/' + newDirName.value
    : currentPath.value + '/' + newDirName.value
  
  try {
    await window.electronAPI.sftpMkdir(sftpSessionId, path)
    mkdirDialogVisible.value = false
    ElMessage.success('创建成功')
    await loadDirectory()
  } catch (err: any) {
    ElMessage.error(`创建失败: ${err.message}`)
  }
}

async function uploadFiles() {
  if (!sftpSessionId) return
  
  try {
    const filePaths = await window.electronAPI.selectFile()
    if (!filePaths || filePaths.length === 0) return
    
    for (const filePath of filePaths) {
      const fileName = filePath.split(/[/\\]/).pop()
      const remotePath = currentPath.value === '/'
        ? '/' + fileName
        : currentPath.value + '/' + fileName
      
      await window.electronAPI.sftpUpload(sftpSessionId, filePath, remotePath)
    }
    
    ElMessage.success('上传成功')
    await loadDirectory()
  } catch (err: any) {
    ElMessage.error(`上传失败: ${err.message}`)
  }
}

async function downloadFile(file: FileInfo) {
  if (!sftpSessionId) return
  
  try {
    const localDir = await window.electronAPI.selectDirectory()
    if (!localDir) return
    
    const remotePath = currentPath.value === '/'
      ? '/' + file.filename
      : currentPath.value + '/' + file.filename
    const localPath = localDir + '/' + file.filename
    
    await window.electronAPI.sftpDownload(sftpSessionId, remotePath, localPath)
    ElMessage.success('下载成功')
  } catch (err: any) {
    ElMessage.error(`下载失败: ${err.message}`)
  }
}

async function deleteFile(file: FileInfo) {
  if (!sftpSessionId) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${file.filename} 吗？`,
      '确认删除',
      { type: 'warning' }
    )
    
    const path = currentPath.value === '/'
      ? '/' + file.filename
      : currentPath.value + '/' + file.filename
    
    await window.electronAPI.sftpDelete(sftpSessionId, path)
    ElMessage.success('删除成功')
    await loadDirectory()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(`删除失败: ${err.message}`)
    }
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatPermissions(mode: number): string {
  const perms = []
  const types = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']
  perms.push(types[(mode >> 6) & 7])
  perms.push(types[(mode >> 3) & 7])
  perms.push(types[mode & 7])
  return perms.join('')
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function tableRowClassName({ row }: { row: FileInfo }) {
  return row.isDirectory ? 'directory-row' : 'file-row'
}
</script>

<style scoped>
.sftp-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.sftp-toolbar {
  padding: 12px 16px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.path-display {
  font-size: 13px;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  background: #3e3e42;
  padding: 4px 12px;
  border-radius: 4px;
}

.sftp-content {
  flex: 1;
  overflow: auto;
  position: relative;
}

.sftp-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d4d4d4;
  font-size: 14px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  color: #858585;
}

.directory-row .file-icon {
  color: #e8a87c;
}

:deep(.el-table) {
  background: #1e1e1e;
  color: #d4d4d4;
}

:deep(.el-table th) {
  background: #252526 !important;
  color: #d4d4d4 !important;
  border-bottom: 1px solid #3e3e42 !important;
}

:deep(.el-table tr) {
  background: #1e1e1e !important;
  color: #d4d4d4 !important;
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background: #2a2d2e !important;
}

:deep(.el-table--enable-row-highlight .el-table__body tr.current-row > td) {
  background: #094771 !important;
}

:deep(.el-table td) {
  border-bottom: 1px solid #3e3e42 !important;
}

:deep(.el-table__empty-text) {
  color: #858585 !important;
}
</style>
