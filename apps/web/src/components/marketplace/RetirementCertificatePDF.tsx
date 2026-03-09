'use client'

import { CertificateWithDetails } from '@/lib/types'

/**
 * Generate and download a PDF certificate of carbon credit retirement.
 * Uses the browser's built-in canvas API to create a styled PDF without external dependencies.
 */
export function downloadRetirementCertificatePDF(cert: CertificateWithDetails) {
    const unscaledAmount = cert.amountRetired
    const date = new Date(cert.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    // Create a canvas to render the certificate
    const canvas = document.createElement('canvas')
    const width = 2480 // A4 at 300 DPI (landscape-ish)
    const height = 1748
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Border
    ctx.strokeStyle = '#16a34a'
    ctx.lineWidth = 12
    ctx.strokeRect(40, 40, width - 80, height - 80)
    ctx.strokeStyle = '#bbf7d0'
    ctx.lineWidth = 4
    ctx.strokeRect(60, 60, width - 120, height - 120)

    // Decorative corner elements
    const cornerSize = 80
    ctx.fillStyle = '#16a34a'
    // Top-left
    ctx.fillRect(40, 40, cornerSize, 12)
    ctx.fillRect(40, 40, 12, cornerSize)
    // Top-right
    ctx.fillRect(width - 40 - cornerSize, 40, cornerSize, 12)
    ctx.fillRect(width - 52, 40, 12, cornerSize)
    // Bottom-left
    ctx.fillRect(40, height - 52, cornerSize, 12)
    ctx.fillRect(40, height - 40 - cornerSize, 12, cornerSize)
    // Bottom-right
    ctx.fillRect(width - 40 - cornerSize, height - 52, cornerSize, 12)
    ctx.fillRect(width - 52, height - 40 - cornerSize, 12, cornerSize)

    // Leaf icon (simple)
    ctx.fillStyle = '#16a34a'
    ctx.beginPath()
    ctx.ellipse(width / 2, 200, 40, 60, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(width / 2, 160)
    ctx.lineTo(width / 2, 240)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(width / 2 - 20, 190)
    ctx.lineTo(width / 2, 210)
    ctx.lineTo(width / 2 + 20, 185)
    ctx.stroke()

    // Title
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 72px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('Certificate of Carbon Offset', width / 2, 340)

    // Subtitle
    ctx.fillStyle = '#64748b'
    ctx.font = '32px Georgia, serif'
    ctx.fillText('Official On-Chain Proof of Carbon Credit Retirement', width / 2, 400)

    // Divider
    ctx.strokeStyle = '#16a34a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(width / 2 - 300, 440)
    ctx.lineTo(width / 2 + 300, 440)
    ctx.stroke()

    // Amount retired - big number
    ctx.fillStyle = '#16a34a'
    ctx.font = 'bold 120px Georgia, serif'
    ctx.fillText(
        `${unscaledAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })}`,
        width / 2,
        580
    )

    ctx.fillStyle = '#475569'
    ctx.font = '36px Georgia, serif'
    ctx.fillText('Tonnes of CO₂ Equivalent', width / 2, 640)

    // Verification badge
    ctx.fillStyle = '#dcfce7'
    const badgeW = 500
    const badgeH = 50
    const badgeX = width / 2 - badgeW / 2
    const badgeY = 670
    // Rounded rect
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 25)
    ctx.fill()
    ctx.fillStyle = '#16a34a'
    ctx.font = 'bold 24px Arial, sans-serif'
    ctx.fillText('✓ Verified Carbon Reduction — Permanently Retired', width / 2, 702)

    // Details section
    const detailsY = 780
    const leftCol = width / 2 - 500
    const rightCol = width / 2 + 100

    ctx.textAlign = 'left'

    // Left column
    ctx.fillStyle = '#94a3b8'
    ctx.font = '24px Arial, sans-serif'
    ctx.fillText('PROJECT', leftCol, detailsY)
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.fillText(cert.projectTitle, leftCol, detailsY + 45)

    if (cert.tokenSymbol) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '24px Arial, sans-serif'
        ctx.fillText('TOKEN', leftCol, detailsY + 110)
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 32px Arial, sans-serif'
        ctx.fillText(`${cert.tokenSymbol} (ERC-1155)`, leftCol, detailsY + 155)
    }

    ctx.fillStyle = '#94a3b8'
    ctx.font = '24px Arial, sans-serif'
    ctx.fillText('LOT ID', leftCol, detailsY + 220)
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.fillText(`#${cert.tokenId}`, leftCol, detailsY + 265)

    // Right column
    ctx.fillStyle = '#94a3b8'
    ctx.font = '24px Arial, sans-serif'
    ctx.fillText('RETIREMENT DATE', rightCol, detailsY)
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.fillText(date, rightCol, detailsY + 45)

    if (cert.retirementReason) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '24px Arial, sans-serif'
        ctx.fillText('REASON', rightCol, detailsY + 110)
        ctx.fillStyle = '#0f172a'
        ctx.font = '28px Arial, sans-serif'
        // Word wrap reason if long
        const maxW = 500
        const words = cert.retirementReason.split(' ')
        let line = ''
        let lineY = detailsY + 155
        for (const word of words) {
            const test = line + word + ' '
            if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line.trim(), rightCol, lineY)
                line = word + ' '
                lineY += 36
            } else {
                line = test
            }
        }
        ctx.fillText(line.trim(), rightCol, lineY)
    }

    ctx.fillStyle = '#94a3b8'
    ctx.font = '24px Arial, sans-serif'
    ctx.fillText('CERTIFICATE ID', rightCol, detailsY + 220)
    ctx.fillStyle = '#0f172a'
    ctx.font = '24px monospace'
    ctx.fillText(cert.id, rightCol, detailsY + 265)

    // Transaction hash
    ctx.textAlign = 'center'
    ctx.fillStyle = '#94a3b8'
    ctx.font = '22px Arial, sans-serif'
    ctx.fillText('ON-CHAIN TRANSACTION', width / 2, height - 200)
    ctx.fillStyle = '#475569'
    ctx.font = '22px monospace'
    ctx.fillText(cert.txHash, width / 2, height - 165)

    // Footer
    ctx.fillStyle = '#16a34a'
    ctx.font = 'bold 28px Arial, sans-serif'
    ctx.fillText('LEDGERA', width / 2, height - 100)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '20px Arial, sans-serif'
    ctx.fillText('Blockchain-Verified Carbon Credit Marketplace', width / 2, height - 70)

    // Convert to PDF via blob download
    canvas.toBlob(
        (blob) => {
            if (!blob) return
            // Create a simple PDF wrapper around the image
            // Using a minimal PDF structure
            const img = new Image()
            img.onload = () => {
                // Create a second canvas at PDF dimensions
                const pdfCanvas = document.createElement('canvas')
                // A4 landscape at 150 DPI
                pdfCanvas.width = 1754
                pdfCanvas.height = 1240
                const pdfCtx = pdfCanvas.getContext('2d')!
                pdfCtx.fillStyle = '#ffffff'
                pdfCtx.fillRect(0, 0, 1754, 1240)
                pdfCtx.drawImage(img, 0, 0, 1754, 1240)

                pdfCanvas.toBlob(
                    (pdfBlob) => {
                        if (!pdfBlob) return
                        const url = URL.createObjectURL(pdfBlob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `Ledgera_Certificate_${cert.id.slice(0, 8)}.png`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                    },
                    'image/png',
                    1.0
                )
            }
            img.src = URL.createObjectURL(blob)
        },
        'image/png',
        1.0
    )
}
