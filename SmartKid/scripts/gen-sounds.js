/**
 * 音效生成脚本
 * 用法：node scripts/gen-sounds.js
 * ==========================================================
 * 作用：用纯代码合成 4 个儿童友好的 WAV 音效，输出到 static/sounds/。
 *      不依赖任何第三方库，直接写出 16 位 PCM 单声道 WAV 文件。
 *      想换音效时，可直接用同名 wav 覆盖 static/sounds/ 下的文件。
 *
 * 4 个音效：
 *   click.wav   点击 —— 短促清脆的"哒"
 *   correct.wav 答对 —— 上行"叮咚"，欢快
 *   wrong.wav   答错 —— 柔和下行提示音，不刺耳、不吓孩子
 *   win.wav     胜利 —— 上行大三和弦琶音，像小号角
 */
const fs = require('fs')
const path = require('path')

const SAMPLE_RATE = 44100

// 把若干“音符”渲染成 PCM 采样数组
// notes: [{ freq, start, duration, gain }]（时间单位：秒）
function renderNotes(notes, totalDuration) {
	const total = Math.floor(SAMPLE_RATE * totalDuration)
	const buf = new Float32Array(total)

	notes.forEach(function (n) {
		const startIdx = Math.floor(n.start * SAMPLE_RATE)
		const len = Math.floor(n.duration * SAMPLE_RATE)
		const gain = n.gain === undefined ? 0.6 : n.gain
		for (let i = 0; i < len; i++) {
			const idx = startIdx + i
			if (idx >= total) break
			const t = i / SAMPLE_RATE
			// 简单的 ADSR 包络：快速起音 + 指数衰减，避免爆音
			const attack = Math.min(1, t / 0.005)
			const decay = Math.exp(-t * (n.decay === undefined ? 6 : n.decay))
			const env = attack * decay
			// 基波 + 少量二次谐波，让声音更饱满悦耳
			const wave =
				Math.sin(2 * Math.PI * n.freq * t) * 0.8 +
				Math.sin(2 * Math.PI * n.freq * 2 * t) * 0.2
			buf[idx] += wave * env * gain
		}
	})

	return buf
}

// 把 Float32 采样（范围约 -1~1）编码成 16 位 PCM WAV 的 Buffer
function encodeWav(samples) {
	const dataLength = samples.length * 2 // 16 位 = 2 字节
	const buffer = Buffer.alloc(44 + dataLength)

	// ---- WAV 文件头 ----
	buffer.write('RIFF', 0)
	buffer.writeUInt32LE(36 + dataLength, 4)
	buffer.write('WAVE', 8)
	buffer.write('fmt ', 12)
	buffer.writeUInt32LE(16, 16) // fmt 块长度
	buffer.writeUInt16LE(1, 20) // 音频格式：1 = PCM
	buffer.writeUInt16LE(1, 22) // 声道数：单声道
	buffer.writeUInt32LE(SAMPLE_RATE, 24)
	buffer.writeUInt32LE(SAMPLE_RATE * 2, 28) // 字节率
	buffer.writeUInt16LE(2, 32) // 块对齐
	buffer.writeUInt16LE(16, 34) // 位深
	buffer.write('data', 36)
	buffer.writeUInt32LE(dataLength, 40)

	// ---- PCM 数据（带软削波，防止溢出爆音）----
	let offset = 44
	for (let i = 0; i < samples.length; i++) {
		let s = samples[i]
		if (s > 1) s = 1
		if (s < -1) s = -1
		buffer.writeInt16LE(Math.round(s * 32767), offset)
		offset += 2
	}
	return buffer
}

// 各音效的合成配置
const sounds = {
	// 点击：一声短促清脆的高音
	click: {
		total: 0.09,
		notes: [{ freq: 1200, start: 0, duration: 0.09, gain: 0.5, decay: 30 }]
	},
	// 答对：上行两音"叮—咚"（E5 -> A5），欢快
	correct: {
		total: 0.4,
		notes: [
			{ freq: 659.25, start: 0, duration: 0.18, gain: 0.5, decay: 8 },
			{ freq: 880.0, start: 0.16, duration: 0.24, gain: 0.5, decay: 7 }
		]
	},
	// 答错：柔和的下行两音（A4 -> F4），低而温和，不吓孩子
	wrong: {
		total: 0.4,
		notes: [
			{ freq: 440.0, start: 0, duration: 0.2, gain: 0.4, decay: 6 },
			{ freq: 349.23, start: 0.18, duration: 0.22, gain: 0.4, decay: 6 }
		]
	},
	// 胜利：C5-E5-G5-C6 上行大三和弦琶音，像小号角
	win: {
		total: 0.85,
		notes: [
			{ freq: 523.25, start: 0.0, duration: 0.22, gain: 0.45, decay: 5 },
			{ freq: 659.25, start: 0.18, duration: 0.22, gain: 0.45, decay: 5 },
			{ freq: 783.99, start: 0.36, duration: 0.22, gain: 0.45, decay: 5 },
			{ freq: 1046.5, start: 0.54, duration: 0.31, gain: 0.5, decay: 4 }
		]
	}
}

// 输出目录
const outDir = path.join(__dirname, '..', 'static', 'sounds')
if (!fs.existsSync(outDir)) {
	fs.mkdirSync(outDir, { recursive: true })
}

Object.keys(sounds).forEach(function (name) {
	const cfg = sounds[name]
	const samples = renderNotes(cfg.notes, cfg.total)
	const wav = encodeWav(samples)
	const file = path.join(outDir, name + '.wav')
	fs.writeFileSync(file, wav)
	console.log('✅ 已生成：' + file + '（' + wav.length + ' 字节）')
})

console.log('\n🎵 4 个音效生成完毕！')
