import { supabase } from '../lib/supabase'

const BUCKET = 'clinic-assets'

export const uploadClinicImage = async (
  clinicId: string,
  file: File,
  type: 'logo' | 'signature'
): Promise<{ url: string; path: string }> => {
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${clinicId}/${type}.${ext}`

  // Compress if image is large
  const fileToUpload = file.size > 500_000 ? await compressImage(file) : file

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileToUpload, { upsert: true, contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: `${data.publicUrl}?t=${Date.now()}`, path }
}

export const deleteClinicImage = async (path: string): Promise<void> => {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 800
        let { width, height } = img

        if (width > height) {
          if (width > MAX_DIM) { height = height * (MAX_DIM / width); width = MAX_DIM }
        } else {
          if (height > MAX_DIM) { width = width * (MAX_DIM / height); height = MAX_DIM }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'))
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.82
        )
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}
