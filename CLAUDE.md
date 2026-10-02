# CLAUDE.md

本文件为 Claude Code 在此仓库工作时提供的指引。内容严格基于仓库实际文件。

## 项目目的

**康源智慧人资平台（Smart HR Platform）**：康源集团（养老服务集团）的考勤 + 薪酬核算自动化 MVP。
核心设计思想是「**规则即数据**」——考勤与薪酬规则存储在 SQLite 数据库中、可在后台可视化编辑，
改规则不需要改代码。每条规则带 `legal_basis` 字段溯源到制度条款（如「康源发〔2024〕06号 第三节第一条」），
薪酬计算保留逐步审计轨迹（`salary_records.audit_trail` + `audit_trail` 表）。

> 定位（README 明示）：成品 MVP，逻辑与界面完整，但**未在生产环境跑过真实数据**；
> 员工与薪资是 `server/seed.js` 生成的模拟数据，组织架构（4 个主体、8 个分支、8 个部门）是真实的。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + recharts + lucide-react |
| 后端 | Node.js（ESM，`"type": "module"`）+ Express + better-sqlite3（WAL 模式） |
| 部署 | 多阶段 Dockerfile（node:22-alpine）/ Railway / Render 配置就绪 |

依赖见 `package.json`：better-sqlite3、concurrently、cors、express、nanoid。

## 目录结构

```
D:/smart-hr-platform/
├── index.html / vite.config.ts / tailwind.config.js / postcss.config.js / tsconfig.json
├── package.json / package-lock.json
├── server/
│   ├── index.js                # Express 入口：/api 路由 + 静态 dist 托管（SPA 回退），首次启动自动播种
│   ├── db.js                   # SQLite 连接 + 建表（employees/attendance_records/leave_records/salary_records/rules/audit_trail/system_config）
│   ├── rules.js                # 规则定义库（58 条规则 + TAX_BRACKETS/MONTHLY_WORKING_DAYS/MIN_WAGE_MONTHLY 常量）
│   ├── seed.js                 # 模拟员工数据生成器
│   ├── routes/index.js         # 全部 REST 路由（员工/考勤/薪酬/规则/看板）
│   └── services/
│       ├── rule-engine.js      # 规则加载/同步、个税累计预扣法、应出勤天数、季节判断
│       ├── attendance.js       # 模拟打卡生成 + 考勤判定（processAttendance）
│       └── salary.js           # 薪酬计算：12 步公式链，逐步写 auditSteps
├── src/
│   ├── main.tsx / App.tsx      # App.tsx 用手写 state 切页（非 react-router），侧边栏 + 月份选择器
│   ├── pages/                  # Dashboard / Attendance / Salary / Employees / Payslip / Rules
│   └── modules/attendance/
│       ├── edu_overtime_engine.js   # 教育系统加班独立引擎（1.5/2.0/3.0 倍率，教育岗标签）
│       └── test_edu_overtime.js     # 手工验证脚本（非 npm test）
├── docs/
│   ├── 康源智慧人资平台-使用手册.md
│   └── architecture.{png,html,json}
├── Dockerfile / .dockerignore / railway.json / render.yaml / start.bat
└── hr_platform_v2.db          # 运行时生成，gitignore 忽略
```

## 安装 / 构建 / 运行 / 测试

```bash
npm install

# 开发：前后端两个终端
node server/index.js    # 后端 API，:3001
npm run dev:client      # Vite 前端，:5173（/api 已代理到 :3001）
# 或一键：npm run dev（concurrently 同时起两端）

# 重新生成种子数据
npm run seed

# 生产构建 + 单进程运行（Express 托管 dist）
npm run build && npm start
```

- **首次启动行为**：`server/index.js` 依次执行 `initDB()` → `syncRules()`（DB 规则表为空时才从 `rules.js` 导入）→ 检查 `employees` 表为空则动态 `import('./seed.js')` 自动播种。
- **Docker**：`docker build -t smart-hr . && docker run -p 3001:3001 smart-hr`。多阶段构建需 `npm rebuild better-sqlite3`（原生模块，alpine 下要 gcc/g++/make/python3）。
- **本机一键**：`start.bat`（注意：脚本内路径硬编码为 `C:\Users\intpj\WorkBuddy\...\smart-hr-platform` 和 `C:\Users\intpj\.workbuddy\binaries\node\...\node.exe`，换机器需改路径）。
- **测试**：**没有 npm 测试命令、没有单元测试**（README「已知边界」第 3 条）。仅 `src/modules/attendance/test_edu_overtime.js` 手工脚本可跑：`node src/modules/attendance/test_edu_overtime.js`。

