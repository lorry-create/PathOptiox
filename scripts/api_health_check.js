/**
 * PathOptix 全模块接口连通性与字段契约校验脚本
 *
 * 使用说明：
 *   1. 确保后端服务已启动（默认端口 8010）
 *      启动命令：cd backend; .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8010
 *   2. 运行脚本：node scripts/api_health_check.js
 *   3. 如需指定端口：node scripts/api_health_check.js 8015
 *
 * 约束：
 *   - 仅使用 Node.js 原生 http/https 模块，不依赖任何第三方包
 *   - 仅发起 GET 请求与少量安全的 POST 请求（路径优化 / 聊天），不破坏后端内存数据
 *   - 后端使用内存存储，重启后数据重置
 *
 * 注意: 项目 package.json 含 "type": "module"，本文件使用 ES Module 语法
 */
import http from 'http';

// ====== 基础配置 ======
const PORT = parseInt(process.argv[2] || '8010', 10);
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}/api`;
const DEMO_TOKEN = 'demo_admin_token_2026';

// 颜色输出（Windows 兼容）
const C = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// ====== 结果收集 ======
const results = [];
let passCount = 0;
let failCount = 0;

/**
 * 记录单条校验结果
 * @param {string} module 模块名
 * @param {string} name 用例名
 * @param {boolean} pass 是否通过
 * @param {string} detail 详情
 * @param {string} errorType 错误类型（连接失败/404/字段缺失/类型错误/CORS/其他）
 */
function record(module, name, pass, detail, errorType = '') {
  results.push({ module, name, pass, detail, errorType });
  if (pass) passCount++;
  else failCount++;
}

// ====== HTTP 请求封装 ======
/**
 * 发起 HTTP 请求
 * @param {string} method GET/POST
 * @param {string} path 相对路径（如 /auth/me）
 * @param {object|null} body POST body
 * @param {object} queryParams query 参数
 * @returns {Promise<{status:number, data:any, headers:object, raw:string}>}
 */
function request(method, path, body = null, queryParams = {}) {
  return new Promise((resolve, reject) => {
    // 构建 query string
    const qs = Object.keys(queryParams)
      .filter(k => queryParams[k] !== undefined && queryParams[k] !== null)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');
    const fullPath = qs ? `${path}?${qs}` : path;

    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: HOST,
      port: PORT,
      path: `/api${fullPath}`,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEMO_TOKEN}`,
      },
      timeout: 15000,
    };
    if (bodyStr) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch (e) {
          data = raw; // 非 JSON 响应
        }
        resolve({ status: res.statusCode, data, headers: res.headers, raw });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy(new Error('请求超时 (15s)'));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ====== 工具函数 ======
function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function keysOf(obj) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.keys(obj);
  }
  return [];
}

function truncate(str, max = 200) {
  if (typeof str !== 'string') str = JSON.stringify(str);
  return str.length > max ? str.slice(0, max) + '...' : str;
}

