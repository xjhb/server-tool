import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { Client, SFTPWrapper } from 'ssh2'
import Store from 'electron-store'

const store = new Store()

interface SSHSession {
  client: Client
  sftp?: SFTPWrapper
  shell?: any
}

const sessions = new Map<string, SSHSession>()

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hidden',
    frame: true
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.handle('ssh:connect', async (event, config) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return new Promise((resolve, reject) => {
    const client = new Client()
    
    client.on('ready', () => {
      client.shell((err, stream) => {
        if (err) {
          client.end()
          reject(err)
          return
        }

        sessions.set(sessionId, { client, shell: stream })

        stream.on('data', (data: Buffer) => {
          mainWindow?.webContents.send('ssh:data', {
            sessionId,
            data: data.toString('utf-8')
          })
        })

        stream.stderr.on('data', (data: Buffer) => {
          mainWindow?.webContents.send('ssh:data', {
            sessionId,
            data: data.toString('utf-8')
          })
        })

        stream.on('close', () => {
          mainWindow?.webContents.send('ssh:close', sessionId)
          sessions.delete(sessionId)
        })

        resolve({ sessionId, success: true })
      })
    })

    client.on('error', (err) => {
      mainWindow?.webContents.send('ssh:error', { sessionId, error: err.message })
      reject(err)
    })

    client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      readyTimeout: 10000,
      algorithms: {
        kex: [
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group15-sha512',
          'diffie-hellman-group16-sha512',
          'diffie-hellman-group17-sha512',
          'diffie-hellman-group18-sha512',
          'diffie-hellman-group-exchange-sha1',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm',
          'aes128-gcm@openssh.com',
          'aes256-gcm',
          'aes256-gcm@openssh.com',
          'aes256-cbc',
          'aes192-cbc',
          'aes128-cbc',
          'blowfish-cbc',
          '3des-cbc',
          'arcfour256',
          'arcfour128',
          'cast128-cbc',
          'arcfour'
        ]
      }
    })
  })
})

ipcMain.handle('ssh:disconnect', async (event, sessionId) => {
  const session = sessions.get(sessionId)
  if (session) {
    session.shell?.close()
    session.client.end()
    sessions.delete(sessionId)
  }
})

ipcMain.handle('ssh:write', async (event, sessionId, data) => {
  const session = sessions.get(sessionId)
  if (session?.shell) {
    session.shell.write(data)
  }
})

ipcMain.handle('ssh:resize', async (event, sessionId, cols, rows) => {
  const session = sessions.get(sessionId)
  if (session?.shell) {
    session.shell.setWindow(rows, cols, 480, 640)
  }
})

ipcMain.handle('sftp:connect', async (event, config) => {
  const sessionId = `sftp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return new Promise((resolve, reject) => {
    const client = new Client()
    
    client.on('ready', () => {
      client.sftp((err, sftp) => {
        if (err) {
          client.end()
          reject(err)
          return
        }

        sessions.set(sessionId, { client, sftp })
        resolve({ sessionId, success: true })
      })
    })

    client.on('error', reject)

    client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      readyTimeout: 10000
    })
  })
})

ipcMain.handle('sftp:list', async (event, sessionId, path) => {
  const session = sessions.get(sessionId)
  if (!session?.sftp) {
    throw new Error('SFTP not connected')
  }

  return new Promise((resolve, reject) => {
    session.sftp!.readdir(path, (err, list) => {
      if (err) {
        reject(err)
        return
      }
      resolve(list)
    })
  })
})

ipcMain.handle('sftp:upload', async (event, sessionId, localPath, remotePath) => {
  const session = sessions.get(sessionId)
  if (!session?.sftp) {
    throw new Error('SFTP not connected')
  }

  return new Promise((resolve, reject) => {
    session.sftp!.fastPut(localPath, remotePath, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve(true)
    })
  })
})

ipcMain.handle('sftp:download', async (event, sessionId, remotePath, localPath) => {
  const session = sessions.get(sessionId)
  if (!session?.sftp) {
    throw new Error('SFTP not connected')
  }

  return new Promise((resolve, reject) => {
    session.sftp!.fastGet(remotePath, localPath, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve(true)
    })
  })
})

ipcMain.handle('sftp:mkdir', async (event, sessionId, path) => {
  const session = sessions.get(sessionId)
  if (!session?.sftp) {
    throw new Error('SFTP not connected')
  }

  return new Promise((resolve, reject) => {
    session.sftp!.mkdir(path, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve(true)
    })
  })
})

ipcMain.handle('sftp:delete', async (event, sessionId, path) => {
  const session = sessions.get(sessionId)
  if (!session?.sftp) {
    throw new Error('SFTP not connected')
  }

  return new Promise((resolve, reject) => {
    session.sftp!.unlink(path, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve(true)
    })
  })
})

ipcMain.handle('sftp:stat', async (event, sessionId, path) => {
  const session = sessions.get(sessionId)
  if (!session?.sftp) {
    throw new Error('SFTP not connected')
  }

  return new Promise((resolve, reject) => {
    session.sftp!.stat(path, (err, stats) => {
      if (err) {
        reject(err)
        return
      }
      resolve(stats)
    })
  })
})

ipcMain.handle('session:save', async (event, session) => {
  const sessions = store.get('sessions', []) as any[]
  const index = sessions.findIndex(s => s.id === session.id)
  
  if (index >= 0) {
    sessions[index] = session
  } else {
    sessions.push(session)
  }
  
  store.set('sessions', sessions)
  return true
})

ipcMain.handle('session:load', async () => {
  return store.get('sessions', [])
})

ipcMain.handle('session:delete', async (event, id) => {
  const sessions = store.get('sessions', []) as any[]
  const filtered = sessions.filter(s => s.id !== id)
  store.set('sessions', filtered)
  return true
})

ipcMain.handle('dialog:selectFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  })
  return result.canceled ? null : result.filePaths
})

ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})
