import { useLayoutEffect, useRef, useState } from 'react'
import type { PosterSpec } from '../lib/api'
import PosterTemplate from './PosterTemplate'

/** Keep the preview's natural portrait proportions at any container width. */
export default function PosterPreview({ spec }: { spec: PosterSpec }) {
  const host = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ scale: 0, height: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      if (!host.current || !inner.current) return
      const scale = host.current.clientWidth / 1000
      setSize({ scale, height: inner.current.offsetHeight * scale })
    }
    const observer = new ResizeObserver(measure)
    if (host.current) observer.observe(host.current)
    if (inner.current) observer.observe(inner.current)
    measure()
    return () => observer.disconnect()
  }, [spec])
  return <div ref={host} style={{ width: '100%', height: size.height, position: 'relative', overflow: 'hidden' }}>
    <div ref={inner} style={{ width: 1000, transform: `scale(${size.scale})`, transformOrigin: 'top left', visibility: size.scale ? 'visible' : 'hidden' }}>
      <PosterTemplate spec={spec} />
    </div>
  </div>
}