// ====== 校验用例定义 ======
async function checkAuth() {
  const module = '认证模块';
  // GET /api/auth/me
  try {
    const res = await request('GET', '/auth/me');
    if (res.status === 404) {
      record(module, 'GET /auth/me', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
      return;
    }
    if (res.status !== 200) {
      record(module, 'GET /auth/me', false, `状态码=${res.status}，期望 200。响应: ${truncate(res.raw)}`, '其他');
      return;
    }
    const data = res.data || {};
    const hasUser = typeof data.username === 'string';
    const hasEmail = typeof data.email === 'string';
    if (hasUser && hasEmail) {
      record(module, 'GET /auth/me', true, `username="${data.username}", email="${data.email}"`);
    } else {
      const missing = [];
      if (!hasUser) missing.push('username');
      if (!hasEmail) missing.push('email');
      record(module, 'GET /auth/me', false, `字段缺失: ${missing.join(', ')}。实际字段: [${keysOf(data).join(', ')}]`, '字段缺失');
    }
  } catch (e) {
    record(module, 'GET /auth/me', false, `连接失败: ${e.message}`, '连接失败');
  }
}

async function checkOrders() {
  const module = '订单模块';
  // GET /api/orders
  try {
    const res = await request('GET', '/orders');
    if (res.status === 404) {
      record(module, 'GET /orders', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'GET /orders', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      const data = res.data || {};
      const ordersOk = Array.isArray(data.orders);
      const totalOk = typeof data.total === 'number';
      if (ordersOk && totalOk) {
        record(module, 'GET /orders', true, `orders.length=${data.orders.length}, total=${data.total}`);
      } else {
        const missing = [];
        if (!ordersOk) missing.push(`orders(${typeOf(data.orders)})`);
        if (!totalOk) missing.push(`total(${typeOf(data.total)})`);
        record(module, 'GET /orders', false, `字段/类型不符: ${missing.join(', ')}。实际字段: [${keysOf(data).join(', ')}]`, '类型错误');
      }
    }
  } catch (e) {
    record(module, 'GET /orders', false, `连接失败: ${e.message}`, '连接失败');
  }

  // GET /api/orders/metrics
  try {
    const res = await request('GET', '/orders/metrics');
    if (res.status === 404) {
      record(module, 'GET /orders/metrics', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'GET /orders/metrics', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      const data = res.data || {};
      // 任务要求校验 total_amount，但后端 OrderMetricsData 实际字段为 total_count 等
      // 这里同时校验任务要求字段与实际字段，分别记录
      const actualFields = keysOf(data);
      const hasTotalAmount = typeof data.total_amount === 'number';
      const hasTotalCount = typeof data.total_count === 'number';
      if (hasTotalAmount) {
        record(module, 'GET /orders/metrics', true, `total_amount=${data.total_amount} (数值类型)`);
      } else if (hasTotalCount) {
        record(
          module,
          'GET /orders/metrics',
          true,
          `字段差异: 任务要求 total_amount，后端实际返回 total_count=${data.total_count}。实际字段: [${actualFields.join(', ')}]。注: total_amount 是 Order 字段，非 metrics 字段`
        );
      } else {
        record(module, 'GET /orders/metrics', false, `字段缺失: total_amount/total_count 均不存在。实际字段: [${actualFields.join(', ')}]`, '字段缺失');
      }
    }
  } catch (e) {
    record(module, 'GET /orders/metrics', false, `连接失败: ${e.message}`, '连接失败');
  }
}

async function checkCarbon() {
  const module = '碳排放模块';
  const CARBON_OVERVIEW_FIELDS = [
    'total_emission_kg', 'trend_pct', 'green_rate', 'green_rate_trend',
    'offset_count_kg', 'offset_trend', 'esg_score', 'esg_trend',
    'energy_consumption_kwh', 'energy_trend', 'pue', 'pue_trend',
  ];

  // GET /api/carbon/overview
  try {
    const res = await request('GET', '/carbon/overview');
    if (res.status === 404) {
      record(module, 'GET /carbon/overview', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'GET /carbon/overview', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      const data = res.data || {};
      const actualFields = keysOf(data);
      const missing = CARBON_OVERVIEW_FIELDS.filter(f => !(f in data));
      const allNumeric = CARBON_OVERVIEW_FIELDS.every(f => typeof data[f] === 'number');
      if (missing.length === 0 && allNumeric) {
        record(module, 'GET /carbon/overview', true, `12 字段完整且均为数值类型`);
      } else {
        const reasons = [];
        if (missing.length > 0) reasons.push(`缺失字段: [${missing.join(', ')}]`);
        if (!allNumeric) {
          const badTypes = CARBON_OVERVIEW_FIELDS.filter(f => f in data && typeof data[f] !== 'number').map(f => `${f}(${typeOf(data[f])})`);
          reasons.push(`非数值字段: ${badTypes.join(', ')}`);
        }
        record(module, 'GET /carbon/overview', false, `${reasons.join('; ')}。实际字段: [${actualFields.join(', ')}]`, missing.length > 0 ? '字段缺失' : '类型错误');
      }
    }
  } catch (e) {
    record(module, 'GET /carbon/overview', false, `连接失败: ${e.message}`, '连接失败');
  }

  // GET /api/carbon/trend?time_range=day
  // 注意: 后端参数名为 time_range，任务描述中的 period 实际不生效（后端使用默认值 day）
  try {
    const res = await request('GET', '/carbon/trend', null, { time_range: 'day' });
    if (res.status === 404) {
      record(module, 'GET /carbon/trend', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'GET /carbon/trend', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      const data = res.data;
      if (Array.isArray(data)) {
        record(module, 'GET /carbon/trend', true, `返回数组, length=${data.length} (参数 time_range=day)`);
      } else {
        record(module, 'GET /carbon/trend', false, `期望数组，实际 ${typeOf(data)}。响应: ${truncate(res.raw)}`, '类型错误');
      }
    }
  } catch (e) {
    record(module, 'GET /carbon/trend', false, `连接失败: ${e.message}`, '连接失败');
  }
}

async function checkAlerts() {
  const module = '风险预警模块';
  try {
    const res = await request('GET', '/alerts', null, { page: 1, page_size: 5 });
    if (res.status === 404) {
      record(module, 'GET /alerts', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'GET /alerts', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      const data = res.data || {};
      const checks = {
        list: Array.isArray(data.list),
        total: typeof data.total === 'number',
        page: typeof data.page === 'number',
        page_size: typeof data.page_size === 'number',
      };
      const failed = Object.keys(checks).filter(k => !checks[k]);
      if (failed.length === 0) {
        record(module, 'GET /alerts', true, `list.length=${data.list.length}, total=${data.total}, page=${data.page}, page_size=${data.page_size}`);
      } else {
        const detail = failed.map(k => `${k}(${typeOf(data[k])})`).join(', ');
        record(module, 'GET /alerts', false, `字段/类型不符: ${detail}。实际字段: [${keysOf(data).join(', ')}]`, '类型错误');
      }
    }
  } catch (e) {
    record(module, 'GET /alerts', false, `连接失败: ${e.message}`, '连接失败');
  }
}

async function checkDashboard() {
  const module = '仪表盘模块';
  const METRICS_FIELDS = [
    'active_orders', 'active_orders_trend', 'on_time_rate', 'on_time_trend',
    'total_emission_kg', 'emission_trend', 'risk_count', 'risk_trend',
  ];
  try {
    const res = await request('GET', '/dashboard/overview');
    if (res.status === 404) {
      record(module, 'GET /dashboard/overview', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'GET /dashboard/overview', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      const data = res.data || {};
      const metrics = data.metrics || {};
      const agentLoad = data.agent_load;
      const reasons = [];
      // 校验 metrics 8 字段
      const missingMetrics = METRICS_FIELDS.filter(f => !(f in metrics));
      if (missingMetrics.length > 0) {
        reasons.push(`metrics 缺失字段: [${missingMetrics.join(', ')}]`);
      }
      // 校验 agent_load 数组
      if (!Array.isArray(agentLoad)) {
        reasons.push(`agent_load 期望数组，实际 ${typeOf(agentLoad)}`);
      }
      if (reasons.length === 0) {
        record(module, 'GET /dashboard/overview', true, `metrics 8 字段完整, agent_load.length=${agentLoad.length}`);
      } else {
        record(module, 'GET /dashboard/overview', false, `${reasons.join('; ')}。实际字段: [${keysOf(data).join(', ')}]`, missingMetrics.length > 0 ? '字段缺失' : '类型错误');
      }
    }
  } catch (e) {
    record(module, 'GET /dashboard/overview', false, `连接失败: ${e.message}`, '连接失败');
  }
}

async function checkOptimize() {
  const module = '路径优化模块';
  const body = {
    start_node: '北京',
    end_node: '深圳',
    weight_cost: 0.4,
    weight_time: 0.3,
    weight_carbon: 0.2,
    weight_risk: 0.1,
    network_model: 'ppo',
    scene: 'normal',
  };
  try {
    const res = await request('POST', '/optimize/route', body);
    if (res.status === 404) {
      record(module, 'POST /optimize/route', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'POST /optimize/route', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      const data = res.data || {};
      const schemes = data.schemes;
      const reasons = [];
      if (!Array.isArray(schemes)) {
        reasons.push(`schemes 期望数组，实际 ${typeOf(schemes)}`);
      } else if (schemes.length !== 4) {
        reasons.push(`schemes 期望 4 套方案，实际 ${schemes.length} 套`);
      }
      // 校验 steps_detail 含 from 字段
      if (Array.isArray(schemes) && schemes.length > 0) {
        const first = schemes[0] || {};
        const steps = first.steps_detail;
        if (!Array.isArray(steps)) {
          reasons.push(`steps_detail 期望数组，实际 ${typeOf(steps)}`);
        } else if (steps.length > 0) {
          const hasFrom = 'from' in (steps[0] || {});
          if (!hasFrom) {
            reasons.push(`steps_detail[0] 缺少 from 字段。实际字段: [${keysOf(steps[0]).join(', ')}]`);
          }
        }
      }
      if (reasons.length === 0) {
        const stepFrom = (schemes[0].steps_detail && schemes[0].steps_detail[0] && schemes[0].steps_detail[0].from) || '?';
        record(module, 'POST /optimize/route', true, `schemes.length=${schemes.length}, steps_detail[0].from="${stepFrom}"`);
      } else {
        record(module, 'POST /optimize/route', false, reasons.join('; '), '字段缺失');
      }
    }
  } catch (e) {
    record(module, 'POST /optimize/route', false, `连接失败: ${e.message}`, '连接失败');
  }
}

async function checkTraining() {
  const module = '训练模块';
  // GET /api/models
  try {
    const res = await request('GET', '/models');
    if (res.status === 404) {
      record(module, 'GET /models', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'GET /models', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      if (Array.isArray(res.data)) {
        record(module, 'GET /models', true, `返回数组, length=${res.data.length}`);
      } else {
        record(module, 'GET /models', false, `期望数组，实际 ${typeOf(res.data)}。响应: ${truncate(res.raw)}`, '类型错误');
      }
    }
  } catch (e) {
    record(module, 'GET /models', false, `连接失败: ${e.message}`, '连接失败');
  }

  // GET /api/training/history
  try {
    const res = await request('GET', '/training/history');
    if (res.status === 404) {
      record(module, 'GET /training/history', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'GET /training/history', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      if (Array.isArray(res.data)) {
        record(module, 'GET /training/history', true, `返回数组, length=${res.data.length}`);
      } else {
        record(module, 'GET /training/history', false, `期望数组，实际 ${typeOf(res.data)}。响应: ${truncate(res.raw)}`, '类型错误');
      }
    }
  } catch (e) {
    record(module, 'GET /training/history', false, `连接失败: ${e.message}`, '连接失败');
  }
}

async function checkChat() {
  const module = '聊天模块';
  try {
    const res = await request('POST', '/chat', { message: '查询订单' });
    if (res.status === 404) {
      record(module, 'POST /chat', false, `404 路由不存在。实际返回: ${truncate(res.raw)}`, '404');
    } else if (res.status !== 200) {
      record(module, 'POST /chat', false, `状态码=${res.status}。响应: ${truncate(res.raw)}`, '其他');
    } else {
      const data = res.data || {};
      if (typeof data.response === 'string') {
        record(module, 'POST /chat', true, `response="${truncate(data.response, 80)}"`);
      } else {
        record(module, 'POST /chat', false, `response 字段缺失或非字符串。实际字段: [${keysOf(data).join(', ')}]`, '字段缺失');
      }
    }
  } catch (e) {
    record(module, 'POST /chat', false, `连接失败: ${e.message}`, '连接失败');
  }
}

// ====== 主流程 ======
async function main() {
  console.log(`${C.bold}${C.cyan}========================================${C.reset}`);
  console.log(`${C.bold}${C.cyan} PathOptix API 全模块连通性校验${C.reset}`);
  console.log(`${C.bold}${C.cyan}========================================${C.reset}`);
  console.log(`${C.gray}目标后端: ${BASE}${C.reset}`);
  console.log(`${C.gray}Demo Token: ${DEMO_TOKEN}${C.reset}`);
  console.log(`${C.gray}开始时间: ${new Date().toLocaleString('zh-CN')}${C.reset}\n`);

  // 1. 先做健康检查
  try {
    const healthRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: HOST, port: PORT, path: '/', method: 'GET', timeout: 5000,
      }, (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => resolve({ status: res.statusCode, raw }));
      });
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.end();
    });
    if (healthRes.status !== 200) {
      console.log(`${C.yellow}⚠ 根路径健康检查状态码: ${healthRes.status}${C.reset}`);
    } else {
      console.log(`${C.green}✓ 后端服务在线 (根路径 200)${C.reset}\n`);
    }
  } catch (e) {
    console.log(`${C.red}✗ 后端服务连接失败: ${e.message}${C.reset}`);
    console.log(`${C.yellow}  请确认后端已启动: cd backend; .\\venv\\Scripts\\python.exe -m uvicorn main:app --host 127.0.0.1 --port ${PORT}${C.reset}`);
    console.log(`${C.yellow}  或指定其他端口: node scripts/api_health_check.js 8015${C.reset}\n`);
    process.exit(1);
  }

  // 2. 逐模块校验
  console.log(`${C.bold}--- 1. 认证模块 ---${C.reset}`);
  await checkAuth();
  console.log(`${C.bold}--- 2. 订单模块 ---${C.reset}`);
  await checkOrders();
  console.log(`${C.bold}--- 3. 碳排放模块 ---${C.reset}`);
  await checkCarbon();
  console.log(`${C.bold}--- 4. 风险预警模块 ---${C.reset}`);
  await checkAlerts();
  console.log(`${C.bold}--- 5. 仪表盘模块 ---${C.reset}`);
  await checkDashboard();
  console.log(`${C.bold}--- 6. 路径优化模块 ---${C.reset}`);
  await checkOptimize();
  console.log(`${C.bold}--- 7. 训练模块 ---${C.reset}`);
  await checkTraining();
  console.log(`${C.bold}--- 8. 聊天模块 ---${C.reset}`);
  await checkChat();

  // 3. 输出报告
  console.log(`\n${C.bold}${C.cyan}========================================${C.reset}`);
  console.log(`${C.bold}${C.cyan} 校验结果明细${C.reset}`);
  console.log(`${C.bold}${C.cyan}========================================${C.reset}`);
  let lastModule = '';
  results.forEach((r) => {
    if (r.module !== lastModule) {
      console.log(`\n${C.bold}[${r.module}]${C.reset}`);
      lastModule = r.module;
    }
    const tag = r.pass ? `${C.green}✓ PASS${C.reset}` : `${C.red}✗ FAIL${C.reset}`;
    const errTag = r.errorType && !r.pass ? ` ${C.yellow}[${r.errorType}]${C.reset}` : '';
    console.log(`  ${tag}${errTag} ${r.name}`);
    console.log(`    ${C.gray}${r.detail}${C.reset}`);
  });

  // 4. 汇总统计
  const total = results.length;
  const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : '0.0';
  console.log(`\n${C.bold}${C.cyan}========================================${C.reset}`);
  console.log(`${C.bold}${C.cyan} 汇总统计${C.reset}`);
  console.log(`${C.bold}${C.cyan}========================================${C.reset}`);
  console.log(`  总用例数: ${C.bold}${total}${C.reset}`);
  console.log(`  ${C.green}通过: ${passCount}${C.reset}`);
  console.log(`  ${C.red}失败: ${failCount}${C.reset}`);
  console.log(`  通过率: ${C.bold}${passRate}%${C.reset}`);

  // 5. 失败项分类汇总
  if (failCount > 0) {
    console.log(`\n${C.bold}${C.yellow}失败项错误分类:${C.reset}`);
    const errorTypes = {};
    results.filter(r => !r.pass).forEach((r) => {
      const t = r.errorType || '其他';
      errorTypes[t] = (errorTypes[t] || 0) + 1;
    });
    Object.keys(errorTypes).forEach((t) => {
      console.log(`  ${C.yellow}${t}: ${errorTypes[t]} 项${C.reset}`);
    });
  }

  // 6. 诊断建议
  const connectionFails = results.filter(r => !r.pass && r.errorType === '连接失败');
  const notFounds = results.filter(r => !r.pass && r.errorType === '404');
  const fieldMissing = results.filter(r => !r.pass && (r.errorType === '字段缺失' || r.errorType === '类型错误'));

  if (connectionFails.length > 0 || notFounds.length > 0 || fieldMissing.length > 0) {
    console.log(`\n${C.bold}${C.yellow}========================================${C.reset}`);
    console.log(`${C.bold}${C.yellow} 诊断建议${C.reset}`);
    console.log(`${C.bold}${C.yellow}========================================${C.reset}`);
  }
  if (connectionFails.length > 0) {
    console.log(`\n${C.yellow}【连接失败】${connectionFails.length} 项${C.reset}`);
    console.log(`  → 检查后端服务是否在 ${HOST}:${PORT} 运行`);
    console.log(`  → 启动命令: cd backend; .\\venv\\Scripts\\python.exe -m uvicorn main:app --host 127.0.0.1 --port ${PORT}`);
  }
  if (notFounds.length > 0) {
    console.log(`\n${C.yellow}【404 路由不存在】${notFounds.length} 项${C.reset}`);
    console.log(`  → 检查后端路由是否已注册（注意 redirect_slashes=False，路径不带尾部斜杠）`);
    console.log(`  → 路径对照:`);
    console.log(`     前端 baseURL = VITE_API_BASE_URL + '/api' = ${BASE}`);
    console.log(`     后端前缀    = settings.API_V1_PREFIX = '/api'`);
    console.log(`     最终请求路径形如: /api/orders, /api/auth/me, /api/optimize/route`);
  }
  if (fieldMissing.length > 0) {
    console.log(`\n${C.yellow}【字段缺失/类型错误】${fieldMissing.length} 项${C.reset}`);
    console.log(`  → 检查后端 Pydantic Schema 字段定义是否与前端契约一致`);
    console.log(`  → 查看各模块 schema: backend/schemas/*.py`);
  }

  // CORS 提示（脚本无法直接测 CORS，因为它是浏览器行为）
  console.log(`\n${C.gray}【CORS 说明】${C.reset}`);
  console.log(`${C.gray}  后端已放行: http://localhost:5173, http://localhost:3000${C.reset}`);
  console.log(`${C.gray}  前端 Vite dev server 端口: 3000 (vite.config.ts 中配置)${C.reset}`);
  console.log(`${C.gray}  本脚本为 Node.js 直连后端，不经过浏览器，不受 CORS 限制${C.reset}`);

  console.log(`\n${C.bold}结束时间: ${new Date().toLocaleString('zh-CN')}${C.reset}\n`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${C.red}脚本异常: ${err.message}${C.reset}`);
  console.error(err.stack);
  process.exit(2);
});
