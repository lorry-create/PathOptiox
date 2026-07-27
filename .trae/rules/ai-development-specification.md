***

alwaysApply: true
description: PathOptix Dashboard 前端项目面向 AI 代码助手（Trae、Cursor、GitHub Copilot 等）的统一开发规约。本规范定义了前端开发的所有技术标准、架构约束、代码风格和最佳实践。如有冲突，以此文件为准。
version: 1.0.0
lastUpdated: 2026-05-09
project: pathoptix-dashboard-replicant
--------------------------------------

# PathOptix Dashboard 前端 AI 开发规约

> **适用范围**: 本文档为 PathOptix Dashboard 前端项目（React 19 + TypeScript + Vite 6）面向 AI 代码助手的统一开发规约。
>
> **强制级别说明**:
>
> - 🔴 **Must (强制)**: 必须遵守，否则代码无法合并
> - 🟡 **Should (推荐)**: 强烈建议遵守，除非有充分理由
> - 🟢 **May (可选)**: 可根据情况选择是否遵守
>
> **使用场景**: 当 AI 代码助手生成、修改或审查前端代码时，必须严格遵循本规约。

***

## 1. 架构约束

### 1.1 整体架构模式

- **🔴 Must**: 采用**三层组件架构**分层组织:
  ```
  src/
  ├── components/
  │   ├── ui/              # 第1层：原子级UI组件（无业务逻辑）
  │   ├── layout/          # 第2层：布局容器组件（页面骨架）
  │   └── features/        # 第3层：业务特性模块（按领域划分）
  ```
- **🔴 Must**: 严格遵循**单一职责原则**：
  - `ui/` 组件：纯展示，通过Props接收数据，不包含业务逻辑
  - `layout/` 组件：页面布局结构，管理全局状态（侧边栏、头部）
  - `features/` 组件：封装特定业务领域的状态和行为
- **🟡 Should**: 每个特性模块（feature）应该是**自包含的**，可独立开发和测试

**正例**:

```typescript
// ✅ 正确：UI组件只负责展示
// src/components/ui/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string;
  type: 'line' | 'bar' | 'none';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, type }) => (
  <div className="stat-card">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
```

**反例**:

```typescript
// ❌ 错误：UI组件包含API调用逻辑
const StatCard: React.FC = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // ❌ UI组件不应直接调用API
    fetch('/api/stats').then(res => setData(res.data));
  }, []);
  
  return <div>{/* ... */}</div>;
};
```

**AI 提示词模板**:

```
当创建新组件时，请先判断该组件属于哪个层级：
- 如果是纯展示组件（按钮、卡片、输入框等）→ 放在 src/components/ui/
- 如果是布局相关（Header、Sidebar、Layout）→ 放在 src/components/layout/
- 如果是业务功能（订单、用户、设置等）→ 放在 src/components/features/{对应模块}/

确保组件职责单一，不要在UI组件中混入业务逻辑。
```

### 1.2 状态管理策略

- **🔴 Must**: 当前阶段使用**本地状态（useState）+ Props传递**
- **🔴 Must**: 禁止在多个不相关的组件间直接共享复杂状态
- **🟡 Should**: 对于跨组件共享的状态，优先考虑**提升状态到最近的公共父组件**
- **🟢 May**: 未来可引入 Zustand 或 Redux Toolkit（需团队讨论决定）

**正例**:

```typescript
// ✅ 正确：状态提升到需要的最小公共祖先
const OrderManagementView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <>
      <OrderMetrics orders={orders} />
      <OrderMainTable 
        orders={orders} 
        isLoading={isLoading}
        onRefresh={() => fetchOrders()} 
      />
    </>
  );
};
```

**反例**:

```typescript
// ❌ 错误：过度使用localStorage作为全局状态
const SomeComponent = () => {
  const [data, setData] = useState(() => {
    // ❌ 避免频繁读写localStorage
    return JSON.parse(localStorage.getItem('someData') || '[]');
  });
};
```

### 1.3 数据流方向

- **🔴 Must**: 遵循**单向数据流**原则：父 → 子（通过Props）
- **🔴 Must**: 子组件向父组件通信必须通过**回调函数（Callbacks）**
- **🟡 Should**: 避免深层Props drilling，必要时可使用Context API

**正例**:

```typescript
// ✅ 父组件传递数据和回调
<CreateOrderModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onCreated={handleOrderCreated}
/>
```

***

## 2. 技术栈版本

### 2.1 核心依赖版本锁定

- **🔴 Must**: 严格使用以下版本（或兼容的补丁版本升级）：

| 包名             | 版本       | 用途      | 升级策略          |
| -------------- | -------- | ------- | ------------- |
| `react`        | ^19.2.4  | UI框架    | 仅小版本升级        |
| `react-dom`    | ^19.2.4  | DOM渲染   | 同React        |
| `typescript`   | \~5.8.2  | 类型系统    | 锁定次版本         |
| `vite`         | ^6.2.0   | 构建工具    | 可小版本升级        |
| `axios`        | ^1.15.0  | HTTP客户端 | 可小版本升级        |
| `recharts`     | ^3.7.0   | 图表库     | 谨慎升级（API可能变化） |
| `lucide-react` | ^0.563.0 | 图标库     | 可小版本升级        |

- **🔴 Must**: **禁止**降级核心依赖版本
- **🟡 Should**: 升级前必须查阅官方Changelog，评估Breaking Changes

**多源冲突裁决说明**:

