import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const windows = process.platform === 'win32'
const result = spawnSync(windows ? 'gradlew.bat' : './gradlew', ['assembleDebug'], {
  cwd: resolve('android'), stdio: 'inherit', shell: windows,
})
if (result.error) console.error(result.error.message)
if (result.status === 0) console.log('APK: apps/web/android/app/build/outputs/apk/debug/app-debug.apk')
process.exit(result.status ?? 1)
