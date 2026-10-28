/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI: {
    sshConnect: (config: any) => Promise<any>
    sshDisconnect: (sessionId: string) => Promise<void>
    sshWrite: (sessionId: string, data: string) => Promise<void>
    sshResize: (sessionId: string, cols: number, rows: number) => Promise<void>
    sftpList: (sessionId: string, path: string) => Promise<any[]>
    sftpUpload: (sessionId: string, localPath: string, remotePath: string) => Promise<void>
    sftpDownload: (sessionId: string, remotePath: string, localPath: string) => Promise<void>
    sftpMkdir: (sessionId: string, path: string) => Promise<void>
    sftpDelete: (sessionId: string, path: string) => Promise<void>
    saveSession: (session: any) => Promise<void>
    loadSessions: () => Promise<any[]>
    deleteSession: (id: string) => Promise<void>
    selectFile: () => Promise<string | null>
    selectDirectory: () => Promise<string | null>
    onSSHData: (callback: (data: any) => void) => void
    onSSHError: (callback: (error: any) => void) => void
    onSSHClose: (callback: (sessionId: string) => void) => void
    windowMinimize: () => Promise<void>
    windowClose: () => Promise<void>
    windowMaximize: () => Promise<void>
  }
}
