import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  sshConnect: (config: any) => ipcRenderer.invoke('ssh:connect', config),
  sshDisconnect: (sessionId: string) => ipcRenderer.invoke('ssh:disconnect', sessionId),
  sshWrite: (sessionId: string, data: string) => ipcRenderer.invoke('ssh:write', sessionId, data),
  sshResize: (sessionId: string, cols: number, rows: number) => ipcRenderer.invoke('ssh:resize', sessionId, cols, rows),
  
  sftpConnect: (config: any) => ipcRenderer.invoke('sftp:connect', config),
  sftpList: (sessionId: string, path: string) => ipcRenderer.invoke('sftp:list', sessionId, path),
  sftpUpload: (sessionId: string, localPath: string, remotePath: string) => ipcRenderer.invoke('sftp:upload', sessionId, localPath, remotePath),
  sftpDownload: (sessionId: string, remotePath: string, localPath: string) => ipcRenderer.invoke('sftp:download', sessionId, remotePath, localPath),
  sftpMkdir: (sessionId: string, path: string) => ipcRenderer.invoke('sftp:mkdir', sessionId, path),
  sftpDelete: (sessionId: string, path: string) => ipcRenderer.invoke('sftp:delete', sessionId, path),
  sftpStat: (sessionId: string, path: string) => ipcRenderer.invoke('sftp:stat', sessionId, path),
  
  saveSession: (session: any) => ipcRenderer.invoke('session:save', session),
  loadSessions: () => ipcRenderer.invoke('session:load'),
  deleteSession: (id: string) => ipcRenderer.invoke('session:delete', id),
  
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  
  onSSHData: (callback: (data: any) => void) => {
    ipcRenderer.on('ssh:data', (event, data) => callback(data))
  },
  onSSHError: (callback: (error: any) => void) => {
    ipcRenderer.on('ssh:error', (event, error) => callback(error))
  },
  onSSHClose: (callback: (sessionId: string) => void) => {
    ipcRenderer.on('ssh:close', (event, sessionId) => callback(sessionId))
  },

  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize')
})
