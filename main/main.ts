import path from 'path'
import { app, ipcMain, powerSaveBlocker, net, Notification, shell } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers/create-window'
import fs from 'fs'
import os from 'os'

// Load environment variables across dev and production packages
function loadEnvironment() {
  const candidateEnvPaths = [
    path.join(process.cwd(), '.env'),
    process.resourcesPath ? path.join(process.resourcesPath, '.env') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', '.env') : null,
    path.join(import.meta.dirname, '..', '.env'),
    path.join(import.meta.dirname, '.env'),
  ].filter(Boolean) as string[]

  for (const envPath of candidateEnvPaths) {
    if (fs.existsSync(envPath)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(envPath)
          console.log(`[main env] Loaded environment from: ${envPath}`)
          return
        }
      } catch (err) {
        console.warn(`[main env] Failed to load ${envPath}:`, err)
      }
    }
  }
}
loadEnvironment()

const isProd = process.env.NODE_ENV === 'production'

const dbPath = isProd 
  ? path.join(app.getPath('userData'), 'dev.db')
  : path.join(process.cwd(), 'dev.db')

process.env.DATABASE_PATH = dbPath

// --- Express API Server ---
import { startExpressServer } from './server/server.js'
// --------------------------

// --- Database Initialization ---
function initializeDatabase() {
  try {
    if (isProd) {
      const destPath = process.env.DATABASE_PATH!
      const userDataDir = path.dirname(destPath)
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true })
      }
      if (!fs.existsSync(destPath)) {
        const candidatePaths = [
          path.join(process.resourcesPath, 'dev.db'),
          path.join(process.resourcesPath, 'prod-empty.db'),
          path.join(process.resourcesPath, 'app.asar.unpacked', 'dev.db'),
          path.join(import.meta.dirname, '..', 'dev.db'),
          path.join(import.meta.dirname, 'dev.db')
        ]
        const srcPath = candidatePaths.find(p => fs.existsSync(p))
        if (srcPath) {
          fs.copyFileSync(srcPath, destPath)
          console.log(`Database initialized from ${srcPath} to ${destPath}`)
        } else {
          console.warn(`Template database not found in candidate paths:`, candidatePaths)
        }
      }
    }
    console.log("Database initialized on startup at:", process.env.DATABASE_PATH);
  } catch (error) {
    console.error("Failed to initialize database tables:", error);
  }
}
// -------------------------------

// --- Storage Limit Checker ---
let hasWarnedDiskSpace = false;
function startDiskSpaceMonitor() {
  const checkSpace = () => {
    fs.statfs(app.getPath('userData'), (err, stats) => {
      if (err) return;
      const availableBytes = stats.bavail * stats.bsize;
      const availableMB = availableBytes / (1024 * 1024);

      if (availableMB < 500) {
        if (!hasWarnedDiskSpace) {
          hasWarnedDiskSpace = true;
          new Notification({
            title: '⚠️ Storage Almost Full',
            body: `Only ${Math.round(availableMB)}MB remaining. Please free up space to ensure data is saved safely.`
          }).show();
        }
      } else {
        hasWarnedDiskSpace = false;
      }
    });
  };

  checkSpace();
  setInterval(checkSpace, 300 * 1000);
}
// ------------------------------

if (process.platform === 'win32') {
  app.setAppUserModelId(isProd ? 'com.my-nextron-app' : 'process.execPath')
}

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

; (async () => {
  await app.whenReady()

  // 1. Sync the Database First!
  initializeDatabase()

  // 2. Start the background Express API Server
  startExpressServer()

  // Start the background disk space monitor
  startDiskSpaceMonitor()

  // Wait for internet connection on startup
  if (!net.isOnline()) {
    console.log('No internet detected. Waiting for connection...')
    
    new Notification({
      title: 'App Waiting',
      body: 'Waiting for internet connection to start services...'
    }).show()

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (net.isOnline()) {
          clearInterval(interval)
          console.log('Internet connected!')
          
          new Notification({
            title: 'Internet Connected',
            body: 'Starting application services now!'
          }).show()
          
          resolve()
        }
      }, 5000)
    })
  }

  powerSaveBlocker.start('prevent-app-suspension')

  app.setLoginItemSettings({
    openAtLogin: true,
  })

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.js'),
      webSecurity: false,
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/`)
    mainWindow.webContents.openDevTools()
  }
})()

ipcMain.on('request-server-status', (event) => {
  event.reply('server-Internat-status', {
    status: net.isOnline(),
  })
})

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

ipcMain.on('request-local-ip', (event) => {
  event.reply('server-local-ip', {
    ip: getLocalIpAddress(),
    port: 49215
  })
})

ipcMain.on('open-external-url', (event, url) => {
  if (url) {
    shell.openExternal(url)
  }
})

ipcMain.on('show-notification', (_event, data: { title?: string; body?: string }) => {
  try {
    if (Notification.isSupported()) {
      new Notification({
        title: data?.title || '⏰ School Desk Reminder',
        body: data?.body || '',
      }).show()
    }
  } catch (err) {
    console.error('Failed to show notification via IPC:', err)
  }
})

ipcMain.on('restart-app', () => {
  app.relaunch()
  app.quit()
})

app.on('window-all-closed', () => {
  app.quit()
})

process.on('uncaughtException', (error) => {
  console.error('Fatal error in Main Process:', error)
  app.relaunch()
  app.quit()
})

app.on('render-process-gone', (event, webContents, details) => {
  if (details.reason === 'crashed' || details.reason === 'oom') {
    console.error('Renderer process crashed! Relaunching...')
    app.relaunch()
    app.quit()
  }
})