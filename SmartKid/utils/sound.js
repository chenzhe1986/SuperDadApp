/**
 * utils/sound.js —— 音效播放模块
 * ==========================================================
 * 职责：统一播放APP里的各种反馈音效
 * 音效文件放在 static/sounds/ 目录下，想换音效直接替换同名文件即可
 *
 * 4 种音效：
 *   click   —— 点击按钮时的"哒"声
 *   correct —— 答对时的欢快"叮咚"声
 *   wrong   —— 答错时的低沉提示声（柔和，不吓孩子）
 *   win     —— 闯关结束的胜利号角
 */
import { isSoundOn } from './storage.js'

// 音效名 -> 文件路径 的映射
const SOUND_FILES = {
	click: '/static/sounds/click.wav',
	correct: '/static/sounds/correct.wav',
	wrong: '/static/sounds/wrong.wav',
	win: '/static/sounds/win.wav'
}

/**
 * 播放指定音效
 * 每次都新建一个音频实例、播完自动销毁，
 * 这样快速连续点击时音效可以重叠播放，不会互相打断。
 * @param {String} name 音效名：click / correct / wrong / win
 */
export function playSound(name) {
	// 用户关闭了音效开关时，什么也不做
	if (!isSoundOn()) return
	const src = SOUND_FILES[name]
	if (!src) return

	try {
		const audio = uni.createInnerAudioContext()
		audio.src = src
		audio.volume = 0.6 // 音量 60%，保护儿童听力
		audio.play()
		// 播放完毕 / 出错时销毁实例，释放内存
		audio.onEnded(() => audio.destroy())
		audio.onError(() => audio.destroy())
	} catch (e) {
		// 极少数机型音频接口异常，静默忽略，不影响答题
		console.warn('音效播放失败：', e)
	}
}

/** 快捷方法：点击音 */
export function playClick() {
	playSound('click')
}

/** 快捷方法：答对音 */
export function playCorrect() {
	playSound('correct')
}

/** 快捷方法：答错音 */
export function playWrong() {
	playSound('wrong')
}

/** 快捷方法：胜利音 */
export function playWin() {
	playSound('win')
}
