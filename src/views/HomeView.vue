<template>
  <div class="home-container">
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>服务器列表</h2>
        <el-button type="primary" size="small" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          新建连接
        </el-button>
      </div>
      
      <div class="session-groups">
        <div v-for="group in groupedSessions" :key="group.name" class="session-group">
          <div class="group-header" @click="toggleGroup(group.name)">
            <el-icon class="group-arrow" :class="{ expanded: expandedGroups.includes(group.name) }">
              <CaretRight />
            </el-icon>
            <span class="group-name">{{ group.name || '默认分组' }}</span>
            <span class="group-count">{{ group.sessions.length }}</span>
          </div>
          
          <div v-show="expandedGroups.includes(group.name)" class="group-sessions">
            <div
              v-for="session in group.sessions"
              :key="session.id"
              class="session-item"
              @click="selectSession(session)"
              :class="{ selected: selectedSession?.id === session.id }"
            >
              <div class="session-info">
                <div class="session-name">{{ session.name }}</div>
                <div class="session-host">{{ session.username }}@{{ session.host }}:{{ session.port }}</div>
              </div>
              <div class="session-actions">
                <el-button type="primary" size="small" @click.stop="connectTerminal(session)">
                  终端
                </el-button>
                <el-button type="success" size="small" @click.stop="connectSftp(session)">
                  文件
                </el-button>
                <el-dropdown @command="(cmd) => handleCommand(cmd, session)">
                  <el-button size="small" @click.stop>
                    <el-icon><More /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="tab-bar">
        <div
          v-for="tab in tabStore.tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: tab.active }"
          @click="tabStore.setActiveTab(tab.id)"
        >
          <el-icon class="tab-icon">
            <Monitor v-if="tab.type === 'terminal'" />
            <Folder v-else />
          </el-icon>
          <span class="tab-title">{{ tab.title }}</span>
          <el-icon class="tab-close" @click.stop="closeTab(tab.id)">
            <Close />
          </el-icon>
        </div>
        <div v-if="tabStore.tabs.length === 0" class="tab-empty">
          选择一个服务器连接，或新建连接
        </div>
      </div>

      <div class="tab-content">
        <div v-for="tab in tabStore.tabs" v-show="tab.active" :key="tab.id" class="tab-panel">
          <TerminalPanel v-if="tab.type === 'terminal'" :tab="tab" />
          <SftpPanel v-else :tab="tab" />
        </div>
        
        <div v-if="tabStore.tabs.length === 0" class="content-empty">
          <el-empty description="暂无连接，请从左侧选择服务器或新建连接" />
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingSession ? '编辑连接' : '新建连接'"
      width="500px"
    >
      <el-form :model="sessionForm" label-width="100px">
        <el-form-item label="连接名称">
          <el-input v-model="sessionForm.name" placeholder="例如：生产服务器" />
        </el-form-item>
        <el-form-item label="主机地址">
          <el-input v-model="sessionForm.host" placeholder="例如：192.168.1.100" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="sessionForm.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="sessionForm.username" placeholder="例如：root" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="sessionForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="分组">
          <el-input v-model="sessionForm.group" placeholder="可选，用于分类管理" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSessionData">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, CaretRight, More, Close, Monitor, Folder } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSessionStore, type SessionConfig } from '@/stores/session'
import { useTabStore, type Tab } from '@/stores/tab'
import TerminalPanel from '@/components/TerminalPanel.vue'
import SftpPanel from '@/components/SftpPanel.vue'

const sessionStore = useSessionStore()
const tabStore = useTabStore()

const dialogVisible = ref(false)
const editingSession = ref<SessionConfig | null>(null)
const selectedSession = ref<SessionConfig | null>(null)
const expandedGroups = ref<string[]>([])

const sessionForm = ref({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  password: '',
  group: ''
})

const groupedSessions = computed(() => {
  const groups = new Map<string, SessionConfig[]>()
  
  sessionStore.sessions.forEach(session => {
    const groupName = session.group || '默认分组'
    if (!groups.has(groupName)) {
      groups.set(groupName, [])
    }
    groups.get(groupName)!.push(session)
  })
  
  return Array.from(groups.entries()).map(([name, sessions]) => ({
    name,
    sessions
  }))
})

onMounted(async () => {
  await sessionStore.loadSessions()
  expandedGroups.value = sessionStore.getGroups()
  if (expandedGroups.value.length === 0 && groupedSessions.value.length > 0) {
    expandedGroups.value = groupedSessions.value.map(g => g.name)
  }
})

function toggleGroup(name: string) {
  const index = expandedGroups.value.indexOf(name)
  if (index >= 0) {
    expandedGroups.value.splice(index, 1)
  } else {
    expandedGroups.value.push(name)
  }
}

