/**
 * 题库校验脚本
 * 用法：在项目根目录执行  node scripts/validate.js
 * 校验内容：
 *   1. JSON 是否能正常解析
 *   2. 题目总数
 *   3. 每题字段完整性（id / grade / subject / difficulty / question / options / answer / explanation）
 *   4. options 必须是长度为 4 的数组
 *   5. answer 必须是 0~3 的整数
 *   6. id 是否唯一
 *   7. 统计各科目、各难度的题目数量
 */
const fs = require('fs')
const path = require('path')

// 需要校验的题库文件（后续扩年级只需往这里加）
const files = ['grade1.json', 'grade2.json', 'grade3.json', 'grade4.json', 'grade5.json', 'grade6.json', 'grade7.json', 'grade8.json', 'grade9.json']
const dataDir = path.join(__dirname, '..', 'data')

let hasError = false

files.forEach(function (file) {
  const filePath = path.join(dataDir, file)
  console.log('\n===== 校验文件：' + file + ' =====')

  let raw
  try {
    raw = fs.readFileSync(filePath, 'utf8')
  } catch (e) {
    console.error('❌ 无法读取文件：' + e.message)
    hasError = true
    return
  }

  let list
  try {
    list = JSON.parse(raw)
  } catch (e) {
    console.error('❌ JSON 解析失败：' + e.message)
    hasError = true
    return
  }

  if (!Array.isArray(list)) {
    console.error('❌ 顶层结构应为数组')
    hasError = true
    return
  }

  console.log('✅ JSON 解析成功，题目总数：' + list.length)

  const ids = {}
  const subjectCount = {}
  const difficultyCount = {}
  const required = ['id', 'grade', 'subject', 'difficulty', 'question', 'options', 'answer', 'explanation']

  list.forEach(function (q, index) {
    const where = '第 ' + (index + 1) + ' 题(' + (q && q.id ? q.id : '未知id') + ')'

    // 字段完整性
    required.forEach(function (key) {
      if (q[key] === undefined || q[key] === null) {
        console.error('❌ ' + where + ' 缺少字段：' + key)
        hasError = true
      }
    })

    // options 校验
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      console.error('❌ ' + where + ' 的 options 必须是长度为 4 的数组')
      hasError = true
    }

    // answer 校验
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
      console.error('❌ ' + where + ' 的 answer 必须是 0~3 的整数，当前为：' + q.answer)
      hasError = true
    }

    // id 唯一
    if (ids[q.id]) {
      console.error('❌ ' + where + ' 的 id 重复')
      hasError = true
    }
    ids[q.id] = true

    // 统计
    subjectCount[q.subject] = (subjectCount[q.subject] || 0) + 1
    difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1
  })

  console.log('\n各科目题目数量：')
  Object.keys(subjectCount).forEach(function (s) {
    console.log('  ' + s + '：' + subjectCount[s] + ' 题')
  })

  console.log('\n各难度题目数量：')
  Object.keys(difficultyCount).forEach(function (d) {
    console.log('  ' + d + '：' + difficultyCount[d] + ' 题')
  })
})

console.log('\n===============================')
if (hasError) {
  console.error('校验结束：发现问题，请根据上面的 ❌ 修正！')
  process.exit(1)
} else {
  console.log('🎉 校验通过：题库全部合法！')
}
