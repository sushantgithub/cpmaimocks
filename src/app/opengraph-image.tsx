import { ImageResponse } from 'next/og'

export const alt = 'CertMocks — PMI CPMAI Mock Exams & Practice Tests'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: 'white',
          padding: 60,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.15)',
            fontSize: 48,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          C
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          CertMocks
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#93c5fd',
            textAlign: 'center',
            lineHeight: 1.4,
            maxWidth: 800,
          }}
        >
          PMI CPMAI Mock Exams & Practice Tests
        </div>

        {/* Features row */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 40,
            fontSize: 18,
            color: '#bfdbfe',
          }}
        >
          <span>✓ 120-Question Mock Exams</span>
          <span>✓ Domain Analytics</span>
          <span>✓ Detailed Explanations</span>
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 18,
            color: '#93c5fd',
          }}
        >
          certmocks.com
        </div>
      </div>
    ),
    { ...size },
  )
}
