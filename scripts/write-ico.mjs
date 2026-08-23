import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const build = path.join(root, 'build')

function pngSize(buf) {
  if (buf[0] !== 0x89 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('not a PNG')
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function writeIco(pngPaths, outPath) {
  const images = pngPaths.map((file) => {
    const data = fs.readFileSync(file)
    const { width, height } = pngSize(data)
    return { width, height, data }
  })

  const count = images.length
  const headerSize = 6 + 16 * count
  let offset = headerSize
  const entries = images.map((img) => {
    const entry = { ...img, offset }
    offset += img.data.length
    return entry
  })

  const buf = Buffer.alloc(offset)
  buf.writeUInt16LE(0, 0)
  buf.writeUInt16LE(1, 2)
  buf.writeUInt16LE(count, 4)

  entries.forEach((img, i) => {
    const at = 6 + i * 16
    buf.writeUInt8(img.width >= 256 ? 0 : img.width, at)
    buf.writeUInt8(img.height >= 256 ? 0 : img.height, at + 1)
    buf.writeUInt8(0, at + 2)
    buf.writeUInt8(0, at + 3)
    buf.writeUInt16LE(1, at + 4)
    buf.writeUInt16LE(32, at + 6)
    buf.writeUInt32LE(img.data.length, at + 8)
    buf.writeUInt32LE(img.offset, at + 12)
    img.data.copy(buf, img.offset)
  })

  fs.writeFileSync(outPath, buf)
}

const sources = [16, 32, 48, 256]
  .map((n) => path.join(build, `icon-${n}.png`))
  .filter((p) => fs.existsSync(p))

if (!sources.length) {
  throw new Error('missing build/icon-*.png — run scripts/make-icons.ps1 first')
}

const out = path.join(build, 'icon.ico')
writeIco(sources, out)
console.log(`Wrote ${out} (${sources.length} sizes)`)