- *冲突*: package.json vs 实际安装版本不一致
- *裁决*: 以 `package-lock.json` 为准，执行 `npm ci` 恢复一致
- *冲突*: TypeScript版本与Vite插件版本不兼容
- *裁决*: 使用 Vite 官方推荐的 TypeScript 版本组合

**正例**:

```json
{
  "dependencies": {
    "react": "^19.2.4",
    "typescript": "~5.8.2"
  }
}
```

**反例**:

```json
{
  // ❌ 不要随意更改版本号
  "dependencies": {
    "react": "^18.0.0",  // 降级了！
    "typescript": "^4.9.0" // 大版本跳跃！
  }
}
```

**AI 提示词模板**:

```
在修改 package.json 时：
1. 只能升级到兼容的新版本（遵循semver）
2. 核心依赖（React、TypeScript、Vite）需要特别谨慎
3. 升级后必须运行 npm run build 和 npm run test 确保无破坏性变更
4. 如果不确定某个包的最新稳定版，使用 npm view {package} version 查看
```

### 2.2 开发依赖

- **🔴 Must**: 测试框架使用 Jest 30.x + ts-jest 29.x
- **🔴 Must**: Mock库使用 axios-mock-adapter 2.x
- **🟡 Should**: 未来应添加 ESLint 9.x + Prettier 3.x

***

## 3. 包管理策略

### 3.1 包管理器选择

- **🔴 Must**: 统一使用 **npm** 作为包管理器
- **🔴 Must**: **禁止**混用 yarn / pnpm（避免 lock 文件冲突）

### 3.2 依赖安装规则

- **🔴 Must**: 安装新依赖时明确指定类型：
  ```bash
  # 生产依赖（运行时需要）
  npm install --save package-name

  # 开发依赖（仅开发时需要）
  npm install --save-dev package-name
  ```
- **🔴 Must**: **禁止**直接修改 `package-lock.json`
- **🟡 Should**: 定期执行 `npm audit` 检查安全漏洞
- **🟡 Should**: 每周执行一次 `npm update` 更新补丁版本

**正例**:

```bash
# ✅ 正确的依赖安装流程
npm install --save-dev @types/react  # 类型定义放devDependencies
npm install zustand                  # 运行时依赖放dependencies
npm ci                               # CI/CD环境用ci精确安装
```

**反例**:

```bash
# ❌ 错误做法
npm install package-name             # 未指定--save/--save-dev
yarn add package-name                # 混用了yarn
手动编辑package-lock.json            # 直接修改lock文件
```

**AI 提示词模板**:

```
当需要添加新的npm包时：
1. 先检查项目中是否已有类似功能的包（避免重复）
2. 明确判断是生产依赖还是开发依赖
3. 使用正确的命令安装
4. 安装后在代码中import测试是否能正常工作
5. 更新文档（如有必要）
```

***

## 4. 目录命名与文件组织

### 4.1 强制目录结构

- **🔴 Must**: 必须严格遵守以下目录结构：

```
src/
├── App.tsx                    # 应用根组件
├── main.tsx                   # React入口文件
├── vite-env.d.ts              # Vite类型声明
│
├── components/                # React组件
│   ├── ui/                   # 🎯 原子UI组件（Button, Card, Input等）
│   │   ├── *.tsx
│   │   └── index.ts          # Barrel导出
│   │
│   ├── layout/               # 🎯 布局组件（Header, Sidebar, Layout）
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── index.ts
│   │
│   └── features/             # 🎯 业务特性模块（按领域划分）
│       ├── auth/             # 认证模块
│       ├── dashboard/        # 仪表板
│       ├── orders/           # 订单管理
│       ├── routing/          # 路线优化
│       ├── training/         # 训练优化
│       ├── carbon/           # 碳监测
│       ├── compliance/       # 合规安全
│       ├── customer-service/ # 客户服务
│       └── settings/         # 系统设置
│
├── services/                 # API服务层
│   ├── api/                  # HTTP客户端配置
│   │   ├── axiosInstance.ts
│   │   ├── httpClient.ts
│   │   └── types.ts
│   ├── modules/              # 业务API模块
│   │   ├── auth.ts
│   │   ├── order.ts
│   │   └── chat.ts
│   └── utils/                # 服务层工具函数
│
├── types/                    # TypeScript类型定义
│   ├── global.types.ts       # 全局类型
│   └── index.ts              # 统一导出
│
├── utils/                    # 通用工具函数
│   └── useLoading.ts
│
├── hooks/                    # 自定义Hooks（预留）
├── stores/                   # 状态管理（预留）
├── constants/                # 常量定义（预留）
└── assets/                   # 静态资源（CSS、图片等）
```

### 4.2 文件命名规范

- **🔴 Must**: 文件名采用 **PascalCase**（组件文件）或 **camelCase**（工具文件）
- **🔴 Must**: 组件文件名必须与导出的组件名保持一致
- **🟡 Should**: 目录名采用 **kebab-case** 或 **PascalCase**（保持一致性）

**正例**:

```
✅ src/components/ui/StatCard.tsx          // 导出 StatCard 组件
✅ src/services/modules/auth.ts             // 认证API模块
✅ src/components/features/orders/CreateOrderModal.tsx  // 创建订单模态框
✅ src/types/global.types.ts               // 全局类型定义
```

**反例**:

```
❌ src/components/ui/statcard.tsx           // 应为 PascalCase
❌ src/components/Features/Auth/login.tsx  // 大小写混乱
❌ src/components/order-management-view.tsx // 过长，应放在子目录
```

**AI 提示词模板**:

