// stores/health.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import moment from 'moment'
import DTODBA31 from '@/service/DTODBA31'
import DTODBA32 from '@/service/DTODBA32'
import DTODBA33 from '@/service/DTODBA33'
import DTODBA34 from '@/service/DTODBA34'
import HEALTHDAILY from '@/service/HEALTHDAILY'
import { useCommonStore } from './common'
import { useSourceCertifiStore } from './setting/sourceCertifi'

// ========== JSDoc 型別定義 ==========
/**
 * 健康記錄資料結構
 * @typedef {Object} HealthRecord
 * @property {string} date - 日期
 * @property {string} [last_update_tm] - 最後更新時間
 * @property {'Y'|'N'} [isAchieve] - 是否達成
 */

/**
 * API 回應結構
 * @typedef {Object} ApiResponse
 * @property {number} returnCode - 回應代碼
 * @property {Object} data - 資料物件
 * @property {HealthRecord[]} data.records - 健康記錄陣列
 */

/**
 * 儀表板項目結構
 * @typedef {Object} DashboardItem
 * @property {string} key - 唯一識別鍵
 * @property {number} percent - 完成百分比
 * @property {string} color - 顏色
 * @property {string} icon - 圖示名稱
 * @property {string} title - 標題
 * @property {string} celebrus_id - Celebrus 追蹤 ID
 * @property {string} [lottieEl] - Lottie 動畫元素 ID
 * @property {boolean} [taskSuccess] - 任務是否成功
 * @property {boolean} [timeSuccess] - 時間是否達標
 * @property {Object} [content] - 內容物件
 * @property {string} [note] - 備註
 * @property {string} [disabledColor] - 停用顏色
 */

/**
 * 健康資料來源類型
 * @typedef {'ios'|'Android'|'Fitbit'|'Garmin'|'HealthConnect'|''} HealthSourceType
 */

// ========== 常數定義 ==========
const HEALTH_CONFIG = {
  UPDATE_TIME_THRESHOLD_DAYS: 6,
  ANDROID_CUTOFF_DATE: '2026-01-01',
  UPDATE_MINUTE_THRESHOLD: 1,
  CACHE_DURATION: 5 * 60 * 1000 // 5 分鐘快取
}

/** @type {Record<string, Omit<DashboardItem, 'key'>>} */
const DASHBOARD_DEFAULTS = {
  step: {
    percent: 0,
    color: 'rgb(144 202 249)',
    icon: 'step_count',
    lottieEl: 'cl-step-count-lottie',
    title: '步數',
    celebrus_id: 'IND_TKD_steps',
    content: {
      first: '',
      firstColor: ''
    }
  },
  heartRate: {
    percent: 0,
    color: 'rgb(255 171 145)',
    icon: 'heart_rate',
    title: '運動心率',
    celebrus_id: 'IND_TKD_HR',
    content: {
      first: '',
      firstColor: '',
      second: '',
      secondColor: ''
    }
  },
  bedtime: {
    percent: 0,
    color: 'rgb(159 168 218)',
    icon: 'bedtime',
    title: '睡眠',
    celebrus_id: 'IND_TKD_sleep',
    content: {
      first: '',
      firstColor: ''
    }
  },
  fitnessCenter: {
    percent: 0,
    color: 'rgb(165 214 167)',
    icon: 'fitness_center',
    title: '健身場館',
    celebrus_id: 'IND_TKD_gym',
    content: {
      first: '',
      firstColor: ''
    }
  }
}

/** @type {Record<string, string>} */
const HEALTH_SOURCE_MAP = {
  ios: 'Apple Health',
  Android: 'Google Fit'
}

