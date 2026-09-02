# 甄客行

甄客行是基于现有商城账号、商家、商品、订单、支付、退款、试用、核销和甄客验能力扩展的综合本地生活平台。用户端以首页、甄客帖和地点发现为主线，商城作为完整交易模块继续运行。

## 第一版产品边界

- 交易入口包含“商城 / 酒店 / 景区 / 饭店”四个并列营业模块。
- “商城”完整保留原有自营与商家商品、动态分类、试用、购物车、支付、线上购买与发货物流、已有线下核销、退款和甄客验能力。
- 酒店、景区、饭店是新增的三个稳定商品分类，复用同一商品、订单、支付、核销和甄客验体系，第一版强制使用线下核销履约。
- 甄客行是在原商城上扩展业务，不是把商城裁剪或替换成三个本地生活分类。
- 现有 `shop_user` 就是甄客行用户；平台只有一个用户身份和一个统一“我的”。
- 甄客帖是用户围绕所选地点自由发布的内容，与基于真实消费或试用资格的甄客验相互独立。

完整需求、边界和验收门槛见：

- [`docs/项目交接文档.md`](docs/项目交接文档.md)
- [`AGENTS.md`](AGENTS.md)

## 仓库结构

```text
delivery-main/
├── delivery-frontend/          # 甄客行用户端，React 19 + Umi 4 + Ant Design 6
├── delivery-admin-frontend/    # 超管与商家端，正式基路径 /admin/
├── delivery-backend/           # Spring Boot 3.5、Java 17、Maven 多模块单体
├── delivery-backend/migrations # 版本化人工增量 SQL
├── yuanxing/                   # 非技术概念原型，仅作强制视觉基准
├── scripts/                    # Codex Cloud 环境脚本
└── docs/                       # 项目交接与其他文档
```

`yuanxing/` 不能作为正式代码、接口或 Mock 数据来源。正式用户端需要继承其暖色、摄影卡片、圆角层级和移动端节奏，同时按真实业务契约在 React 工程中重新实现。

## 本地环境

- Node.js 20
- npm（随 Node.js 20）
- Java 17
- Maven 3.8+
- MySQL 8+

不要提交 `.env`、本地配置、真实密钥、数据库快照、日志、`node_modules`、`dist`、`target` 或部署制品。

## 安装与开发

```bash
# 用户端
npm ci --prefix delivery-frontend
npm --prefix delivery-frontend run dev

# 管理端
npm ci --prefix delivery-admin-frontend
npm --prefix delivery-admin-frontend run dev
```

后端运行需要本地数据库和 PCC 私密配置。普通本地与生产构建保留 PCC Starter；`-Dcodex.cloud=true` 只用于没有生产密钥的 Codex Cloud 验证，不能用于生产打包。

## 验证

```bash
# 用户端
npm --prefix delivery-frontend run typecheck
npm --prefix delivery-frontend run build

# 管理端
npm --prefix delivery-admin-frontend run typecheck
npm --prefix delivery-admin-frontend run build

# Codex Cloud 后端验证
mvn -f delivery-backend/pom.xml -Dcodex.cloud=true -pl ruoyi-shop -am test

# 静态检查
git diff --check
```

两个前端当前没有 `test` 脚本。构建成功不等于数据库迁移、地图、支付、核销或真实浏览器业务闭环已通过。

## 数据库变更

甄客行第一版增量脚本位于：

```text
delivery-backend/migrations/20260826_zhenkexing_v1.sql
```

脚本由负责人在本地或目标环境人工执行。Codex Cloud 开发任务不得连接生产数据库，也不得自动执行迁移。

## Codex Cloud

首次创建 Cloud 环境执行：

```bash
bash scripts/codex-cloud-setup.sh
```

缓存恢复后的任务执行：

```bash
bash scripts/codex-cloud-maintenance.sh
```

Cloud 长任务必须先完整阅读 `AGENTS.md`、`CODEX_CLOUD_GOAL.md` 和 `docs/项目交接文档.md`，持续维护 `CODEX_CLOUD_PROGRESS.md`，并按完成门槛提供代码、测试和未验证事项的真实证据。

## 交付安全

- 不自动执行 SQL，不部署生产，不自动合并主分支。
- 不删除或隐藏原商城线上、线下、试用、退款及甄客验功能。
- 不使用 Mock、静态数组或原型演示状态冒充正式全栈实现。
- Git 只暂存已审查的任务文件，不使用 `git add -A`。

## License

Private - 内部项目
