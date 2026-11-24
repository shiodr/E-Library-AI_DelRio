import { registerPlugin } from '@capacitor/core'
import { downloadBookFile, native } from './api'

const bookFiles = registerPlugin<{
  savePdf(options: { filename: string; base64: string }): Promise<{ saved: boolean }>
}>('BookFiles')

export async function saveBookFile(bookId: string, filename: string): Promise<boolean> {
  const file = await downloadBookFile(bookId)
  if (native) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Unable to read the book file.'))
      reader.readAsDataURL(file)
    })
    const { saved } = await bookFiles.savePdf({ filename, base64: data.split(',')[1] })
    return saved
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  return true
}