// ========== Store 定義 ==========
export const useHealthStore = defineStore('health', () => {
  // ========== State ==========
  /** @type {import('vue').Ref<boolean>} */
  const loading = ref(true)
  
  /** @type {import('vue').Ref<string>} */
  const updateInfo = ref('')
  
  /** @type {import('vue').Ref<moment.Moment[]>} */
  const lastUpdateTmArr = ref([])
  
  /** @type {import('vue').Ref<HealthSourceType>} */
  const healthSource = ref('')
  
  /** @type {import('vue').Ref<boolean>} */
  const isOpened = ref(true)
  
  /** @type {import('vue').Ref<Error|null>} */
  const error = ref(null)
  
  /** @type {import('vue').Ref<number|null>} */
  const cacheTimestamp = ref(null)
  
  /** @type {import('vue').Ref<{weekStart: string, weekEnd: string, today: string}>} */
  const dateRange = ref({
    weekStart: '',
    weekEnd: '',
    today: ''
  })

  // 儲存本週完整資料（供詳細頁面使用）
  /** @type {import('vue').Ref<HealthRecord[]>} */
  const weeklyStepRecords = ref([])
  /** @type {import('vue').Ref<HealthRecord[]>} */
  const weeklyHeartRecords = ref([])
  /** @type {import('vue').Ref<HealthRecord[]>} */
  const weeklySleepRecords = ref([])
  /** @type {import('vue').Ref<HealthRecord[]>} */
  const weeklyGymRecords = ref([])

  // 儀表板資料（首頁顯示當日）
  /** @type {import('vue').Ref<Omit<DashboardItem, 'key'>>} */
  const stepData = ref({ ...DASHBOARD_DEFAULTS.step })
  
  /** @type {import('vue').Ref<Omit<DashboardItem, 'key'>>} */
  const heartRateData = ref({ ...DASHBOARD_DEFAULTS.heartRate })
  
  /** @type {import('vue').Ref<Omit<DashboardItem, 'key'>>} */
  const bedtimeData = ref({ ...DASHBOARD_DEFAULTS.bedtime })
  
  /** @type {import('vue').Ref<Omit<DashboardItem, 'key'>>} */
  const fitnessCenterData = ref({ ...DASHBOARD_DEFAULTS.fitnessCenter })

  // ========== Getters ==========
  /**
   * 健康資料來源顯示名稱
   * @type {import('vue').ComputedRef<string>}
   */
  const healthSourceName = computed(() => {
    return HEALTH_SOURCE_MAP[healthSource.value] || healthSource.value
  })

  /**
   * 健康資料來源是否有效
   * @type {import('vue').ComputedRef<boolean>}
   */
  const isHealthSourceValid = computed(() => {
    return /Fitbit|Garmin|ios|Android|HealthConnect/.test(healthSource.value)
  })

  /**
   * 儀表板物件結構（用於直接存取特定項目）
   * @type {import('vue').ComputedRef<Record<string, Omit<DashboardItem, 'key'>>>}
   */
  const dashboard = computed(() => ({
    step: stepData.value,
    heartRate: heartRateData.value,
    bedtime: bedtimeData.value,
    fitnessCenter: fitnessCenterData.value
  }))

  /**
   * 儀表板陣列結構（用於循序渲染）
   * @type {import('vue').ComputedRef<DashboardItem[]>}
   */
  const dashboardList = computed(() => [
    { key: 'step', ...stepData.value },
    { key: 'heartRate', ...heartRateData.value },
    { key: 'bedtime', ...bedtimeData.value },
    { key: 'fitnessCenter', ...fitnessCenterData.value }
  ])

  /**
   * 有資料的儀表板項目（過濾掉未完成的）
   * @type {import('vue').ComputedRef<DashboardItem[]>}
   */
  const activeDashboardList = computed(() => 
    dashboardList.value.filter(item => item.percent > 0 || item.taskSuccess)
  )

  /**
   * 本週完整資料（詳細頁面用）
   * @type {import('vue').ComputedRef<Object>}
   */
  const weeklyData = computed(() => ({
    step: weeklyStepRecords.value.map(r => ({
      ...r,
      isToday: r.date === dateRange.value.today
    })),
    heart: weeklyHeartRecords.value.map(r => ({
      ...r,
      isToday: r.date === dateRange.value.today
    })),
    sleep: weeklySleepRecords.value.map(r => ({
      ...r,
      isToday: r.date === dateRange.value.today
    })),
    gym: weeklyGymRecords.value.map(r => ({
      ...r,
      isToday: r.date === dateRange.value.today
    }))
  }))

  // ========== 輔助函數 ==========
  /**
   * 初始化為本週週一到週日的日期範圍
   * @returns {void}
   */
  function initializeDateRange() {
    const commonStore = useCommonStore()
    const currentDate = moment(commonStore.nowDate)
    
    // 使用 isoWeek 確保週一為起始日
    dateRange.value.weekStart = currentDate.clone().startOf('isoWeek').format('YYYY-MM-DD')
    dateRange.value.weekEnd = currentDate.clone().endOf('isoWeek').format('YYYY-MM-DD')
    dateRange.value.today = currentDate.format('YYYY-MM-DD')
  }

  /**
   * 取得今日資料
   * @param {HealthRecord[]} records - 本週健康記錄
   * @returns {HealthRecord[]}
   */
  function getTodayData(records) {
    return records.filter(item => item.date === dateRange.value.today)
  }

  /**
   * 建立日期範圍參數（本週一到週日）
   * @returns {{startDate: string, endDate: string}}
   */
  function buildDateRangeParams() {
    return {
      startDate: `${dateRange.value.weekStart} 00:00:00`,
      endDate: `${dateRange.value.weekEnd} 23:59:59`
    }
  }

  /**
   * 更新最後更新時間資訊
   * @param {ApiResponse['data']} data - API 回應資料
   * @returns {void}
   */
  function updateLastUpdateTime(data) {
    const validDates = data.records
      .filter(item => item.last_update_tm)
      .map(item => moment(item.last_update_tm, 'YYYY-MM-DD HH:mm:ss.SSS'))

    if (validDates.length === 0) {
      updateInfo.value = '上週 更新'
      return
    }

    lastUpdateTmArr.value.push(...validDates)
    const maxTime = moment.max(lastUpdateTmArr.value)
    const commonStore = useCommonStore()
    
    const minutesDiff = moment().diff(maxTime, 'minute')
    const daysDiff = moment(commonStore.nowDate).diff(maxTime, 'days')
    
    updateInfo.value = minutesDiff < HEALTH_CONFIG.UPDATE_MINUTE_THRESHOLD
      ? '剛剛 更新'
      : daysDiff < HEALTH_CONFIG.UPDATE_TIME_THRESHOLD_DAYS
        ? `${maxTime.format('YYYY/MM/DD HH:mm')} 更新`
        : '上週 更新'
  }

  // ========== 資料獲取 Actions ==========
  /**
   * 取得今日步數（從本週資料中過濾）
   * @returns {Promise<void>}
   */
  async function fetchStepData() {
    try {
      const dataParams = buildDateRangeParams()
      const resp = await $cathayAxios.get(DTODBA31.getWalkBetweenDuring, dataParams)
      
      if (resp.returnCode !== 0) return

      // 步數 - 更新最後更新時間
      updateLastUpdateTime(resp.data)
      
      // 保存本週完整資料
      weeklyStepRecords.value = resp.data.records
      
      // 過濾今日資料
      const data = getTodayData(resp.data.records)
      if (data.length === 0 || (data.length === 1 && data[0].last_update_tm === null)) {
        return
      }

      const commonStore = useCommonStore()
      const stepObj = HEALTHDAILY.processStepData(
        true,
        0,
        commonStore.nowDate,
        commonStore.nowDate,
        null,
        resp.data.records,
        [],
        null
      )

      // 更新儀表板資料
      stepData.value = {
        ...stepData.value,
        celebrus_id: 'IND_TKD_steps',
        taskSuccess: stepObj.uiData.taskSuccess,
        content: {
          first: stepObj.uiData.content.first,
          firstColor: stepObj.uiData.content.firstColor
        },
        note: stepObj.note,
        percent: stepObj.uiData.percent
      }
    } catch (err) {
      error.value = err
      console.error('獲取步數失敗:', err)
    }
  }

  /**
   * 取得今日心率（從本週資料中過濾）
   * @returns {Promise<void>}
   */
  async function fetchHeartData() {
    try {
      const dataParams = buildDateRangeParams()
      const resp = await $cathayAxios.get(DTODBA32.getHeartBetweenDuring, dataParams)
      
      if (resp.returnCode !== 0) return

      // 心率 - 更新最後更新時間
      updateLastUpdateTime(resp.data)
      
      // 保存本週完整資料
      weeklyHeartRecords.value = resp.data.records
      
      // 過濾今日資料
      const data = getTodayData(resp.data.records)
      if (data.length === 0 || data[0].last_update_tm === null) {
        return
      }

      const commonStore = useCommonStore()
      const heartObj = HEALTHDAILY.processHeartData(
        true,
        { todayAvgRate: 0, todayDuration: 0, todayAchieveRate: 0 },
        commonStore.nowDate,
        commonStore.nowDate,
        null,
        resp.data.records,
        [],
        null
      )

      // 更新儀表板資料
      heartRateData.value = {
        ...heartRateData.value,
        celebrus_id: 'IND_TKD_HR',
        content: {
          first: heartObj.uiData.content.first,
          firstColor: heartObj.uiData.content.firstColor,
          second: heartObj.uiData.content.second,
          secondColor: heartObj.uiData.content.secondColor
        },
        percent: heartObj.uiData.percent,
        taskSuccess: heartObj.uiData.taskSuccess,
        timeSuccess: heartObj.uiData.timeSuccess,
        note: heartObj.note
      }
    } catch (err) {
      error.value = err
      console.error('獲取心率失敗:', err)
    }
  }

  /**
   * 取得今日睡眠（從本週資料中過濾）
   * @returns {Promise<void>}
   */
  async function fetchSleepData() {
    try {
      const dataParams = buildDateRangeParams()
      const resp = await $cathayAxios.get(DTODBA33.getSleepBetweenDuring, dataParams)
      
      if (resp.returnCode !== 0) return

      // 睡眠 - 更新最後更新時間
      updateLastUpdateTime(resp.data)
      
      // 保存本週完整資料
      weeklySleepRecords.value = resp.data.records
      
      // 過濾今日資料
      const data = getTodayData(resp.data.records)
      if (data.length === 0 || data[0].last_update_tm === null) {
        return
      }

      const commonStore = useCommonStore()
      const sleepObj = HEALTHDAILY.processSleepData(
        true,
        0,
        commonStore.nowDate,
        commonStore.nowDate,
        null,
        resp.data.records,
        [],
        null
      )

      // 更新儀表板資料
      bedtimeData.value = {
        ...bedtimeData.value,
        celebrus_id: 'IND_TKD_sleep',
        content: {
          first: sleepObj.uiData.content.first,
          firstColor: sleepObj.uiData.content.firstColor
        },
        percent: sleepObj.uiData.percent,
        taskSuccess: sleepObj.uiData.taskSuccess,
        timeSuccess: sleepObj.uiData.timeSuccess,
        note: sleepObj.note
      }
    } catch (err) {
      error.value = err
      console.error('獲取睡眠失敗:', err)
    }
  }

  /**
   * 取得今日健身場館（從本週資料中過濾）
   * @returns {Promise<void>}
   */
  async function fetchGymData() {
    try {
      const dataParams = buildDateRangeParams()
      const resp = await $cathayAxios.get(DTODBA34.getGymBetweenDuring, dataParams)
      
      if (resp.returnCode !== 0) return

      // 保存本週完整資料
      weeklyGymRecords.value = resp.data.records
      
      // 運動打卡 - 過濾今日資料
      const data = getTodayData(resp.data.records)
      if (data.length === 0 || data[0].isAchieve === 'N') {
        return
      }

      const commonStore = useCommonStore()
      const fitnessObj = HEALTHDAILY.processGymData(
        true,
        false,
        commonStore.nowDate,
        commonStore.nowDate,
        resp.data.records,
        []
      )

      // 更新儀表板資料
      fitnessCenterData.value = {
        ...fitnessCenterData.value,
        celebrus_id: 'IND_TKD_gym',
        taskSuccess: fitnessObj.uiData.taskSuccess,
        disabledColor: 'rgb(165 214 167)',
        percent: fitnessObj.uiData.percent,
        content: {
          first: fitnessObj.uiData.content.first,
          firstColor: fitnessObj.uiData.content.firstColor
        }
      }
    } catch (err) {
      error.value = err
      console.error('獲取健身場館失敗:', err)
    }
  }

  /**
   * 並行獲取所有健康資料（使用 Promise.allSettled 防止單一失敗影響其他）
   * @returns {Promise<void>}
   */
  async function fetchAllHealthData() {
    // 檢查快取是否仍有效
    if (cacheTimestamp.value && 
        Date.now() - cacheTimestamp.value < HEALTH_CONFIG.CACHE_DURATION) {
      console.log('使用快取資料')
      return
    }

    const results = await Promise.allSettled([
      fetchStepData(),
      fetchHeartData(),
      fetchSleepData(),
      fetchGymData()
    ])
    
    // 更新快取時間戳
    cacheTimestamp.value = Date.now()
    
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      console.warn(`${failures.length} 項健康數據載入失敗`)
    }
  }

  // ========== 主要 Actions ==========
  /**
   * 檢查健康資料來源
   * @param {boolean} [isAndroid] - 是否為 Android 裝置
   * @returns {Promise<void>}
   */
  async function checkHealthSource(isAndroid) {
    loading.value = true
    error.value = null
    
    try {
      const sourceCertifiStore = useSourceCertifiStore()
      healthSource.value = await sourceCertifiStore.checkHealthSource(isAndroid)

      // Android 用戶在 2026 年後不顯示健康目標
      const commonStore = useCommonStore()
      if (
        healthSource.value === 'Android' &&
        moment(commonStore.nowDate).isSameOrAfter(HEALTH_CONFIG.ANDROID_CUTOFF_DATE)
      ) {
        isOpened.value = false
        return
      }

      if (isHealthSourceValid.value) {
        initializeDateRange()
        await fetchAllHealthData()
      } else {
        isOpened.value = false
      }
    } catch (err) {
      error.value = err
      console.error('檢查健康資料來源失敗:', err)
      isOpened.value = false
    } finally {
      loading.value = false
    }
  }

  /**
   * 初始化 Store
   * @param {boolean} [isAndroid] - 是否為 Android 裝置
   * @returns {Promise<void>}
   */
  async function initialize(isAndroid) {
    await checkHealthSource(isAndroid)
  }

  /**
   * 手動刷新資料（清除快取）
   * @returns {Promise<void>}
   */
  async function refreshData() {
    cacheTimestamp.value = null
    lastUpdateTmArr.value = []
    await fetchAllHealthData()
  }

  /**
   * 重置 Store 狀態
   * @returns {void}
   */
  function resetStore() {
    loading.value = true
    updateInfo.value = ''
    lastUpdateTmArr.value = []
    healthSource.value = ''
    isOpened.value = true
    error.value = null
    cacheTimestamp.value = null
    
    weeklyStepRecords.value = []
    weeklyHeartRecords.value = []
    weeklySleepRecords.value = []
    weeklyGymRecords.value = []
    
    stepData.value = { ...DASHBOARD_DEFAULTS.step }
    heartRateData.value = { ...DASHBOARD_DEFAULTS.heartRate }
    bedtimeData.value = { ...DASHBOARD_DEFAULTS.bedtime }
    fitnessCenterData.value = { ...DASHBOARD_DEFAULTS.fitnessCenter }
  }

  // ========== 返回公開介面 ==========
  return {
    // State
    loading,
    updateInfo,
    healthSource,
    isOpened,
    error,
    dateRange,
    
    // Getters
    healthSourceName,
    isHealthSourceValid,
    dashboard,
    dashboardList,
    activeDashboardList,
    weeklyData,
    
    // Actions
    checkHealthSource,
    fetchAllHealthData,
    refreshData,
    initialize,
    resetStore
  }
})
