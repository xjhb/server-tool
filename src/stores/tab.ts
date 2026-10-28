import { defineStore } from 'pinia'
import { ref } from 'vue'

export type TabType = 'terminal' | 'sftp'

export interface Tab {
  id: string
  type: TabType
  title: string
  sessionId: string
  config: {
    host: string
    port: number
    username: string
    password: string
    name?: string
  }
  active: boolean
}

export const useTabStore = defineStore('tab', () => {
  const tabs = ref<Tab[]>([])
  const activeTabId = ref<string | null>(null)

  function addTab(tab: Tab) {
    tabs.value.forEach(t => t.active = false)
    tab.active = true
    tabs.value.push(tab)
    activeTabId.value = tab.id
  }

  function removeTab(id: string) {
    const index = tabs.value.findIndex(t => t.id === id)
    if (index < 0) return
    
    const wasActive = tabs.value[index].active
    tabs.value.splice(index, 1)
    
    if (wasActive && tabs.value.length > 0) {
      const newIndex = Math.min(index, tabs.value.length - 1)
      tabs.value[newIndex].active = true
      activeTabId.value = tabs.value[newIndex].id
    } else if (tabs.value.length === 0) {
      activeTabId.value = null
    }
  }

  function setActiveTab(id: string) {
    tabs.value.forEach(t => t.active = t.id === id)
    activeTabId.value = id
  }

  function getActiveTab(): Tab | null {
    return tabs.value.find(t => t.id === activeTabId.value) || null
  }

  return { tabs, activeTabId, addTab, removeTab, setActiveTab, getActiveTab }
})
