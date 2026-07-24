# 手机预览沙盒实施计划

> **执行要求：** 使用 executing-plans 按任务执行。每个任务最多修改三个文件，严格执行 TDD。

**目标：** 让同一 Wi‑Fi 下的手机通过局域网地址查看并操作覆盖完整用户流程的纯前端预览数据。

**架构：** 使用独立的预览模式判断、预览数据和预览状态模块；正式页面只通过统一适配入口读取数据及执行动作。预览模式不调用真实写接口，生产环境永远禁用。

**技术栈：** React 19、Umi 4、TypeScript、Node Test Runner、Less。

---

### 任务一：局域网预览模式

**文件：**
- 新建：`delivery-frontend/src/preview/previewMode.ts`
- 新建：`delivery-frontend/src/preview/previewMode.test.ts`
- 修改：`delivery-frontend/src/pages/index.tsx`

- [ ] 先测试开发环境下 `localhost`、`127.0.0.1`、`192.168.x.x`、`10.x.x.x`、`172.16-31.x.x` 携带 `preview=1` 时启用。
- [ ] 测试生产环境、非局域网地址或缺少参数时禁用。
- [ ] 运行 `npx tsx src/preview/previewMode.test.ts`，确认测试先失败。
- [ ] 将预览判断移入独立模块，页面复用判断结果。
- [ ] 运行测试和构建。

### 任务二：首页、详情与试用预览数据

**文件：**
- 新建：`delivery-frontend/src/preview/previewFixtures.ts`
- 新建：`delivery-frontend/src/preview/previewFixtures.test.ts`
- 修改：`delivery-frontend/src/pages/index.tsx`

- [ ] 测试四分类都有混合内容。
- [ ] 测试购买甄客验包含三个评分，试用甄客验不包含。
- [ ] 测试线上与线下招募人数、截止日期和流程来源完整。
- [ ] 运行测试确认失败。
- [ ] 按现有类型创建预览数据，并在预览模式阻止首页真实请求。
- [ ] 运行测试和构建。

### 任务三：购物车、订单、物流与个人中心

**文件：**
- 新建：`delivery-frontend/src/preview/previewCommerce.ts`
- 新建：`delivery-frontend/src/preview/previewCommerce.test.ts`
- 修改：`delivery-frontend/src/pages/index.tsx`

- [ ] 测试普通订单覆盖待付款、待发货、待收货、待发布和退款。
- [ ] 测试线上与线下试用保持不同数据源和流程。
- [ ] 测试物流覆盖备货、运输中、已签收和异常。
- [ ] 运行测试确认失败。
- [ ] 在预览模式注入购物车、订单、试用和物流，并拦截真实写操作。
- [ ] 运行测试和构建。

### 任务四：手机巡检菜单

**文件：**
- 新建：`delivery-frontend/src/preview/PreviewInspector.tsx`
- 修改：`delivery-frontend/src/pages/index.tsx`
- 修改：`delivery-frontend/src/pages/index.less`

- [ ] 在结构测试中先增加巡检菜单仅预览模式可见的失败断言。
- [ ] 增加首页、购买甄客验、试用甄客验、线上试用、线下试用、购物车、订单、物流和个人中心入口。
- [ ] 增加明显的“本地预览数据”提示。
- [ ] 验证 375px、390px 和 430px 宽度无横向溢出。
- [ ] 运行页面测试和构建。

### 任务五：全流程验证

**文件：**
- 不新增业务文件，只修复验证中发现的当前任务问题；若需超过三个文件，单独拆分。

- [ ] 运行所有预览模块测试。
- [ ] 运行 `npm run test:pages`。
- [ ] 运行 `npm run build`。
- [ ] 用手机局域网地址逐项打开巡检入口。
- [ ] 确认预览操作未发出真实写请求。
- [ ] 列出风险及对应测试用例。
