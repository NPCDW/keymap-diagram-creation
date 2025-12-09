<template>
  <div id="app">
    <el-container class="main-container">
      <el-header>
        <h1>键盘快捷键示意图制作工具</h1>
      </el-header>
      <el-main>
        <el-card shadow="never" class="keyboard-card">
          <div style="text-align: center; margin-bottom: 20px;">
            <el-button type="primary" @click="startAddShortcut" :disabled="isRecording">
              <el-icon><Plus /></el-icon>
              添加键盘快捷键
            </el-button>
            <el-button type="success" @click="exportImage" :disabled="shortcuts.length === 0">
              <el-icon><Download /></el-icon>
              导出图片
            </el-button>
          </div>

          <!-- 键盘示意图 -->
          <div ref="keyboardRef" id="keyboard-container" class="keyboard-wrapper">
            <!-- 操作提示卡片（不使用弹窗） -->
            <transition name="slide-fade">
              <div v-if="isRecording" class="recording-tips">
                <div v-if="recordStep === 1" class="tips-content">
                  <div class="tips-title">
                    <el-icon class="recording-icon"><VideoCamera /></el-icon>
                    正在录制快捷键
                  </div>
                  <div class="tips-keys">
                    <el-tag v-for="key in pressedKeys" :key="key" size="large" type="success" effect="dark">
                      {{ getKeyLabel(key) }}
                    </el-tag>
                    <span v-if="pressedKeys.length === 0" class="waiting-text">等待输入...</span>
                  </div>
                  <div class="tips-actions">
                    <el-button size="small" type="primary" @click="finishRecording" :disabled="pressedKeys.length === 0">
                      下一步
                    </el-button>
                    <el-button size="small" @click="cancelRecord">取消</el-button>
                  </div>
                </div>
                <div v-if="recordStep === 2" class="tips-content">
                  <div class="tips-title">输入快捷键描述</div>
                  <div class="tips-keys">
                    <el-tag v-for="key in pressedKeys" :key="key" size="small" type="info">
                      {{ getKeyLabel(key) }}
                    </el-tag>
                  </div>
                  <el-input 
                    v-model="currentDescription" 
                    placeholder="请输入描述"
                    size="small"
                    style="margin: 10px 0;"
                    @keyup.enter="confirmAdd"
                  />
                  <div class="tips-actions">
                    <el-button size="small" type="success" @click="confirmAdd" :disabled="!currentDescription">
                      确认添加
                    </el-button>
                    <el-button size="small" @click="cancelRecord">取消</el-button>
                  </div>
                </div>
              </div>
            </transition>

            <div class="keyboard-87">
              <div v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex" class="keyboard-row">
                <button 
                  v-for="key in row" 
                  :key="key.code"
                  :id="`key-${key.code}`"
                  :class="['key', key.width, key.gap, { 
                    'active': isRecording && pressedKeys.includes(key.code),
                    'has-shortcut': hasShortcut(key.code)
                  }]"
                  @click="handleKeyClick(key.code)"
                >
                  <span class="key-label">{{ key.label }}</span>
                  <!-- 单键快捷键描述 -->
                  <span v-if="getSingleKeyDescription(key.code)" class="single-key-desc">
                    {{ getSingleKeyDescription(key.code) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- 组合键气泡标注 - 使用Teleport定位到按键上 -->
            <template v-for="shortcut in comboShortcuts" :key="shortcut.id">
              <div 
                :ref="el => setBubbleRef(el, shortcut)"
                class="shortcut-bubble"
              >
                <div class="bubble-container">
                  <div class="bubble-modifiers">
                    <span v-for="mod in shortcut.modifiers" :key="mod" 
                          :class="['modifier-tag', `modifier-${mod.toLowerCase()}`]">
                      {{ mod }}
                    </span>
                  </div>
                  <div class="bubble-desc">{{ shortcut.description }}</div>
                </div>
                <div class="bubble-arrow"></div>
              </div>
            </template>
          </div>
        </el-card>

        <!-- 快捷键表格 -->
        <el-card shadow="never" ref="tableRef" id="table-container" class="table-card">
          <template #header>
            <div class="card-header">
              <span>快捷键列表</span>
            </div>
          </template>
          <el-table :data="shortcuts" border row-key="id">
            <el-table-column type="index" label="序号" width="80" align="center" />
            <el-table-column prop="keys" label="快捷键" width="250" align="center" sortable>
              <template #default="{ row }">
                <el-tag v-for="key in row.displayKeys" :key="key" style="margin: 2px;" type="info">
                  {{ key }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" align="center" sortable>
              <template #default="{ row }">
                <el-input v-if="row.editing" v-model="row.tempDescription" size="small" />
                <span v-else>{{ row.description }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" align="center" fixed="right">
              <template #default="{ row, $index }">
                <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                  <el-button v-if="!row.editing" type="primary" size="small" @click="startEdit(row)">
                    编辑
                  </el-button>
                  <el-button v-if="row.editing" type="success" size="small" @click="saveEdit(row)">
                    保存
                  </el-button>
                  <el-button v-if="row.editing" type="info" size="small" @click="cancelEdit(row)">
                    取消
                  </el-button>
                  <el-button v-if="!row.editing" type="danger" size="small" @click="deleteShortcut(row)">
                    删除
                  </el-button>
                  <el-button v-if="!row.editing && $index > 0" type="info" size="small" @click="moveUp($index)" :icon="'ArrowUp'">
                    上移
                  </el-button>
                  <el-button v-if="!row.editing && $index < shortcuts.length - 1" type="info" size="small" @click="moveDown($index)" :icon="'ArrowDown'">
                    下移
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Download, VideoCamera } from '@element-plus/icons-vue'
import html2canvas from 'html2canvas'

// 87键键盘布局（按照图片布局，精确对齐）
const keyboardLayout = ref([
  // 第一行 - 功能键区（Esc单独，然后4组功能键，最后3个独立键）
  [
    { code: 'Escape', label: 'Esc', width: 'w1', offset: 0, gap: 'esc-gap' },
    { code: 'F1', label: 'F1', width: 'w1', offset: 70 },
    { code: 'F2', label: 'F2', width: 'w1', offset: 0 },
    { code: 'F3', label: 'F3', width: 'w1', offset: 0 },
    { code: 'F4', label: 'F4', width: 'w1', offset: 0, gap: 'gap-after' },
    { code: 'F5', label: 'F5', width: 'w1', offset: 0 },
    { code: 'F6', label: 'F6', width: 'w1', offset: 0 },
    { code: 'F7', label: 'F7', width: 'w1', offset: 0 },
    { code: 'F8', label: 'F8', width: 'w1', offset: 0, gap: 'gap-after' },
    { code: 'F9', label: 'F9', width: 'w1', offset: 0 },
    { code: 'F10', label: 'F10', width: 'w1', offset: 0 },
    { code: 'F11', label: 'F11', width: 'w1', offset: 0 },
    { code: 'F12', label: 'F12', width: 'w1', offset: 0, gap: 'gap-after' },
    { code: 'PrintScreen', label: 'PrtSc', width: 'w1', offset: 0 },
    { code: 'ScrollLock', label: 'Scroll Lock', width: 'w1', offset: 0 },
    { code: 'Pause', label: 'Pause Break', width: 'w1', offset: 0 }
  ],
  // 第二行 - 数字键区
  [
    { code: 'Backquote', label: '`\n~', width: 'w1', offset: 0 },
    { code: 'Digit1', label: '1\n!', width: 'w1', offset: 0 },
    { code: 'Digit2', label: '2\n@', width: 'w1', offset: 0 },
    { code: 'Digit3', label: '3\n#', width: 'w1', offset: 0 },
    { code: 'Digit4', label: '4\n$', width: 'w1', offset: 0 },
    { code: 'Digit5', label: '5\n%', width: 'w1', offset: 0 },
    { code: 'Digit6', label: '6\n^', width: 'w1', offset: 0 },
    { code: 'Digit7', label: '7\n&', width: 'w1', offset: 0 },
    { code: 'Digit8', label: '8\n*', width: 'w1', offset: 0 },
    { code: 'Digit9', label: '9\n(', width: 'w1', offset: 0 },
    { code: 'Digit0', label: '0\n)', width: 'w1', offset: 0 },
    { code: 'Minus', label: '-\n_', width: 'w1', offset: 0 },
    { code: 'Equal', label: '=\n+', width: 'w1', offset: 0 },
    { code: 'Backspace', label: 'Backspace', width: 'w2', offset: 0, gap: 'gap-after' },
    { code: 'Insert', label: 'Insert', width: 'w1', offset: 0 },
    { code: 'Home', label: 'Home', width: 'w1', offset: 0 },
    { code: 'PageUp', label: 'PgUp', width: 'w1', offset: 0 }
  ],
  // 第三行 - QWERTY 第一排
  [
    { code: 'Tab', label: 'Tab', width: 'w1-5', offset: 0 },
    { code: 'KeyQ', label: 'Q', width: 'w1', offset: 0 },
    { code: 'KeyW', label: 'W', width: 'w1', offset: 0 },
    { code: 'KeyE', label: 'E', width: 'w1', offset: 0 },
    { code: 'KeyR', label: 'R', width: 'w1', offset: 0 },
    { code: 'KeyT', label: 'T', width: 'w1', offset: 0 },
    { code: 'KeyY', label: 'Y', width: 'w1', offset: 0 },
    { code: 'KeyU', label: 'U', width: 'w1', offset: 0 },
    { code: 'KeyI', label: 'I', width: 'w1', offset: 0 },
    { code: 'KeyO', label: 'O', width: 'w1', offset: 0 },
    { code: 'KeyP', label: 'P', width: 'w1', offset: 0 },
    { code: 'BracketLeft', label: '[\n{', width: 'w1', offset: 0 },
    { code: 'BracketRight', label: ']\n}', width: 'w1', offset: 0 },
    { code: 'Backslash', label: '\\\n|', width: 'w1-5', offset: 0, gap: 'gap-after' },
    { code: 'Delete', label: 'Delete', width: 'w1', offset: 0 },
    { code: 'End', label: 'End', width: 'w1', offset: 0 },
    { code: 'PageDown', label: 'PgDn', width: 'w1', offset: 0 }
  ],
  // 第四行 - ASDF 行
  [
    { code: 'CapsLock', label: 'Caps Lock', width: 'w1-75', offset: 0 },
    { code: 'KeyA', label: 'A', width: 'w1', offset: 0 },
    { code: 'KeyS', label: 'S', width: 'w1', offset: 0 },
    { code: 'KeyD', label: 'D', width: 'w1', offset: 0 },
    { code: 'KeyF', label: 'F', width: 'w1', offset: 0 },
    { code: 'KeyG', label: 'G', width: 'w1', offset: 0 },
    { code: 'KeyH', label: 'H', width: 'w1', offset: 0 },
    { code: 'KeyJ', label: 'J', width: 'w1', offset: 0 },
    { code: 'KeyK', label: 'K', width: 'w1', offset: 0 },
    { code: 'KeyL', label: 'L', width: 'w1', offset: 0 },
    { code: 'Semicolon', label: ';\n:', width: 'w1', offset: 0 },
    { code: 'Quote', label: "'\n\"", width: 'w1', offset: 0 },
    { code: 'Enter', label: 'Enter', width: 'w2-25', offset: 0 }
  ],
  // 第五行 - ZXCV 行
  [
    { code: 'ShiftLeft', label: 'Shift', width: 'w2-25s', offset: 0 },
    { code: 'KeyZ', label: 'Z', width: 'w1', offset: 0 },
    { code: 'KeyX', label: 'X', width: 'w1', offset: 0 },
    { code: 'KeyC', label: 'C', width: 'w1', offset: 0 },
    { code: 'KeyV', label: 'V', width: 'w1', offset: 0 },
    { code: 'KeyB', label: 'B', width: 'w1', offset: 0 },
    { code: 'KeyN', label: 'N', width: 'w1', offset: 0 },
    { code: 'KeyM', label: 'M', width: 'w1', offset: 0 },
    { code: 'Comma', label: ',\n<', width: 'w1', offset: 0 },
    { code: 'Period', label: '.\n>', width: 'w1', offset: 0 },
    { code: 'Slash', label: '/\n?', width: 'w1', offset: 0 },
    { code: 'ShiftRight', label: 'Shift', width: 'w2-75', offset: 0, gap: 'esc-gap-after' },
    { code: 'ArrowUp', label: '↑', width: 'w1', offset: 0 }
  ],
  // 第六行 - 底部控制键
  [
    { code: 'ControlLeft', label: 'Ctrl', width: 'w1-25', offset: 0 },
    { code: 'MetaLeft', label: 'Win', width: 'w1-25', offset: 0 },
    { code: 'AltLeft', label: 'Alt', width: 'w1-25', offset: 0 },
    { code: 'Space', label: '', width: 'w6-25', offset: 0 },
    { code: 'AltRight', label: 'Alt', width: 'w1-25', offset: 0 },
    { code: 'MetaRight', label: 'Win', width: 'w1-25', offset: 0 },
    { code: 'ContextMenu', label: 'Menu', width: 'w1-25', offset: 0 },
    { code: 'ControlRight', label: 'Ctrl', width: 'w1-25', offset: 0, gap: 'gap-after' },
    { code: 'ArrowLeft', label: '←', width: 'w1', offset: 0 },
    { code: 'ArrowDown', label: '↓', width: 'w1', offset: 0 },
    { code: 'ArrowRight', label: '→', width: 'w1', offset: 0 }
  ]
])

// 修饰键映射和优先级
const modifierKeys = {
  'ControlLeft': 'Ctrl',
  'ControlRight': 'Ctrl',
  'ShiftLeft': 'Shift',
  'ShiftRight': 'Shift',
  'AltLeft': 'Alt',
  'AltRight': 'Alt',
  'MetaLeft': 'Win',
  'MetaRight': 'Win'
}

// 修饰键优先级顺序
const modifierOrder = ['Ctrl', 'Shift', 'Alt', 'Win']

// 排序修饰键
const sortModifiers = (modifiers) => {
  return modifiers.sort((a, b) => {
    return modifierOrder.indexOf(a) - modifierOrder.indexOf(b)
  })
}

// 标准化快捷键顺序（修饰键在前，主键在后）
const normalizeKeys = (keys) => {
  const modKeys = keys.filter(k => modifierKeys[k])
  const mainKeys = keys.filter(k => !modifierKeys[k])
  
  // 修饰键去重并按优先级排序
  const uniqueModKeys = [...new Set(modKeys.map(k => modifierKeys[k]))]
  const sortedModKeys = sortModifiers(uniqueModKeys)
  
  // 返回排序后的code数组
  const result = []
  
  // 添加修饰键code
  sortedModKeys.forEach(modName => {
    const modKey = keys.find(k => modifierKeys[k] === modName)
    if (modKey) result.push(modKey)
  })
  
  // 添加主键（只取第一个）
  if (mainKeys.length > 0) {
    result.push(mainKeys[0])
  }
  
  return result
}

// 状态
const shortcuts = ref([])
const isRecording = ref(false)
const recordStep = ref(1) // 1: 记录按键, 2: 输入描述
const pressedKeys = ref([])
const currentDescription = ref('')
const keyboardRef = ref(null)
const tableRef = ref(null)

// 获取按键标签
const getKeyLabel = (code) => {
  for (const row of keyboardLayout.value) {
    const key = row.find(k => k.code === code)
    if (key) return key.label
  }
  return code
}

// 判断是否有快捷键
const hasShortcut = (code) => {
  return shortcuts.value.some(s => s.keys.includes(code))
}

// 获取单键快捷键描述（只针对非修饰键的单键）
const getSingleKeyDescription = (code) => {
  const shortcut = shortcuts.value.find(s => {
    // 只有一个键且不是修饰键
    const mainKeys = s.keys.filter(k => !modifierKeys[k])
    return mainKeys.length === 1 && mainKeys[0] === code && s.keys.length === mainKeys.length
  })
  return shortcut ? shortcut.description : ''
}

// 组合键快捷键（用于显示气泡）- 有修饰键或多个键的情况
const comboShortcuts = computed(() => {
  return shortcuts.value.filter(s => {
    const mainKeys = s.keys.filter(k => !modifierKeys[k])
    // 如果有修饰键，或主键多于1个，则显示气泡
    return s.keys.length > mainKeys.length || mainKeys.length > 1
  })
})

// 设置气泡位置（基于按键DOM元素ID）
const setBubbleRef = (el, shortcut) => {
  if (!el) return
  
  nextTick(() => {
    // 找到主按键（非修饰键）
    const mainKeys = shortcut.keys.filter(k => !modifierKeys[k])
    const mainKey = mainKeys[0]
    if (!mainKey) return
    
    // 通过ID找到按键元素
    const keyElement = document.getElementById(`key-${mainKey}`)
    if (!keyElement) return
    
    // 获取按键位置
    const keyRect = keyElement.getBoundingClientRect()
    const containerRect = keyboardRef.value.getBoundingClientRect()
    
    // 计算相对于键盘容器的位置
    const left = keyRect.left - containerRect.left + keyRect.width / 2
    const top = keyRect.top - containerRect.top
    
    // 设置气泡位置（在按键正上方）
    el.style.position = 'absolute'
    el.style.left = `${left}px`
    el.style.top = `${top - 10}px`  // 按键上方10px
    el.style.transform = 'translate(-50%, -100%)'
    el.style.zIndex = '10'
  })
}

// 监听shortcuts变化，重新定位气泡
watch(shortcuts, () => {
  nextTick(() => {
    // 延迟一帧确保DOM更新完成
    setTimeout(() => {
      const bubbles = document.querySelectorAll('.shortcut-bubble')
      comboShortcuts.value.forEach((shortcut, index) => {
        if (bubbles[index]) {
          setBubbleRef(bubbles[index], shortcut)
        }
      })
    }, 50)
  })
}, { deep: true })

// 获取按键宽度（放大1.4倍）
const getKeyWidth = (widthClass) => {
  const widthMap = {
    'w1': 70,        // 50 * 1.4
    'w1-25': 92,     // 62 * 1.4
    'w1-5': 108,     // 75 * 1.4
    'w1-75': 130,    // 87 * 1.4
    'w2': 147,       // 100 * 1.4
    'w2-25': 163,    // 112 * 1.4
    'w2-25s': 168,    // 112 * 1.4
    'w2-75': 202,    // 137 * 1.4
    'w6-25': 455     // 312 * 1.4
  }
  return widthMap[widthClass] || 70
}

// 开始添加快捷键
const startAddShortcut = () => {
  isRecording.value = true
  recordStep.value = 1
  pressedKeys.value = []
  currentDescription.value = ''
}

// 取消录制
const cancelRecord = () => {
  isRecording.value = false
  pressedKeys.value = []
  currentDescription.value = ''
  recordStep.value = 1
}

// 完成按键录制
const finishRecording = () => {
  if (pressedKeys.value.length === 0) {
    ElMessage.warning('请至少输入一个按键')
    return
  }
  
  // 检查是否只有修饰键
  const mainKeys = pressedKeys.value.filter(k => !modifierKeys[k])
  if (mainKeys.length === 0) {
    ElMessage.warning('请至少选择一个非修饰键（字母、数字或符号键）')
    return
  }
  
  // 标准化按键顺序
  pressedKeys.value = normalizeKeys(pressedKeys.value)
  
  recordStep.value = 2
}

// 确认添加
const confirmAdd = () => {
  if (!currentDescription.value.trim()) {
    ElMessage.warning('请输入快捷键描述')
    return
  }
  
  // 标准化按键顺序
  const normalizedKeys = normalizeKeys(pressedKeys.value)
  
  // 检查是否已存在相同快捷键
  const keysStr = normalizedKeys.join('+')
  const exists = shortcuts.value.find(s => s.keys.join('+') === keysStr)
  if (exists) {
    ElMessage.warning('该快捷键已存在')
    return
  }
  
  // 提取并排序修饰键
  const modifiers = normalizedKeys
    .filter(k => modifierKeys[k])
    .map(k => modifierKeys[k])
    .filter((v, i, a) => a.indexOf(v) === i) // 去重
  
  const sortedModifiers = sortModifiers(modifiers)
  
  // 添加快捷键
  shortcuts.value.push({
    id: Date.now(),
    keys: normalizedKeys,
    displayKeys: normalizedKeys.map(k => getKeyLabel(k)),
    modifiers: sortedModifiers,
    description: currentDescription.value,
    editing: false
  })
  
  ElMessage.success('快捷键添加成功')
  cancelRecord()
}

// 处理键盘点击
const handleKeyClick = (code) => {
  if (!isRecording.value) return
  
  if (pressedKeys.value.includes(code)) {
    pressedKeys.value = pressedKeys.value.filter(k => k !== code)
  } else {
    // 检查是否已有非修饰键
    const mainKeys = pressedKeys.value.filter(k => !modifierKeys[k])
    if (mainKeys.length > 0 && !modifierKeys[code]) {
      ElMessage.warning('只能选择一个字母、数字或符号键')
      return
    }
    pressedKeys.value.push(code)
  }
}

// 处理键盘按下事件
const handleKeyDown = (e) => {
  if (!isRecording.value || recordStep.value !== 1) return
  
  e.preventDefault()
  e.stopPropagation()
  
  if (!pressedKeys.value.includes(e.code)) {
    // 检查是否已有非修饰键
    const mainKeys = pressedKeys.value.filter(k => !modifierKeys[k])
    if (mainKeys.length > 0 && !modifierKeys[e.code]) {
      ElMessage.warning('只能选择一个字母、数字或符号键')
      return
    }
    pressedKeys.value.push(e.code)
  }
}

// 开始编辑
const startEdit = (row) => {
  row.editing = true
  row.tempDescription = row.description
}

// 保存编辑
const saveEdit = (row) => {
  if (!row.tempDescription.trim()) {
    ElMessage.warning('描述不能为空')
    return
  }
  row.description = row.tempDescription
  row.editing = false
  ElMessage.success('修改成功')
}

// 取消编辑
const cancelEdit = (row) => {
  row.editing = false
  delete row.tempDescription
}

// 删除快捷键
const deleteShortcut = (row) => {
  shortcuts.value = shortcuts.value.filter(s => s.id !== row.id)
  ElMessage.success('删除成功')
}

// 上移快捷键
const moveUp = (index) => {
  if (index > 0) {
    const temp = shortcuts.value[index]
    shortcuts.value[index] = shortcuts.value[index - 1]
    shortcuts.value[index - 1] = temp
  }
}

// 下移快捷键
const moveDown = (index) => {
  if (index < shortcuts.value.length - 1) {
    const temp = shortcuts.value[index]
    shortcuts.value[index] = shortcuts.value[index + 1]
    shortcuts.value[index + 1] = temp
  }
}

// 导出图片
const exportImage = async () => {
  try {
    ElMessage.info('正在生成图片，请稍候...')
    
    // 导出键盘示意图
    const keyboardCanvas = await html2canvas(keyboardRef.value, {
      backgroundColor: '#1a2332',
      scale: 3,  // 提高到3倍清晰度
      logging: false,
      useCORS: true
    })
    
    // 导出表格
    const tableElement = document.getElementById('table-container')
    const tableCanvas = await html2canvas(tableElement, {
      backgroundColor: '#141b2d',
      scale: 3,  // 提高到3倍清晰度
      logging: false,
      useCORS: true
    })
    
    // 创建合并的 canvas（无白边）
    const gap = 60  // 两部分之间的间距
    const totalHeight = keyboardCanvas.height + tableCanvas.height + gap
    const maxWidth = Math.max(keyboardCanvas.width, tableCanvas.width)
    
    const mergedCanvas = document.createElement('canvas')
    mergedCanvas.width = maxWidth
    mergedCanvas.height = totalHeight
    
    const ctx = mergedCanvas.getContext('2d')
    // 使用暗色背景，无白边
    ctx.fillStyle = '#0a0e27'
    ctx.fillRect(0, 0, maxWidth, totalHeight)
    
    // 绘制键盘（居中）
    const keyboardX = (maxWidth - keyboardCanvas.width) / 2
    ctx.drawImage(keyboardCanvas, keyboardX, 0)
    
    // 绘制表格（居中）
    const tableX = (maxWidth - tableCanvas.width) / 2
    const tableY = keyboardCanvas.height + gap
    ctx.drawImage(tableCanvas, tableX, tableY)
    
    // 下载图片
    const link = document.createElement('a')
    link.download = `keyboard-shortcuts-${Date.now()}.png`
    link.href = mergedCanvas.toDataURL('image/png', 1.0)  // 最高质量
    link.click()
    
    ElMessage.success('图片导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('图片导出失败')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

#app {
  min-height: 100vh;
  background: #0a0e27;
  color: #e0e0e0;
  margin: 0;
  padding: 0;
}

.main-container {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

.el-header {
  background: #141b2d;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px !important;
  border-bottom: 1px solid #1f2937;
  margin: 0;
  padding: 0 20px;
}

.el-header h1 {
  margin: 0;
  color: #60a5fa;
  font-size: 24px;
  font-weight: 600;
}

.el-main {
  padding: 20px;
  margin: 0;
}

:deep(.el-card) {
  background: #141b2d;
  border: 1px solid #1f2937;
  color: #e0e0e0;
  margin: 0;
}

:deep(.el-card__header) {
  background: #1a2332;
  border-bottom: 1px solid #1f2937;
  padding: 15px 20px;
  margin: 0;
}

:deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  font-weight: bold;
  font-size: 16px;
  color: #60a5fa;
}

.keyboard-card {
  margin-bottom: 20px;
}

/* 键盘区域 */
.keyboard-wrapper {
  background: #1a2332;
  padding: 40px;
  border-radius: 12px;
  position: relative;
  border: 1px solid #2d3748;
  overflow-x: auto;
}

/* 录制提示卡片 */
.recording-tips {
  position: absolute;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  z-index: 100;
  min-width: 280px;
  max-width: 350px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.tips-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tips-title {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recording-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.tips-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 36px;
  align-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.waiting-text {
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  font-size: 14px;
}

.tips-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* 键盘样式 - 放大1.4倍 */
.keyboard-87 {
  display: flex;
  flex-direction: column;
  gap: 7px;
  max-width: fit-content;
  margin: 0 auto;
}

.keyboard-row {
  display: flex;
  gap: 7px;
  align-items: flex-end;  /* 底部对齐 */
  height: 70px;  /* 固定行高 */
}

.key {
  height: 70px;
  border: 2px solid #2d3748;
  background: linear-gradient(180deg, #374151 0%, #1f2937 100%);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
  transition: all 0.2s;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
  flex-shrink: 0;  /* 防止收缩 */
}

.key:hover {
  background: linear-gradient(180deg, #4b5563 0%, #374151 100%);
  border-color: #60a5fa;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
  color: #e0e0e0;
}

.key.active {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  border-color: #60a5fa;
  transform: scale(0.95);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
}

/* 移除已添加快捷键的特殊样式 */
.key.has-shortcut {
  /* 不显示任何特殊样式 */
}

.key-label {
  font-size: 13px;
  pointer-events: none;
  white-space: pre-line;
  text-align: center;
  line-height: 1.3;
}

.single-key-desc {
  position: absolute;
  bottom: 6px;
  font-size: 10px;
  color: #fbbf24;
  font-weight: bold;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  text-shadow: 0 0 4px rgba(0,0,0,0.8);
}

/* 按键宽度 - 放大1.4倍 */
.w1 { width: 70px; }
.w1-25 { width: 92px; }
.w1-5 { width: 108px; }
.w1-75 { width: 130px; }
.w2 { width: 147px; }
.w2-25 { width: 163px; }
.w2-25s { width: 168px; }
.w2-75 { width: 202px; }
.w6-25 { width: 455px; }

/* 按键间隙 */
.gap-after {
  margin-right: 39px;
}

/* Esc键后的特殊间距 */
.esc-gap {
  margin-right: 77px !important;  /* Esc后额外间距 */
}

.esc-gap-after {
    margin-right: 116px;
}

/* 气泡标注 - 极致紧凑设计 */
.shortcut-bubble {
  position: absolute;
  z-index: 10;
  max-width: 400px;
  pointer-events: none;
}

.bubble-container {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border: 2px solid #60a5fa;
  border-radius: 6px;
  padding: 4px 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.6);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.bubble-modifiers {
  display: flex;
  gap: 3px;
  padding-right: 6px;
  border-right: 1px solid #374151;
}

.modifier-tag {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  text-align: center;
  min-width: 32px;
  line-height: 1.2;
}

.modifier-ctrl {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.modifier-shift {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.modifier-alt {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.modifier-win {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.bubble-desc {
  font-size: 12px;
  color: #e0e0e0;
  line-height: 1.2;
  font-weight: 500;
  padding-right: 2px;
}

.bubble-arrow {
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #60a5fa;
}

.bubble-arrow::after {
  content: '';
  position: absolute;
  left: -6px;
  top: -10px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #111827;
}

/* 表格样式 */
.table-card {
  margin-top: 20px;
}

:deep(.el-table) {
  background: #1a2332;
  color: #e0e0e0;
}

:deep(.el-table th.el-table__cell) {
  background: #1f2937;
  color: #60a5fa;
  border-color: #2d3748;
}

:deep(.el-table td.el-table__cell) {
  border-color: #2d3748;
  background: #141b2d;
}

:deep(.el-table tr) {
  background: #141b2d;
}

:deep(.el-table__body tr:hover > td) {
  background: #1f2937 !important;
}

:deep(.el-table--border::after),
:deep(.el-table--group::after),
:deep(.el-table::before) {
  background-color: #2d3748;
}

:deep(.el-input__wrapper) {
  background: #1f2937;
  border: 1px solid #374151;
  box-shadow: none;
}

:deep(.el-input__inner) {
  color: #e0e0e0;
}

:deep(.el-button) {
  border-color: #374151;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #3b82f6;
}

:deep(.el-button--success) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
}

:deep(.el-button--danger) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: #ef4444;
}

:deep(.el-button--info) {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-color: #6366f1;
}

:deep(.el-tag) {
  background: #374151;
  border-color: #4b5563;
  color: #e0e0e0;
}

:deep(.el-tag--success) {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

:deep(.el-tag--info) {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}
</style>
