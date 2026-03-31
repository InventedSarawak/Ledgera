import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getPolygonCentroid(polygon?: [number, number][]): { lat: number; lng: number } {
    if (!polygon || !Array.isArray(polygon) || polygon.length === 0) {
        return { lat: 0, lng: 0 }
    }

    let twiceArea = 0
    let x = 0
    let y = 0
    const n = polygon.length

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const [lat1, lng1] = polygon[i]
        const [lat2, lng2] = polygon[j]
        const f = lng1 * lat2 - lng2 * lat1
        twiceArea += f
        x += (lng1 + lng2) * f
        y += (lat1 + lat2) * f
    }

    if (twiceArea === 0) {
        let minLat = 90,
            maxLat = -90,
            minLng = 180,
            maxLng = -180
        polygon.forEach(([lat, lng]) => {
            if (lat < minLat) minLat = lat
            if (lat > maxLat) maxLat = lat
            if (lng < minLng) minLng = lng
            if (lng > maxLng) maxLng = lng
        })
        return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }
    }

    const f = twiceArea * 3
    return { lat: y / f, lng: x / f }
}
