# 㤫者商城 - Delivery Platform

一个基于 React + Spring Boot 的电商平台，包含用户端、管理端和后端服务。

## 项目架构

```
㤫者商城-delivery/
├── delivery-frontend/          # 用户端前端（甄客验平台）
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   ├── layouts/            # 布局组件
│   │   ├── mocks/              # Mock 数据
│   │   ├── utils/              # 工具函数
│   │   └── types.ts            # TypeScript 类型定义
│   ├── public/                 # 静态资源
│   ├── .umirc.ts               # Umi 配置
│   └── package.json
│
├── delivery-admin-frontend/    # 管理端前端（商家/管理员后台）
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   ├── layouts/            # 布局组件
│   │   ├── mocks/              # Mock 数据
│   │   ├── utils/              # 工具函数
│   │   └── types.ts            # TypeScript 类型定义
│   ├── public/                 # 静态资源
│   ├── .umirc.ts               # Umi 配置（base: "/admin/")
│   └── package.json
│
├── delivery-backend/          # 后端服务（Spring Boot）
│   ├── src/main/java/
│   │   └── com/delivery/mvp/   # Java 源代码
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml                 # Maven 配置
│
├── shop-frontend/              # 用户端打包产物
├── shop-admin/                 # 管理端打包产物
├── img/                        # 项目图片资源
│
└── 㤫者商城-前端部署流程.docx  # 部署文档
```

## 技术栈

### 前端
- **框架**: React 19.2 + Umi 4.6
- **UI 组件**: Ant Design 6.4
- **图表**: @ant-design/charts（管理端数据看板）
- **地区数据**: china-division（省市区三级联动）
- **语言**: TypeScript 5.0

### 后端
- **框架**: Spring Boot 3.5
- **语言**: Java 21
- **数据库**: MySQL
- **构建工具**: Maven

## 功能模块

### 用户端（delivery-frontend）

| 模块 | 功能 |
|------|------|
| 商品浏览 | 商品列表、分类筛选、排序 |
| 商品详情 | 商品信息、验证报告、溯源信息 |
| 购物流程 | 加入购物车、下单、支付 |
| 验证报告 | 发布报告、上传图片/视频、体验描述 |
| 用户中心 | 个人信息、订单管理、收益明细、物流查询 |
| 试用申请 | 申请试用资格、查看进度 |
| 商家入驻 | 填写公司信息、上传资质、同意协议 |

### 管理端（delivery-admin-frontend）

| 模块 | 功能 |
|------|------|
| 数据看板 | 销售统计、订单趋势、商品状态分布 |
| 商品管理 | 商品列表、新增/编辑、上架/下架 |
| 试用招募 | 创建招募、查看申请、管理进度 |
| 订单管理 | 订单列表、发货、退款处理 |
| 验证报告 | 报告列表、审核、删除 |
| 商家管理 | 商家列表、新增/编辑、启用/禁用 |

## 本地开发启动流程

### 前置要求

- Node.js >= 18
- npm >= 9
- Java >= 21（后端）
- Maven >= 3.8（后端）
- MySQL >= 8.0（后端）

### 1. 启动用户端前端

```bash
cd delivery-frontend

# 安装依赖
npm install

# 启动开发服务器（端口 8000）
npm run dev
```

访问地址：http://localhost:8000

### 2. 启动管理端前端

```bash
cd delivery-admin-frontend

# 安装依赖
npm install

# 启动开发服务器（端口 8001）
npm run dev
```

访问地址：http://localhost:8001

### 3. 启动后端服务

```bash
cd delivery-backend

# 配置数据库连接（编辑 application.properties）
# spring.datasource.url=jdbc:mysql://localhost:3306/delivery
# spring.datasource.username=root
# spring.datasource.password=your_password

# 启动 Spring Boot
mvn spring-boot:run
```

后端默认端口：8080

## 项目构建

### 前端打包

```bash
# 用户端打包
cd delivery-frontend
npm run build
# 输出目录：./dist（打包后可移动到 shop-frontend）

# 管理端打包
cd delivery-admin-frontend
npm run build
# 输出目录：./dist（打包后可移动到 shop-admin）
```

### 后端打包

```bash
cd delivery-backend
mvn clean package
# 输出文件：target/delivery-backend-0.0.1-SNAPSHOT.jar
```

## 生产部署

详见 `㤫者商城-前端部署流程.docx`，包含：

1. Nginx 安装与配置
2. 前端静态文件上传
3. 端口放行与防火墙设置
4. 常见问题排查

### 访问地址

| 端 | 本地开发 | 生产环境 |
|----|---------|---------|
| 用户端 | http://localhost:8000 | http://服务器IP |
| 管理端 | http://localhost:8001 | http://服务器IP/admin/ |

## 测试

### 前端测试

```bash
# 用户端测试
cd delivery-frontend
npm run test

# 管理端测试
cd delivery-admin-frontend
npm run test
```

测试覆盖：
- 认证规则（authRules）
- 商品筛选（productCatalog、productFilters）
- 购物车（cart）
- 订单管理（orders、orderManagement）
- 数据看板（adminDashboard）

## 响应式适配

项目支持 H5 移动端和 PC 端，使用响应式布局：

- **PC端**（>= 992px）：完整侧边栏、表格布局
- **移动端**（< 992px）：抽屉式导航、卡片式布局、表格横向滚动

## 账号信息

### 用户端测试账号
- 用户名：任意
- 密码：任意（注册即可）

### 管理端测试账号
| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | 123456 |
| 商家 | merchant_li | 123456 |

## 开发规范

- 使用 TypeScript 强类型
- 组件使用 React Hooks
- 样式使用 Less + CSS Modules
- Mock 数据用于前端独立开发
- 工具函数包含单元测试

## License

Private - 内部项目