```
创建新文件时：
1. 判断文件类型：
   - React组件 → PascalCase.tsx（如 UserProfile.tsx）
   - 工具函数/模块 → camelCase.ts（如 formatDate.ts）
   - 类型定义 → *.types.ts 或 index.ts
   
2. 放置到正确的目录：
   - 通用UI → components/ui/
   - 业务页面 → components/features/{模块名}/
   - API服务 → services/modules/
   - 类型定义 → types/

3. 确保文件名清晰表达其用途，避免模糊命名（如 utils.ts, helper.ts）
```

### 4.3 路径别名使用

- **🔴 Must**: 使用路径别名代替相对路径导入：

| 别名             | 指向路径                         | 使用场景      |
| -------------- | ---------------------------- | --------- |
| `@/`           | `./src/`                     | 通用别名      |
| `@components/` | `./src/components/`          | 导入组件      |
| `@features/`   | `./src/components/features/` | 导入业务模块    |
| `@ui/`         | `./src/components/ui/`       | 导入UI基础组件  |
| `@layout/`     | `./src/components/layout/`   | 导入布局组件    |
| `@services/`   | `./src/services/`            | 导入服务层     |
| `@hooks/`      | `./src/hooks/`               | 导入自定义Hook |
| `@types/`      | `./src/types/`               | 导入类型定义    |
| `@utils/`      | `./src/utils/`               | 导入工具函数    |
| `@assets/`     | `./src/assets/`              | 导入静态资源    |

**正例**:

```typescript
// ✅ 使用路径别名
import StatCard from '@ui/StatCard';
import Header from '@layout/Header';
import { authApi } from '@services';
import type { Order } from '@types';
```

**反例**:

```typescript
// ❌ 使用相对路径（特别是深层嵌套时）
import StatCard from '../../../../components/ui/StatCard';
import Header from '../../../components/layout/Header';
```

**AI 提示词模板**:

```
在编写import语句时：
1. 优先使用路径别名（@/,@ui/,@features/等）
2. 只有同目录下的文件才使用相对路径（./或../）
3. 避免超过2层的相对路径（如 ../../../）
4. IDE会自动提示可用的别名，善用自动补全
```

***

## 5. 代码风格

### 5.1 TypeScript 规范

#### 5.1.1 类型定义

- **🔴 Must**: 所有组件必须显式定义 **Props 接口**
- **🔴 Must**: **禁止**使用 `any` 类型（特殊情况需注释说明原因）
- **🔴 Must**: 优先使用 **interface** 而非 **type** 定义对象结构
- **🟡 Should**: 为回调函数定义明确的类型签名

**正例**:

```typescript
// ✅ 正确：完整的类型定义
interface LoginViewProps {
  onLogin: () => void;
  initialUsername?: string;
}

interface Order {
  id: string;
  customerName: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: Date;
}

type StatusColor = 'success' | 'warning' | 'error' | 'info';

const LoginView: React.FC<LoginViewProps> = ({ onLogin, initialUsername }) => {
  // ...
};
```

**反例**:

```typescript
// ❌ 错误：缺少类型定义
const LoginView = (props) => {  // 缺少Props接口
  const [data, setData] = useState<any>([]);  // 使用any
  // ...
};

// ❌ 错误：滥用type
type LoginViewProps = {  // 对象结构应用interface
  onLogin: () => void;
};
```

#### 5.1.2 组件声明风格

- **🔴 Must**: 使用 **函数式组件 + React.FC** 泛型声明
- **🔴 Must**: 使用 **箭头函数表达式**
- **🟡 Should**: 组件名使用 **PascalCase**

**正例**:

```typescript
// ✅ 标准 React 组件模板
interface ComponentNameProps {
  // props定义
}

const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 }) => {
  // 组件逻辑
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

**反例**:

```typescript
// ❌ 不推荐：类组件（除非特殊需求）
class ComponentName extends React.Component {
  render() { return <div />; }
}

