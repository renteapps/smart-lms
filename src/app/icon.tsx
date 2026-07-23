import { ImageResponse } from 'next/og'
import { HugeiconsIcon } from '@hugeicons/react'
import { CourseIcon } from '@hugeicons/core-free-icons'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HugeiconsIcon icon={CourseIcon} size={28} color="#2563EB" />
      </div>
    ),
    {
      ...size,
    }
  )
}
