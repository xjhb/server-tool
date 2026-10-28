<template>
  <div class="terminal-container" ref="terminalContainer">
    <div class="terminal-loading" v-if="loading">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>正在连接...</span>
    </div>
    <div class="terminal" ref="terminalRef"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import type { Tab } from '@/stores/tab'

const props = defineProps<{
  tab: Tab
}>()

const terminalRef = ref<HTMLDivElement>()
const terminalContainer = ref<HTMLDivElement>()
const loading = ref(true)
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let dataHandler: ((data: any) => void) | null = null
let closeHandler: ((sessionId: string) => void) | null = null
let errorHandler: ((error: any) => void) | null = null

onMounted(async () => {
  await initTerminal()
})

onUnmounted(() => {
  cleanup()
})

async function initTerminal() {
  if (!terminalRef.value) return

  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selectionBackground: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    allowProposedApi: true
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.loadAddon(new WebLinksAddon())
  term.open(terminalRef.value)
  
  await nextTick()
  fitAddon.fit()

  term.onData((data) => {
    window.electronAPI.sshWrite(props.tab.sessionId, data)
  })

  resizeObserver = new ResizeObserver(() => {
    if (fitAddon && term) {
      fitAddon.fit()
      const { cols, rows } = term
      window.electronAPI.sshResize(props.tab.sessionId, cols, rows)
    }
  })
  resizeObserver.observe(terminalContainer.value!)

  dataHandler = (data: any) => {
    if (data.sessionId === props.tab.sessionId && term) {
      term.write(data.data)
    }
  }

  closeHandler = (sessionId: string) => {
    if (sessionId === props.tab.sessionId && term) {
      term.write('\r\n\x1b[31m[连接已断开]\x1b[0m\r\n')
    }
  }

  errorHandler = (error: any) => {
    if (error.sessionId === props.tab.sessionId && term) {
      term.write(`\r\n\x1b[31m[错误: ${error.error}]\x1b[0m\r\n`)
    }
  }

  window.electronAPI.onSSHData(dataHandler)
  window.electronAPI.onSSHClose(closeHandler)
  window.electronAPI.onSSHError(errorHandler)

  try {
    const result = await window.electronAPI.sshConnect({
      host: props.tab.config.host,
      port: props.tab.config.port,
      username: props.tab.config.username,
      password: props.tab.config.password
    })

    if (result.success) {
      loading.value = false
      await nextTick()
      if (fitAddon && term) {
        fitAddon.fit()
        const { cols, rows } = term
        window.electronAPI.sshResize(props.tab.sessionId, cols, rows)
      }
    }
  } catch (err: any) {
    loading.value = false
    if (term) {
      term.write(`\r\n\x1b[31m[连接失败: ${err.message}]\x1b[0m\r\n`)
    }
  }
}

function cleanup() {
  resizeObserver?.disconnect()
  term?.dispose()
  window.electronAPI.sshDisconnect(props.tab.sessionId)
}

function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0))
}
</script>

<style scoped>
.terminal-container {
  height: 100%;
  width: 100%;
  position: relative;
  background: #1e1e1e;
}

.terminal {
  height: 100%;
  width: 100%;
}

.terminal-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d4d4d4;
  font-size: 14px;
  z-index: 10;
  background: rgba(30, 30, 30, 0.9);
  padding: 12px 24px;
  border-radius: 4px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
