import AppKit
import Foundation

struct IconSize {
    let name: String
    let pixels: Int
}

let outputPath = CommandLine.arguments.dropFirst().first ?? "GitLocal.icns"
let outputURL = URL(fileURLWithPath: outputPath)
let fileManager = FileManager.default
let iconsetURL = outputURL.deletingPathExtension().appendingPathExtension("iconset")

let sizes = [
    IconSize(name: "icon_16x16.png", pixels: 16),
    IconSize(name: "icon_16x16@2x.png", pixels: 32),
    IconSize(name: "icon_32x32.png", pixels: 32),
    IconSize(name: "icon_32x32@2x.png", pixels: 64),
    IconSize(name: "icon_128x128.png", pixels: 128),
    IconSize(name: "icon_128x128@2x.png", pixels: 256),
    IconSize(name: "icon_256x256.png", pixels: 256),
    IconSize(name: "icon_256x256@2x.png", pixels: 512),
    IconSize(name: "icon_512x512.png", pixels: 512),
    IconSize(name: "icon_512x512@2x.png", pixels: 1024),
]

try? fileManager.removeItem(at: iconsetURL)
try fileManager.createDirectory(at: iconsetURL, withIntermediateDirectories: true)
try fileManager.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)

func point(_ x: CGFloat, _ y: CGFloat, _ scale: CGFloat) -> NSPoint {
    NSPoint(x: x * scale, y: y * scale)
}

func rect(_ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ height: CGFloat, _ scale: CGFloat) -> NSRect {
    NSRect(x: x * scale, y: y * scale, width: width * scale, height: height * scale)
}

func color(_ hex: UInt32) -> NSColor {
    let r = CGFloat((hex >> 16) & 0xff) / 255
    let g = CGFloat((hex >> 8) & 0xff) / 255
    let b = CGFloat(hex & 0xff) / 255
    return NSColor(red: r, green: g, blue: b, alpha: 1)
}

func drawIcon(size: Int) -> NSImage {
    let scale = CGFloat(size) / 128
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()
    NSGraphicsContext.current?.imageInterpolation = .high
    NSGraphicsContext.current?.shouldAntialias = true

    let background = NSBezierPath(roundedRect: rect(0, 0, 128, 128, scale), xRadius: 27 * scale, yRadius: 27 * scale)
    color(0x0d1722).setFill()
    background.fill()

    let bgOverlay = NSGradient(colors: [color(0x16343a), color(0x0b1720)])!
    bgOverlay.draw(in: background, angle: -45)

    let branchGradient = NSGradient(colors: [color(0x31d488), color(0x61b7ff)])!
    let branchPath = NSBezierPath()
    branchPath.move(to: point(42, 86, scale))
    branchPath.line(to: point(42, 50, scale))
    branchPath.curve(to: point(56, 36, scale), controlPoint1: point(42, 42, scale), controlPoint2: point(48, 36, scale))
    branchPath.line(to: point(77, 36, scale))
    branchPath.lineWidth = 12 * scale
    branchPath.lineCapStyle = .round
    branchPath.lineJoinStyle = .round
    branchGradient.draw(in: branchPath, angle: 35)

    let branchCurve = NSBezierPath()
    branchCurve.move(to: point(42, 58, scale))
    branchCurve.curve(to: point(73, 89, scale), controlPoint1: point(60, 58, scale), controlPoint2: point(73, 71, scale))
    branchCurve.lineWidth = 12 * scale
    branchCurve.lineCapStyle = .round
    branchCurve.lineJoinStyle = .round
    branchGradient.draw(in: branchCurve, angle: 35)

    for (x, y, strokeHex) in [(42.0, 88.0, 0x31d488), (80.0, 36.0, 0x61b7ff), (74.0, 90.0, 0x50e6a1)] {
        let node = NSBezierPath(ovalIn: rect(x - 13, y - 13, 26, 26, scale))
        color(0x0d1f2a).setFill()
        node.fill()
        node.lineWidth = 7 * scale
        color(UInt32(strokeHex)).setStroke()
        node.stroke()
    }

    image.unlockFocus()
    return image
}

for iconSize in sizes {
    let image = drawIcon(size: iconSize.pixels)
    guard
        let tiff = image.tiffRepresentation,
        let bitmap = NSBitmapImageRep(data: tiff),
        let png = bitmap.representation(using: .png, properties: [:])
    else {
        throw NSError(domain: "GitLocalIcon", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not render \(iconSize.name)"])
    }
    try png.write(to: iconsetURL.appendingPathComponent(iconSize.name))
}

let icnsChunks: [(type: String, file: String)] = [
    ("icp4", "icon_16x16.png"),
    ("icp5", "icon_32x32.png"),
    ("icp6", "icon_32x32@2x.png"),
    ("ic07", "icon_128x128.png"),
    ("ic08", "icon_256x256.png"),
    ("ic09", "icon_512x512.png"),
    ("ic10", "icon_512x512@2x.png"),
]

func appendFourCC(_ value: String, to data: inout Data) {
    data.append(contentsOf: value.utf8)
}

func appendUInt32(_ value: UInt32, to data: inout Data) {
    data.append(UInt8((value >> 24) & 0xff))
    data.append(UInt8((value >> 16) & 0xff))
    data.append(UInt8((value >> 8) & 0xff))
    data.append(UInt8(value & 0xff))
}

var chunkData = Data()
for chunk in icnsChunks {
    let png = try Data(contentsOf: iconsetURL.appendingPathComponent(chunk.file))
    appendFourCC(chunk.type, to: &chunkData)
    appendUInt32(UInt32(png.count + 8), to: &chunkData)
    chunkData.append(png)
}

var icns = Data()
appendFourCC("icns", to: &icns)
appendUInt32(UInt32(chunkData.count + 8), to: &icns)
icns.append(chunkData)
try icns.write(to: outputURL)
try? fileManager.removeItem(at: iconsetURL)
