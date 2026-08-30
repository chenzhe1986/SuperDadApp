/**
 * utils/questionBank.js —— 题库服务模块
 * ==========================================================
 * 职责：
 *   1. 统一管理所有年级的题库（后续扩充新年级只改这一个文件）
 *   2. 提供"闯关抽题"算法：随机抽 20 题，科目和难度分布尽量合理
 *   3. 每次抽题时打乱选项顺序，防止孩子背"答案位置"
 *
 * 【如何扩充新年级题库？只需 3 步】
 *   第 1 步：在 data 目录新建 JSON 文件，如 data/grade5.json（格式照抄 grade4.json）
 *   第 2 步：在下方 import 一行：import grade5 from '../data/grade5.json'
 *   第 3 步：在 BANKS 中加一行：5: grade5，并把 GRADES 里五年级的 enabled 改为 true
 */

// 各年级题库；新年级在这里继续 import
import grade1 from '../data/grade1.json'
import grade2 from '../data/grade2.json'
import grade3 from '../data/grade3.json'
import grade4 from '../data/grade4.json'
import grade5 from '../data/grade5.json'
import grade6 from '../data/grade6.json'
import grade7 from '../data/grade7.json'
import grade8 from '../data/grade8.json'
import grade9 from '../data/grade9.json'

// 年级编号 -> 题库数据 的映射表
const BANKS = {
	1: grade1,
	2: grade2,
	3: grade3,
	4: grade4,
	5: grade5,
	6: grade6,
	7: grade7,
	8: grade8,
	9: grade9
}

/**
 * 首页展示用的年级列表
 * enabled 为 false 的年级会显示"敬请期待"，不能点击
 */
export const GRADES = [
	{ value: 1, label: '一年级', icon: '🌱', enabled: true },
	{ value: 2, label: '二年级', icon: '🌿', enabled: true },
	{ value: 3, label: '三年级', icon: '🍀', enabled: true },
	{ value: 4, label: '四年级', icon: '🌳', enabled: true },
	{ value: 5, label: '五年级', icon: '🌲', enabled: true },
	{ value: 6, label: '六年级', icon: '🎓', enabled: true },
	{ value: 7, label: '初一', icon: '📗', enabled: true },
	{ value: 8, label: '初二', icon: '📘', enabled: true },
	{ value: 9, label: '初三', icon: '📙', enabled: true }
]

/**
 * 学科信息表：颜色和图标与 uni.scss 中的学科色一一对应
 * 题库里出现新学科时，在这里补充即可
 */
export const SUBJECTS = {
	'语文': { color: '#FF8FAB', icon: '📖' },
	'数学': { color: '#5C9DFF', icon: '🔢' },
	'英语': { color: '#B58CFF', icon: '🔤' },
	'科学': { color: '#52C4A0', icon: '🔬' },
	'历史': { color: '#D2A06E', icon: '🏯' },
	'地理': { color: '#4FC3D9', icon: '🌍' },
	'安全': { color: '#FF9F5A', icon: '🛡️' },
	'综合': { color: '#F49AC2', icon: '💡' }
}

/** 获取学科的颜色（找不到时给默认灰色） */
export function subjectColor(subject) {
	return (SUBJECTS[subject] || {}).color || '#9B9BB4'
}

/** 获取学科的小图标 */
export function subjectIcon(subject) {
	return (SUBJECTS[subject] || {}).icon || '⭐'
}

/**
 * 获取某年级的完整题库（原始数据）
 * @param {Number} grade 年级数字，如 4
 * @returns {Array} 题目数组，题库不存在时返回空数组
 */
export function getBank(grade) {
	return BANKS[grade] || []
}

/** 判断某年级题库是否已经上线 */
export function hasBank(grade) {
	return !!BANKS[grade] && BANKS[grade].length > 0
}

/**
 * 洗牌算法（Fisher-Yates）：把数组随机打乱
 * 注意：会返回新数组，不修改原数组
 */
