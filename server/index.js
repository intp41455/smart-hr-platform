// 服务器入口 - Express应用，提供API服务并托管前端静态文件
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB, db } from './db.js';
import { syncRules } from './services/rule-engine.js';
import router from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API路由
app.use('/api', router);

// 静态文件（生产环境）
app.use(express.static(join(__dirname, '..', 'dist')));

// SPA回退
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
  } else {
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'), (err) => {
      if (err) res.status(200).json({ 
        message: '康源智慧人资系统 API',
        docs: '/api/health',
        note: '前端未构建，请运行 npm run build'
      });
    });
  }
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message });
});

// ====== 启动 ======
initDB();
syncRules();

// 首次运行自动播种种子数据
const empCount = db.prepare('SELECT COUNT(*) as c FROM employees').get();
if (empCount.c === 0) {
  console.log('[Seed] 员工表为空，开始自动播种...');
  try {
    await import('./seed.js');
    console.log('[Seed] 种子数据加载完成');
  } catch (e) {
    console.log('[Seed] 种子模块错误:', e.message);
  }
} else {
  console.log(`[Seed] 已有 ${empCount.c} 名员工，跳过播种`);
}

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  康源智慧人资系统 - 服务器已启动`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log(`  前端: http://localhost:${PORT} (需先构建)`);
  console.log(`  开发模式: http://localhost:5173 (Vite)`);
  console.log(`========================================\n`);
});