function showAddDialog() {
  editingSession.value = null
  sessionForm.value = {
    name: '',
    host: '',
    port: 22,
    username: 'root',
    password: '',
    group: ''
  }
  dialogVisible.value = true
}

function selectSession(session: SessionConfig) {
  selectedSession.value = session
}

async function saveSessionData() {
  if (!sessionForm.value.name || !sessionForm.value.host || !sessionForm.value.username || !sessionForm.value.password) {
    ElMessage.warning('请填写完整信息')
    return
  }

  const session: SessionConfig = {
    id: editingSession.value?.id || `session_${Date.now()}`,
    ...sessionForm.value,
    createdAt: editingSession.value?.createdAt || Date.now(),
    updatedAt: Date.now()
  }

  await sessionStore.saveSession(session)
  dialogVisible.value = false
  ElMessage.success('保存成功')
}

function handleCommand(command: string, session: SessionConfig) {
  if (command === 'edit') {
    editingSession.value = session
    sessionForm.value = { ...session }
    dialogVisible.value = true
  } else if (command === 'delete') {
    ElMessageBox.confirm('确定要删除这个连接吗？', '提示', {
      type: 'warning'
    }).then(async () => {
      await sessionStore.deleteSession(session.id)
      ElMessage.success('删除成功')
    }).catch(() => {})
  }
}

function connectTerminal(session: SessionConfig) {
  const tabId = `terminal_${session.id}_${Date.now()}`
  const tab: Tab = {
    id: tabId,
    type: 'terminal',
    title: `${session.name} (终端)`,
    sessionId: `ssh_${tabId}`,
    config: {
      host: session.host,
      port: session.port,
      username: session.username,
      password: session.password,
      name: session.name
    },
    active: false
  }
  tabStore.addTab(tab)
}

function connectSftp(session: SessionConfig) {
  const tabId = `sftp_${session.id}_${Date.now()}`
  const tab: Tab = {
    id: tabId,
    type: 'sftp',
    title: `${session.name} (文件)`,
    sessionId: `sftp_${tabId}`,
    config: {
      host: session.host,
      port: session.port,
      username: session.username,
      password: session.password,
      name: session.name
    },
    active: false
  }
  tabStore.addTab(tab)
}

async function closeTab(id: string) {
  const tab = tabStore.tabs.find(t => t.id === id)
  if (tab) {
    if (tab.type === 'terminal') {
      await window.electronAPI.sshDisconnect(tab.sessionId)
    }
    tabStore.removeTab(id)
  }
}
</script>

<style scoped>
.home-container {
  display: flex;
  height: 100vh;
  background: #1e1e1e;
}

.sidebar {
  width: 280px;
  background: #252526;
  border-right: 1px solid #3e3e42;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 16px;
  color: #d4d4d4;
}

.session-groups {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.session-group {
  margin-bottom: 4px;
}

.group-header {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.group-header:hover {
  background: #2a2d2e;
}

.group-arrow {
  margin-right: 4px;
  transition: transform 0.2s;
  color: #858585;
}

.group-arrow.expanded {
  transform: rotate(90deg);
}

.group-name {
  flex: 1;
  font-size: 13px;
  color: #cccccc;
  font-weight: 500;
}

.group-count {
  font-size: 12px;
  color: #858585;
  background: #3e3e42;
  padding: 2px 6px;
  border-radius: 10px;
}

.group-sessions {
  padding-left: 8px;
}

.session-item {
  padding: 10px 12px;
  margin: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.session-item:hover {
  background: #2a2d2e;
}

.session-item.selected {
  background: #094771;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 13px;
  color: #d4d4d4;
  font-weight: 500;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-host {
  font-size: 11px;
  color: #858585;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.session-item:hover .session-actions {
  opacity: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.tab-bar {
  height: 40px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  align-items: center;
  overflow-x: auto;
  padding: 0 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 36px;
  margin-right: 4px;
  background: #2d2d30;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
  max-width: 200px;
}

.tab-item:hover {
  background: #383838;
}

.tab-item.active {
  background: #1e1e1e;
  border-bottom: 2px solid #007acc;
}

.tab-icon {
  margin-right: 6px;
  color: #858585;
}

.tab-title {
  flex: 1;
  font-size: 12px;
  color: #d4d4d4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  margin-left: 8px;
  color: #858585;
  transition: color 0.2s;
}

.tab-close:hover {
  color: #f48771;
}

.tab-empty {
  padding: 0 16px;
  font-size: 12px;
  color: #858585;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.tab-panel {
  height: 100%;
  width: 100%;
}

.content-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