// ❌ 不推荐：未使用React.FC
function ComponentName(props) {
  return <div />;
}
```

#### 5.1.3 Hooks 使用规范

- **🔴 Must**: Hooks 只能在**函数组件顶层**调用
- **🔴 Must**: 自定义Hook名称必须以 **use** 开头
- **🟡 Should**: 复杂的状态逻辑抽取为自定义Hook
- **🟢 May**: 使用 useMemo/useCallback 优化性能（针对昂贵计算）

**正例**:

```typescript
// ✅ 正确：自定义Hook示例
// src/hooks/useOrderManagement.ts
export function useOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (filters?: OrderFilters) => {
    setIsLoading(true);
    try {
      const data = await orderApi.getOrders(filters);
      setOrders(data.orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { orders, isLoading, error, fetchOrders };
}
```

**反例**:

```typescript
// ❌ 错误：条件性地调用Hook
const MyComponent = (shouldFetch) => {
  if (shouldFetch) {
    const [data, setData] = useState([]);  // ❌ Hook在条件内调用
  }
};

// ❌ 错误：非函数组件中调用Hook
function regularFunction() {
  const [state, setState] = useState();  // ❌ 不能在普通函数中使用
}
```

### 5.2 CSS / 样式规范

#### 5.2.1 Tailwind CSS 使用

- **🔴 Must**: 优先使用 **Tailwind CSS 工具类**进行样式编写
- **🔴 Must**: **禁止**在JSX中编写传统的 `<style>` 对象（除非动态样式必需）
- **🟡 Should**: 复用的样式组合提取为 **组件类** 或 **CSS变量**
- **🟢 May**: 复杂动画可在 `index.html` 中定义全局CSS类

**正例**:

```tsx
// ✅ 正确：使用Tailwind工具类
<div className="bg-[#151B28] rounded-xl p-5 border border-slate-800/50 hover:border-slate-700 transition-all">
  <span className="text-slate-400 text-xs font-medium">Label</span>
</div>

// ✅ 正确：动态样式使用style（仅当Tailwind无法满足时）
<div style={{ backgroundImage: bgUrl ? `url('${bgUrl}')` : undefined }}>
```

**反例**:

```tsx
// ❌ 错误：使用style对象编写静态样式
<div style={{
  backgroundColor: '#151B28',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid rgba(51, 65, 85, 0.5)'
}}>
```

#### 5.2.2 Design Tokens（设计令牌）

- **🔴 Must**: 使用项目定义的设计令牌（颜色、间距、圆角等）

**项目 Design Tokens**:

```typescript
// 颜色系统
colors: {
  background: {
    main: '#05080F',      // 主背景色
    card: '#151B28',      // 卡片背景
    elevated: '#1c2127',  // 输入框背景
  },
  text: {
    primary: '#ffffff',   // 主文本
    secondary: '#9dabb9', // 次要文本
    muted: '#64748b',     // 弱化文本
  },
  brand: {
    primary: '#137fec',   // 主品牌色（蓝色）
    success: '#10b981',   // 成功状态
    warning: '#f59e0b',   // 警告状态
    error: '#ef4444',     // 错误状态
  },
}

// 间距系统（基于4px网格）
spacing: {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
}

// 圆角
borderRadius: {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
}
```

**AI 提示词模板**:

```
在编写样式时：
1. 优先查找是否有现成的Tailwind类可用
2. 使用项目Design Tokens中的颜色值（如bg-[#05080F], text-[#137fec]）
3. 保持视觉一致性，不要随意创造新的颜色值
4. 响应式设计使用Tailwind断点：sm(640px), md(768px), lg(1024px), xl(1280px)
5. 动画效果使用已有的animate-in, fade-in, slide-in等类
```

### 5.3 命名约定

#### 5.3.1 变量和函数命名

- **🔴 Must**: 变量和函数使用 **camelCase**
- **🔴 Must**: 常量使用 **UPPER\_SNAKE\_CASE**
- **🔴 Must**: 布尔变量以 **is/has/can/should** 开头
- **🟡 Should**: 函数名使用动词开头（get/fetch/handle/render）

**正例**:

```typescript
// ✅ 变量命名
const userName = '';
const isActive = true;
const MAX_RETRY_COUNT = 3;

// ✅ 函数命名
const handleLogin = async () => {};
const fetchOrders = async () => {};
const formatCurrency = (amount: number) => {};
const renderTableRows = () => {};
```

**反例**:

```typescript
// ❌ 错误命名
const username = '';           // 应为userName
const active = true;           // 应为isActive
const maxretrycount = 3;       // 应为MAX_RETRY_COUNT
const login = () => {};        // 应为handleLogin
const data = () => {};         // 太模糊，应为fetchData/getData
```

#### 5.3.2 事件处理函数命名

- **🔴 Must**: 事件处理函数统一使用 **handle** 前缀
- **🔴 Must**: 回调函数使用 **on** 前缀（Props中）

**正例**:

```tsx
// ✅ 事件处理
const handleSubmit = (e: React.FormEvent) => {};
const handleClick = () => {};
const handleInputChange = (value: string) => {};

// ✅ 回调Props
<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)} 
  onConfirm={handleConfirm} 
/>
```

***

## 6. 接口规范（API Layer）

### 6.1 HTTP 客户端使用

- **🔴 Must**: 所有API请求必须通过 **HttpClient 实例** (`src/services/api/httpClient.ts`)
- **🔴 Must**: **禁止**直接使用原生 `fetch` 或裸 `axios` 调用
- **🔴 Must**: API模块统一放在 `src/services/modules/` 目录下

**正例**:

```typescript
// ✅ 正确：使用封装的httpClient
// src/services/modules/order.ts
import { httpClient } from '../api/httpClient';

export const orderApi = {
  getOrders: (filters?: OrderFilters) => {
    return httpClient.get<OrderListResponse>('/orders', {
      params: filters,
      showLoading: false,
      retry: 2,
    });
  },
};
```

**反例**:

```typescript
// ❌ 错误：直接使用axios
import axios from 'axios';

const fetchData = async () => {
  const res = await axios.get('/api/data');  // ❌ 绕过了封装层
  return res.data;
};
```

### 6.2 API 模块结构

每个业务API模块应遵循统一的结构：

```typescript
// src/services/modules/{moduleName}.ts

// 1. 导入httpClient
import { httpClient } from '../api/httpClient';

// 2. 定义接口请求/响应类型
export interface XxxRequest {
  // 请求参数
}

export interface XxxResponse {
  // 响应数据
}

// 3. 导出API对象
export const xxxApi = {
  // CRUD方法
  getXxxList: (params?) => httpClient.get<XxxResponse[]>('/xxx', { params }),
  getXxxById: (id) => httpClient.get<XxxResponse>(`/xxx/${id}`),
  createXxx: (data) => httpClient.post<XxxResponse>('/xxx', data),
  updateXxx: (id, data) => httpClient.put<XxxResponse>(`/xxx/${id}`, data),
  deleteXxx: (id) => httpClient.delete(`/xxx/${id}`),
};
```

### 6.3 错误处理

- **🔴 Must**: 所有API调用必须使用 **try/catch** 包裹
- **🔴 Must**: **禁止**吞掉错误（空的catch块）
- **🟡 Should**: 向用户显示友好的错误消息
- **🟡 Should**: 错误信息记录到控制台（用于调试，但生产环境应移除）

**正例**:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');

  try {
    const response = await authApi.login({ username, password });
    localStorage.setItem('access_token', response.access_token);
    onLogin();
  } catch (err: unknown) {
    // ✅ 正确处理错误
    const error = err as { message?: string };
    setError(error.message || '登录失败，请重试。');
  } finally {
    setIsLoading(false);
  }
};
```

**反例**:

```typescript
try {
  await api.call();
} catch (e) {
  // ❌ 吞掉错误
}

// ❌ 或者更差：完全不加try-catch
const data = await api.call();  // 可能导致未处理的Promise rejection
```

**AI 提示词模板**:

```
当编写API调用代码时：
1. 从对应的services/modules/{module}.ts导入API方法
2. 使用async/await语法
3. 用try-catch包裹，catch中设置错误状态
4. 使用finally重置loading状态
5. 错误消息要对用户友好（中文），技术细节可console.error输出
6. 不要在UI组件中硬编码API URL
```

***

## 7. 数据验证规约

### 7.1 表单验证

- **🔴 Must**: 所有用户输入必须进行**客户端验证**
- **🔴 Must**: 敏感操作（删除、提交）需要**二次确认**
- **🟡 Should**: 使用HTML5原生验证属性（required, pattern, minLength等）
- **🟢 May**: 复杂验证可引入第三方库（如 react-hook-form + zod）

**正例**:

```tsx
<form onSubmit={handleSubmit}>
  {/* ✅ HTML5验证 */}
  <input
    type="text"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    required
    minLength={3}
    placeholder="请输入用户名"
  />
  
  {/* ✅ 提交按钮禁用状态 */}
  <button 
    type="submit" 
    disabled={isLoading || !username || !password}
  >
    {isLoading ? '提交中...' : '立即登录'}
  </button>
</form>

{/* ✅ 危险操作确认 */}
<button 
  onClick={() => {
    if (window.confirm('确定要删除此订单吗？此操作不可撤销。')) {
      handleDelete(order.id);
    }
  }}
>
  删除订单
</button>
```

### 7.2 类型守卫

- **🔴 Must**: 处理外部数据时使用**类型守卫**确保类型安全
- **🟡 Should**: 为API响应定义严格的TypeScript接口

**正例**:

```typescript
// ✅ 类型守卫示例
function isOrder(data: unknown): data is Order {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'customerName' in data
  );
}

// 使用
const response = await orderApi.getOrderById(id);
if (isOrder(response)) {
  // TypeScript知道response的类型是Order
  console.log(response.customerName);
}
```

***

## 8. 测试策略

### 8.1 测试分类

- **🔴 Must**: 采用**三层测试金字塔**：

| 层级        | 工具                     | 覆盖目标           | 示例           |
| --------- | ---------------------- | -------------- | ------------ |
| **单元测试**  | Jest                   | 工具函数、纯组件、API模块 | auth.test.ts |
| **集成测试**  | Jest + Testing Library | 组件交互、API调用流程   | （待补充）        |
| **E2E测试** | Playwright/Cypress     | 完整用户流程         | （未来计划）       |

### 8.2 单元测试规范

- **🔴 Must**: 测试文件放在 `__tests__/` 目录下，与被测文件同级
- **🔴 Must**: 测试文件命名为 `{fileName}.test.ts`
- **🔴 Must**: 使用 **describe/it** 组织测试用例
- **🟡 Should**: 每个 it() 只测试一个行为点
- **🟡 Should**: 测试描述使用 **should...** 格式（BDD风格）

**正例**:

```typescript
// src/services/__tests__/auth.test.ts
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { authApi } from '../modules/auth';

const mock = new MockAdapter(axios, { delayResponse: 10 });

describe('authApi', () => {
  beforeEach(() => {
    mock.reset();
    localStorage.removeItem('access_token');
  });

  afterAll(() => {
    mock.restore();
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      // Arrange
      const responseData = { access_token: 'test_token_123' };
      mock.onPost('/api/auth/login').reply(200, responseData);

      // Act
      const result = await authApi.login({ username: 'testuser', password: 'password123' });

      // Assert
      expect(result.access_token).toBe('test_token_123');
    });

    it('should store token in localStorage on successful login', async () => {
      // Arrange
      const responseData = { access_token: 'stored_token' };
      mock.onPost('/api/auth/login').reply(200, responseData);

      // Act
      await authApi.login({ username: 'test', password: 'test' });

      // Assert
      expect(localStorage.getItem('access_token')).toBe('stored_token');
    });
  });
});
```

**AI 提示词模板**:

```
当编写单元测试时：
1. 遵循 AAA模式：Arrange（准备）→ Act（执行）→ Assert（断言）
2. 使用describe分组相关测试，it描述单个行为
3. 在beforeEach中重置状态，afterAll中清理资源
4. Mock外部依赖（API、localStorage等）
5. 测试正常流程和异常情况（happy path + edge cases）
6. 保持测试独立性，不依赖执行顺序
```

### 8.3 测试覆盖率目标

- **🔴 Must**: 核心业务逻辑（API层、认证）覆盖率 ≥ 80%
- **🟡 Should**: 工具函数覆盖率 ≥ 90%
- **🟢 May**: UI组件覆盖率 ≥ 60%（纯展示组件优先级低）

运行覆盖率报告：

```bash
npm run test:coverage
```

***

## 9. 日志规约

### 9.1 Console 使用规范

- **🔴 Must**: **禁止在生产代码中使用** **`console.log`**
- **🔴 Must**: 仅允许使用 `console.error` 用于**异常捕获**场景
- **🟡 Should**: 开发调试完成后移除所有 console 语句
- **🟢 May**: 可使用条件编译保留调试日志：

```typescript
// ✅ 条件日志（仅在开发环境生效）
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}

// ✅ 异常日志（可保留）
catch (error) {
  console.error('API调用失败:', error);
  showErrorToast(error.message);
}
```

**正例**:

```typescript
// ✅ 正确：异常捕获时使用console.error
try {
  await orderApi.deleteOrder(id);
} catch (error) {
  console.error('Error deleting order:', error);  // 允许：异常日志
  showToast({ type: 'error', message: '删除失败，请重试' });  // 用户反馈
}
```

**反例**:

```typescript
// ❌ 错误：调试日志遗留
useEffect(() => {
  const loadBackground = async () => {
    const url = await authApi.getLoginBackground();
    console.log("图片地址 =====> ", url);  // ❌ 应删除
    setBgUrl(url);
  };
  loadBackground();
}, []);
```

**AI 提示词模板**:

```
当代码中需要调试输出时：
1. 优先使用浏览器DevTools断点调试，而非console.log
2. 如果必须使用日志，使用条件编译：
   if (import.meta.env.DEV) { console.log(...); }
3. 异常捕获时可使用console.error，但必须配合用户友好的错误提示
4. 提交代码前，搜索并移除所有不必要的console语句
```

***

## 10. 安全规约

### 10.1 数据安全

- **🔴 Must**: **禁止**在前端代码中硬编码敏感信息（密码、Token、API Key）
- **🔴 Must**: Token 等认证信息存储在 **localStorage** 中（当前方案）
- **🔴 Must**: 用户登出时必须清除所有认证信息
- **🟡 Should**: 敏感操作需要二次验证（密码确认、CAPTCHA等）

**正例**:

```typescript
// ✅ 正确：环境变量读取配置
const apiKey = import.meta.env.VITE_API_KEY;

// ✅ 正确：登出时清除token
const handleLogout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('isLoggedIn');
  setIsAuthenticated(false);
};
```

**反例**:

```typescript
// ❌ 错误：硬编码敏感信息
const API_KEY = 'sk-xxxxxxxxxxxx';  // ❌ 绝对禁止！

// ❌ 错误：Mock登录逻辑遗留
if (username === 'lorry' && password === '123456') {
  localStorage.setItem('access_token', 'mock_token');  // ❌ 后门账号
  onLogin();
}
```

### 10.2 XSS 防护

- **🔴 Must**: 用户输入渲染前必须**转义**（React默认转义JSX中的变量）
- **🔴 Must**: **禁止**使用 `dangerouslySetInnerHTML`（除非绝对必要且内容可信）
- **🟡 Should**: 使用DOMPurify等库处理富文本输入

**正例**:

```tsx
// ✅ 安全：React自动转义
<p>{userInput}</p>

// ⚠️ 谨慎：如果必须使用dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
```

***

## 11. 性能规约

### 11.1 组件优化

- **🟡 Should**: 使用 **React.memo** 包装纯展示组件，避免不必要的重渲染
- **🟡 Should**: 使用 **useMemo** 缓存昂贵的计算结果
- **🟡 Should**: 使用 **useCallback** 缓存回调函数（传递给子组件时）
- **🟢 May**: 对于大型列表，考虑使用**虚拟滚动**（react-window）

**正例**:

```typescript
// ✅ 优化：使用memo和useMemo
const StatCard: React.FC<StatCardProps> = React.memo(({ label, value, type }) => {
  const chartData = useMemo(() => 
    Array.from({ length: 10 }, (_, i) => ({ value: 20 + Math.random() * 80 }))
  , []);  // 空依赖，只在首次渲染时计算

  return (<div>{/* ... */}</div>);
});
```

### 11.2 图片和资源优化

- **🔴 Must**: 图片使用**懒加载**（loading="lazy"）
- **🟡 Should**: 使用现代图片格式（WebP, AVIF）
- **🟡 Should**: 大图使用**CDN**或**对象存储**

**正例**:

```tsx
<img 
  src={imageUrl} 
  alt="描述文字" 
  loading="lazy" 
  decoding="async"
/>
```

### 11.3 Bundle 体积优化

- **🟡 Should**: 第三方库按需导入（Tree Shaking）
- **🟡 Should**: 路由级代码分割（React.lazy + Suspense）
- **🔴 Must**: 生产构建后检查包体积（目标：<500KB gzipped）

**正例**:

```typescript
// ✅ 按需导入图标
import { Search, Filter } from 'lucide-react';  // 只导入使用的图标

// ✅ 代码分割
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<div>Loading...</div>}>
  <HeavyComponent />
</Suspense>
```

***

## 12. 部署规约

### 12.1 构建流程

- **🔴 Must**: 使用 **npm run build** 进行生产构建
- **🔴 Must**: 构建产物输出到 `dist/` 目录
- **🟡 Should**: 构建前运行 lint 和 test
- **🟢 May**: 使用 CI/CD 自动化部署

**构建命令**:

```bash
# 开发环境
npm run dev          # 启动开发服务器（端口3000）

# 生产构建
npm run build        # 构建（输出到dist/）
npm run preview      # 预览生产构建结果

# 测试
npm run test         # 运行测试
npm run test:watch   # 监听模式
npm run test:coverage # 生成覆盖率报告
```

### 12.2 环境变量

- **🔴 Must**: 环境变量使用 **VITE\_** 前缀（Vite规范）
- **🔴 Must**: 敏感配置放入 `.env` 文件（不入库）
- **🔴 Must**: 不同环境使用不同配置文件：

| 文件                 | 用途         | 是否提交Git    |
| ------------------ | ---------- | ---------- |
| `.env`             | 默认变量（所有环境） | ❌ 否        |
| `.env.development` | 开发环境       | ✅ 是（无敏感信息） |
| `.env.production`  | 生产环境       | ✅ 是（无敏感信息） |

**正例**:

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8010

# .env.production
VITE_API_BASE_URL=/api  # 使用相对路径，部署时由Nginx代理
```

**反例**:

```bash
# ❌ 错误：暴露真实IP地址
VITE_API_BASE_URL=http://81.71.129.36:8010  # 不要提交到仓库！
```

**AI 提示词模板**:

```
当需要添加新的环境变量时：
1. 变量名必须以 VITE_ 开头（如 VITE_API_KEY, VITE_APP_TITLE）
2. 在代码中使用 import.meta.env.VITE_XXX 读取
3. 将默认值和非敏感值放入 .env.development / .env.production
4. 敏感值（密钥、密码）放入 .env 并添加到 .gitignore
5. 在 vite.config.ts 的 define 中映射到 process.env（如需兼容旧代码）
```

***

## 13. Git 工作流规约

### 13.1 分支策略

- **🔴 Must**: 使用 **Git Flow** 或简化版分支模型：

| 分支名         | 用途     | 来源      |
| ----------- | ------ | ------- |
| `main`      | 生产代码   | -       |
| `develop`   | 开发集成分支 | main    |
| `feature/*` | 新功能开发  | develop |
| `bugfix/*`  | Bug修复  | develop |
| `hotfix/*`  | 紧急生产修复 | main    |

### 13.2 Commit Message 规范

- **🔴 Must**: 使用\*\*约定式提交（Conventional Commits）\*\*格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:

- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（既不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链变更

**正例**:

```
feat(auth): 添加记住我功能

- 新增remember-me复选框
- 使用localStorage持久化登录状态
- 设置7天过期时间

Closes #123
```

**反例**:

```
❌ 修改了登录页面
❌ fix bug
❌ update
❌ 啥都改了
```

**AI 提示词模板**:

```
生成commit message时：
1. 使用英文（国际惯例），格式：type(scope): subject
2. subject不超过50字符，使用祈使语气
3. body（可选）详细说明改动内容和原因
4. 关联issue编号（如有）
5. type范围：feat/fix/docs/style/refactor/perf/test/chore
```

### 13.3 Code Review 门禁

- **🔴 Must**: PR必须至少 **1人审核** 后才能合并
- **🔴 Must**: 所有测试必须**通过**（CI检查）
- **🔴 Must**: **零TypeScript编译错误**
- **🟡 Should**: 代码覆盖率不能**下降**
- **🟡 Should**: Reviewer应在 **24小时内** 响应

**Checklist**:

- [ ] 代码符合本规约要求
- [ ] 无console.log残留
- [ ] 无any类型（或有注释说明）
- [ ] 新增代码有对应测试
- [ ] 无敏感信息泄露
- [ ] Commit message规范

***

## 14. 监控与错误追踪（预留）

> **注意**: 当前项目未集成监控系统，为未来扩展预留规范。

- **🟢 May**: 前端错误监控推荐 **Sentry**
- **🟢 May**: 性能监控推荐 **Web Vitals**
- **🟢 May**: 用户行为分析推荐 **Mixpanel/Analytics**

***

## 16. AI 记忆与交接规约

### 16.1 项目上下文摘要

**重要**: 当 AI 助手开始工作时，应首先理解以下上下文：

```
项目名称: PathOptix Dashboard (pathoptix-dashboard-replicant)
技术栈: React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS
架构模式: 三层组件架构 (ui → layout → features)
状态管理: useState + Props传递（当前阶段）
API层: 封装的HttpClient实例（src/services/api/httpClient.ts）
路由: 手动switch-case（待重构为React Router）
测试: Jest + ts-jest（覆盖率目标≥80%）
样式: Tailwind CSS工具类为主，少量全局CSS
包管理: npm（严禁混用yarn/pnpm）
路径别名: @/, @ui/, @features/, @services/, @types/ 等
```


**强制 Must**: 每次完成特定业务模块的开发、重构或复杂 Debug 后，AI 助手**必须**在 `docs/` 目录下的对应模块子目录中（如 `docs/auth/handover.md`）生成或更新**模块交接文档**。


**强制 Must**: 交接文档内容必须包含：当前已实现的核心功能清单、未完成的 Todo 事项、关键技术决策说明、以及下一步开发的建议上下文，以便在下一次开启全新对话时，新的 AI 助手能快速恢复上下文。

**正例**: 在完成登录模块重构后，主动更新 `docs/auth/handover.md`，记录 JWT 过期时间的配置位置和当前的 RBAC 进度。

**反例**: 完成了大量修改后直接结束对话，导致下一次对话中 AI 助手丢失对刚完成工作的上下文感知。
**AI 提示词模板**: `请根据刚才完成的 [模块名] 开发工作，在 docs/[模块名]/ 目录下生成/更新一份 handover.md 交接文档，记录当前进度、关键设计和待办事项。`

### 16.2 代码修改禁忌

- **🔴 Must**: **禁止**引入新的 `any` 类型（除非有充分理由）
- **🔴 Must**: **禁止**绕过 HttpClient 直接调用API
- **🔴 Must**: **禁止**在组件中混入业务逻辑（UI组件应保持纯净）
- **🟡 Should**: **避免**增加组件间的耦合度
- **🟡 Should**: **避免**复制粘贴代码（抽取为公共组件/Hook）

### 16.3 常见任务模板

**任务1: 创建新组件**

```
1. 判断组件所属层级（ui/layout/features）
2. 创建文件：src/components/{layer}/{ComponentName}.tsx
3. 定义Props接口（使用interface）
4. 编写组件逻辑（函数式组件 + React.FC）
5. 如是UI组件，添加到 src/components/ui/index.ts barrel导出
6. 编写基本单元测试（如适用）
```

**任务2: 添加新API模块**

```
1. 在 src/services/modules/ 下创建 {module}.ts
2. 定义Request/Response接口
3. 导出API对象（使用httpClient）
4. 在使用该API的组件中导入并调用
5. 添加错误处理（try-catch + 用户提示）
6. 为关键API编写测试用例
```

**任务3: 修复Bug**

```
1. 定位Bug位置和相关文件
2. 分析根因（而非只修症状）
3. 编写复现步骤（用于回归测试）
4. 实施修复（遵循最小改动原则）
5. 添加/更新测试用例覆盖该Bug
6. 清理调试代码（console.log等）
7. 提交时使用fix(type):格式
```

***

## 17. 依赖升级策略

### 17.1 升级流程

- **🔴 Must**: 升级前必须**备份当前工作版本**（git tag）
- **🔴 Must**: 升级后运行**全量测试**（npm run test）
- **🔴 Must**: 升级后执行**生产构建**（npm run build）确认无报错
- **🟡 Should**: 次版本升级（minor）可较宽松，主版本升级（major）需严格评估

**升级检查清单**:

```bash
# 1. 查看当前版本
npm list {package-name}

# 2. 查看最新版本
npm view {package-name} version

# 3. 执行升级
npm install {package-name}@{new-version}

# 4. 验证
npm run build
npm run test

# 5. 如有问题回滚
npm install {package-name}@{old-version}
```

### 17.2 安全漏洞修复

- **🔴 Must**: 当 `npm audit` 报告 **High/Critical** 漏洞时，**必须**在 **3个工作日内**修复
- **🟡 Should**: 定期（每周）执行 `npm audit` 检查
- **🟢 May**: 使用 `npm audit fix` 自动修复（需人工review改动）

***

## 18. 文档维护规约

### 18.1 代码注释

- **🔴 Must**: 公共API（组件Props、导出函数）必须有 **JSDoc 注释**
- **🟡 Should**: 复杂算法逻辑应有**行内注释**解释思路
- **🟢 May**: 简单明了的代码无需注释（代码即文档）

**正例**:

```typescript
/**
 * 订单管理视图组件
 * @description 提供订单列表展示、创建、编辑、删除等功能
 * @param onViewChange - 视图切换回调（用于导航到其他页面）
 */
const OrderManagementView: React.FC<{ onViewChange?: (view: string) => void }> = ({ onViewChange }) => {
  // ...
};
```

### 18.2 README 和文档更新

- **🔴 Must**: **重大功能变更**时必须更新 README.md
- **🟡 Should**: API接口变更时更新接口文档
- **🟢 May**: 小型bugfix可不更新文档

***

## 19. 附录：快速参考卡片

### 19.1 常用命令速查

```bash
# 开发
npm run dev              # 启动开发服务器 :3000
npm run build            # 生产构建 → dist/
npm run preview          # 预览构建结果

# 测试
npm run test             # 运行所有测试
npm run test:watch       # 监听模式
npm run test:coverage    # 覆盖率报告

# 代码质量（未来添加）
npm run lint             # ESLint检查
npm run format           # Prettier格式化

# 其他
npm outdated             # 检查过时的依赖
npm audit                # 安全漏洞扫描
```

### 19.2 文件模板速查

**React组件模板**:

```typescript
import React from 'react';

interface ComponentNameProps {
  // 定义props
}

const ComponentName: React.FC<ComponentNameProps> = (props) => {
  // 逻辑
  
  return (
    <div className="">
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

**API模块模板**:

```typescript
import { httpClient } from '../api/httpClient';

export interface XxxRequest { /* ... */ }
export interface XxxResponse { /* ... */ }

export const xxxApi = {
  getXxx: () => httpClient.get<XxxResponse[]>('/xxx'),
  // ...
};
```

**测试文件模板**:

```typescript
import { xxxApi } from '../modules/xxx';

describe('xxxApi', () => {
  beforeEach(() => { /* 重置 */ });
  
  describe('method name', () => {
    it('should do something', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

***

## 20. 版本历史与更新记录

| 版本     | 日期         | 作者           | 主要变更                  |
| ------ | ---------- | ------------ | --------------------- |
| v1.0.0 | 2026-05-09 | AI Architect | 初始版本，基于项目实际代码审查制定全部规约 |

***

## 21. 反馈与改进

本规约是**活文档**，应根据项目发展持续完善。

<br />

***

> **致谢**: 本规约基于 PathOptix Dashboard 项目实际代码审查结果制定，融合了 React 官方最佳实践、Airbnb JavaScript Style Guide、以及团队的开发经验总结。旨在为 AI 代码助手提供清晰、可执行的指导，提升代码质量和团队协作效率。