function shuffle(arr) {
	const a = arr.slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

/**
 * 把一道题的 4 个选项随机打乱，并同步修正正确答案的下标
 * 这样孩子每次遇到同一道题，答案位置都不一样，防止死记位置
 */
function shuffleOptions(question) {
	// 把每个选项和"它是否是正确答案"绑在一起再洗牌
	const bundled = question.options.map((text, idx) => ({
		text,
		isAnswer: idx === question.answer
	}))
	const mixed = shuffle(bundled)
	return {
		...question,
		options: mixed.map(o => o.text),
		answer: mixed.findIndex(o => o.isAnswer) // 洗牌后重新定位正确答案
	}
}

/**
 * 人文社科类学科（语文、历史、地理、综合）
 * —— 闯关时优先把这几类题目放到最前面
 */
export const HUMANITIES = ['语文', '历史', '地理', '综合']

/**
 * 【核心算法】闯关抽题
 * 从指定年级题库中随机抽取 count 道题，规则：
 *   1. 各科目数量大致相等：名额在各科之间轮流分配（而非按题库占比）
 *   2. 难度搭配：每科内部尽量涵盖简单/中等/困难
 *   3. 题目顺序：前 5 题优先选人文社科类（且先易后难），其余题目随机排序
 *   4. 每题选项顺序随机打乱，防止孩子背“答案位置”
 *
 * @param {Number} grade 年级
 * @param {Number} count 抽题数量，默认 25
 * @returns {Array} 处理好的题目数组
 */
export function pickQuizSet(grade, count = 25) {
	const bank = getBank(grade)
	if (bank.length === 0) return []
	// 题库不足 count 题时，全部拿出打乱返回
	if (bank.length <= count) return shuffle(bank).map(shuffleOptions)

	// ---- 第一步：按科目分组 ----
	const bySubject = {}
	bank.forEach(q => {
		if (!bySubject[q.subject]) bySubject[q.subject] = []
		bySubject[q.subject].push(q)
	})
	const subjectNames = Object.keys(bySubject)

	// ---- 第二步：名额在各科间轮流分配，使各科数量大致相等 ----
	const quota = {}
	subjectNames.forEach(n => { quota[n] = 0 })
	let assigned = 0
	const order = shuffle(subjectNames)
	let guard = 0
	while (assigned < count && guard < count * 20) {
		guard++
		for (const name of order) {
			if (assigned >= count) break
			if (quota[name] < bySubject[name].length) {
				quota[name]++
				assigned++
			}
		}
	}

	// ---- 第三步：每个科目内部按“难度配比”抽题（简单 40% / 中等 40% / 困难 20%） ----
	const picked = []
	subjectNames.forEach(name => {
		const pool = bySubject[name]
		const need = quota[name]
		if (need <= 0) return
		const easy = shuffle(pool.filter(q => q.difficulty === '简单'))
		const mid = shuffle(pool.filter(q => q.difficulty === '中等'))
		const hard = shuffle(pool.filter(q => q.difficulty === '困难'))
		const wantEasy = Math.round(need * 0.4)
		const wantMid = Math.round(need * 0.4)

		const chosen = []
		chosen.push(...easy.slice(0, wantEasy))
		chosen.push(...mid.slice(0, wantMid))
		chosen.push(...hard.slice(0, need - chosen.length))
		// 某个难度题目不够时，从整个科目池子里补齐
		if (chosen.length < need) {
			const usedIds = new Set(chosen.map(q => q.id))
			const rest = shuffle(pool.filter(q => !usedIds.has(q.id)))
			chosen.push(...rest.slice(0, need - chosen.length))
		}
		picked.push(...chosen.slice(0, need))
	})

	// ---- 第四步：前 5 题优先人文社科（先易后难），其余题目随机排序 ----
	const rank = { '简单': 0, '中等': 1, '困难': 2 }
	const isHum = q => HUMANITIES.indexOf(q.subject) !== -1
	const hums = shuffle(picked.filter(isHum))
	const nonHums = picked.filter(q => !isHum(q))
	// 领头的人文社科题按难度升序，让开局更平缓
	const leadCount = Math.min(5, hums.length)
	const lead = hums.slice(0, leadCount)
		.sort((a, b) => (rank[a.difficulty] || 0) - (rank[b.difficulty] || 0))
	// 剩余（剩下的人文社科 + 其他科目）整体随机打乱
	const rest = shuffle(hums.slice(leadCount).concat(nonHums))
	return lead.concat(rest).map(shuffleOptions)
}

/**
 * 根据题目 id 列表还原题目（错题重练时使用）
 * @param {Number} grade 年级
 * @param {Array} ids 题目 id 数组
 */
export function getQuestionsByIds(grade, ids) {
	const bank = getBank(grade)
	const idSet = new Set(ids)
	return bank.filter(q => idSet.has(q.id))
}
