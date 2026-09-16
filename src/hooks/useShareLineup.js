import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'

function waitForImageLoad(image) {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve()

  return new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', resolve, { once: true })
  })
}

async function waitForCaptureImages(container) {
  await Promise.all([...container.querySelectorAll('img')].map(waitForImageLoad))
}

export function useShareLineup({ team, title, formation, starters, subs, clubTheme, setStatus }) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareFile, setShareFile] = useState(null)
  const shareCardRef = useRef(null)

  useEffect(() => {
    setShareFile(null)
  }, [team?.id, title, formation, starters, subs])

  const shareLineup = async () => {
    if (!shareCardRef.current) {
      setStatus({ loading: false, message: 'No se pudo preparar la imagen.' })
      return
    }
    if (!Object.keys(starters).length && !subs.length) {
      setStatus({ loading: false, message: 'Añade al menos un titular o suplente antes de crear la imagen.' })
      return
    }
    setIsSharing(true)
    try {
      await waitForCaptureImages(shareCardRef.current)
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: clubTheme.primary,
        scale: 1,
        useCORS: true,
        logging: false,
        imageTimeout: 15000,
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('No se pudo generar la imagen.')
      const lineupName = title || team?.name || 'mi-alineacion'
      const fileName = `${lineupName.toLowerCase().replaceAll(' ', '-')}-alineacion.png`
      setShareFile(new File([blob], fileName, { type: 'image/png' }))
      setStatus({ loading: false, message: 'Imagen lista. Usa “Compartir foto” para enviarla.' })
    } catch (error) {
      console.error('No se pudo crear la imagen de la alineación.', error)
      setStatus({ loading: false, message: 'No se pudo generar la imagen. Prueba a crearla de nuevo.' })
    } finally { setIsSharing(false) }
  }

  const sharePreparedImage = async () => {
    if (!shareFile) return
    const lineupName = title || team?.name || 'mi alineación'
    const shareData = { title: `Alineación de ${lineupName}`, text: `Mi once de ${lineupName}`, files: [shareFile] }
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [shareFile] }))) {
        await navigator.share(shareData)
        return
      }
      const url = URL.createObjectURL(shareFile)
      const link = document.createElement('a')
      link.href = url
      link.download = shareFile.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus({ loading: false, message: 'Tu dispositivo no admite compartir archivos directamente. Imagen descargada.' })
    } catch (error) {
      if (error.name !== 'AbortError') setStatus({ loading: false, message: 'No se pudo abrir el menú de compartir. Prueba a descargar la imagen.' })
    }
  }

  return { isSharing, shareFile, shareCardRef, shareLineup, sharePreparedImage }
}