## 关键约定与坑点

1. **规则同步是单向的：DB 优先**。`syncRules()` 只在 `rules` 表为空时从 `server/rules.js` 导入；
   之后以 DB 为准。改 `rules.js` 后必须调 `POST /api/rules/sync-force`（`forceResyncRules()` 全量覆盖 DB）
   或直接删 `hr_platform_v2.db` 重来。前端 Rules 页对规则的增删改直接落库，不经过 `rules.js`。
   - `POST /api/rules`：新建（`rule_id`/`name`/`category` 必填，`rule_id` 重复返回 409）
   - `PUT /api/rules/:ruleId`：按字段更新
   - `DELETE /api/rules/:ruleId`：**软删除**（`active=0`）
   - `PATCH /api/rules/batch-toggle`：批量启停

2. **规则 DSL 是字符串表达式，不是真正的表达式引擎**（README「已知边界」第 4 条）：
   `condition`/`formula` 形如 `shift_type == "normal" && season == "winter"` / `deduction = 10; status = "late"`，
   靠约定的写法解析（`server/rules.js` 58 条）。新规则务必遵循既有字段的写法（变量名：`late_minutes`、
   `early_leave_minutes`、`season`、`shift_type`、`daily_wage` 等），且冲突时按 `priority` 数值小的优先
   （冬/夏令时同为 10，迟到 1–4 级为 20/21/22/23）。

3. **薪资公式链有制度性约定**（`server/services/salary.js`）：
   - 日工资 = 标准工资 / 21.75，时工资 = 日工资 / 8（`MONTHLY_WORKING_DAYS=21.75`）
   - 试用期按 80% 折算；全勤奖固定 100 元
   - **加班不折算加班费**，公休日加班只累积存休（`overtimePay = 0`，存休时长从 `attendance_records`
     中 `status='rest_day_overtime'` 汇总）——这条写死在 Step 6，别当成 bug
   - 病假分段：≤7 天 80%、≤15 天 50%、>15 天按下限 2160×0.8/日工资（`MIN_WAGE_MONTHLY=2160`）
   - 旷工半天按 1.5 倍日工资扣；事假扣全日工资
   - 个税用累计预扣预缴法（`calculateIIT`），免税额 5000

4. **考勤是单休制（周日休）**：`getWorkingDays(year, month, 1)` 排除周日；
   `generateMockAttendance` 约 12% 概率在周日生成 4–7 小时存休。季节 5–10 月为 summer，
   其余 winter；冬令时 8:30–17:30，夏令时 8:00–17:00（`getSeason` 按月判断，不跨年边界处理 1 月/12 月
   实际也是 winter，无问题）。

5. **默认月份硬编码 `2026-07`**（`routes/index.js` 各查询的 fallback），前端 `App.tsx` 月份下拉固定
   `2026-01`…`2026-08`。改演示月份时要同时改这两处。

6. **数据库文件路径写死**：`server/db.js` 用 `join(__dirname, '..', 'hr_platform_v2.db')`，
   即项目根目录。SQLite 单文件，**多实例部署会写入冲突**（README「已知边界」第 6 条，需换 PostgreSQL）。
   `.gitignore` 已忽略 `*.db` 及 `-journal/-shm/-wal` 后缀。

7. **前端无路由库**：`App.tsx` 用 `useState` 切 6 个页面（dashboard/attendance/salary/employees/rules/payslip），
   页面组件以 props 传递 `{selectedMonth, setSelectedMonth, API}`；`API` 是 `/api` 相对路径，
   开发靠 Vite proxy，生产靠 Express 同端口托管 `dist/`。

8. **`src/modules/attendance/edu_overtime_engine.js` 是独立的教育系统加班引擎**（1.5/2.0/3.0 倍率，
   `EDU_POSITION_TAG='教育岗'`，含归属月归集与免加班校验），**不参与 `server/services` 主路径**，
   不要误以为它被后端调用。

9. **无权限体系**（README「已知边界」第 5 条）：任何人可直改规则。生产化需加登录与操作审计。

10. **`start.bat` 与使用手册中的绝对路径是本机专属**（`C:\Users\intpj\...`），文档中的
    「两个命令必须在项目目录下执行」警告：否则后端报 `Cannot find module`。仓库实际路径是
    `D:/smart-hr-platform`，脚本里的路径已过时，仅作为形式存在。

11. **构建产物**：`npm run build` 输出到 `dist/`，Express 静态目录指向 `dist/`；
    开发时不构建也没关系（走 Vite proxy），`index.html` 缺失时 API 返回 JSON 提示「前端未构建，请运行 npm run build」。
