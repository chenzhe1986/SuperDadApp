/**
 * utils/storage.js —— 本地存储模块
 * ==========================================================
 * 职责：统一管理APP的所有本地数据（错题本、最高分、音效开关）
 * 说明：uni.setStorageSync / getStorageSync 是 uni-app 提供的
 *       本地持久化存储，APP卸载前数据一直都在，无需联网。
 */

// 存储用到的 key 统一定义在这里，避免写错字符串
const KEY_WRONG_BOOK = 'sk_wrong_book'   // 错题本
const KEY_BEST_SCORE = 'sk_best_score'   // 各年级最高分
const KEY_SOUND_ON = 'sk_sound_on'       // 音效开关
const KEY_PLAY_COUNT = 'sk_play_count'   // 累计闯关次数

/* ==================== 错题本 ==================== */
/**
 * 错题本数据结构（数组，每个元素是一条错题记录）：
 * {
 *   id: 'g4-0001',        // 题目id（用于去重和"重练"时还原题目）
 *   grade: 4,             // 年级
 *   subject: '地理',
 *   difficulty: '中等',
 *   question: '题干...',
 *   options: [...],       // 原始选项顺序
 *   answer: 0,            // 正确答案下标（对应原始选项顺序）
 *   explanation: '解析...',
 *   wrongCount: 2,        // 累计答错次数
 *   time: 1710000000000   // 最近一次答错的时间戳
 * }
 */

/** 读取整个错题本（按最近答错时间倒序） */
export function getWrongBook() {
	const list = uni.getStorageSync(KEY_WRONG_BOOK) || []
	return list.sort((a, b) => b.time - a.time)
}

/**
 * 添加一条错题（同一道题重复答错时只累加 wrongCount，不重复添加）
 * @param {Object} q 原始题目对象（注意传题库里的原题，不要传选项被打乱后的题）
 */
export function addWrong(q) {
	const list = uni.getStorageSync(KEY_WRONG_BOOK) || []
	const exist = list.find(item => item.id === q.id)
	if (exist) {
		exist.wrongCount += 1
		exist.time = Date.now()
	} else {
		list.push({
			id: q.id,
			grade: q.grade,
			subject: q.subject,
			difficulty: q.difficulty,
			question: q.question,
			options: q.options,
			answer: q.answer,
			explanation: q.explanation,
			wrongCount: 1,
			time: Date.now()
		})
	}
	uni.setStorageSync(KEY_WRONG_BOOK, list)
}

/** 从错题本移除一道题（孩子已掌握时点"已掌握"按钮） */
export function removeWrong(id) {
	let list = uni.getStorageSync(KEY_WRONG_BOOK) || []
	list = list.filter(item => item.id !== id)
	uni.setStorageSync(KEY_WRONG_BOOK, list)
}

/** 清空错题本 */
export function clearWrongBook() {
	uni.setStorageSync(KEY_WRONG_BOOK, [])
}

/* ==================== 最高分 ==================== */
/** 读取某年级的历史最高分（没有记录返回 0） */
export function getBestScore(grade) {
	const map = uni.getStorageSync(KEY_BEST_SCORE) || {}
	return map[grade] || 0
}

/**
 * 尝试更新最高分：只有打破纪录才会保存
 * @returns {Boolean} true 表示破纪录了（页面上可以放庆祝动画）
 */
export function updateBestScore(grade, score) {
	const map = uni.getStorageSync(KEY_BEST_SCORE) || {}
	if (score > (map[grade] || 0)) {
		map[grade] = score
		uni.setStorageSync(KEY_BEST_SCORE, map)
		return true
	}
	return false
}

/* ==================== 音效开关 ==================== */
/** 音效是否开启（默认开启） */
export function isSoundOn() {
	const v = uni.getStorageSync(KEY_SOUND_ON)
	return v === '' ? true : !!v // 从未设置过时返回 true
}

/** 设置音效开关 */
export function setSoundOn(on) {
	uni.setStorageSync(KEY_SOUND_ON, !!on)
}

/* ==================== 闯关次数 ==================== */
/** 累计闯关次数 +1，并返回最新值 */
export function addPlayCount() {
	const n = (uni.getStorageSync(KEY_PLAY_COUNT) || 0) + 1
	uni.setStorageSync(KEY_PLAY_COUNT, n)
	return n
}

/** 读取累计闯关次数 */
export function getPlayCount() {
	return uni.getStorageSync(KEY_PLAY_COUNT) || 0
}
