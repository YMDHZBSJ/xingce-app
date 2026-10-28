# 行测真题库 · 安卓离线版

Capacitor 壳 + 静态前端 + 内置近 5 年真题（2022–2026，22,298 题）。
完全离线可用，无需服务器。

## 已实现

- 首页：今日一练（随机 10 题）、快速入口、年份标签
- 题型专练：按模块/题型随机组卷（5/10/20/50/100 题），计时、查看答案解析
- 模拟考试：194 套真题卷列表 → 120 分钟计时、题号网格、交卷报告
- 错题本：答错自动记录（含题目快照）、重做、移除、清空
- 智能搜索：本地全文扫描（37–173ms）
- 设置：字号三档、浅色/深色主题
- 底部 Tab 导航，适配手机安全区

## 数据

```
www/data/
├── manifest.json      模块清单
├── papers.json        194 套试卷索引（含所属模块，避免全量加载）
└── <模块>.json        6 个模块的全部题目（共 ~52MB 明文，APK 内 zip 压缩后 ~11MB）
```

题库由 `xingce-tools` 的 `data/questions.db` 导出（近 5 年）。
重新导出：见 `scripts/export-data.py`（若不存在，按 README 末尾命令重跑）。

## 构建

```bash
# 环境（一次性）
brew install openjdk@17
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.21.0.2/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=~/Library/Android/sdk
# JDK/SDK 装好后
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

## 本机构建时踩过的坑（已在仓库内修好）

1. **Capacitor 8 默认用 Java 21 编译** → 本机 JDK 17 报「无效的源发行版：21」
   - 已在 `app/build.gradle` 末尾追加 `JavaVersion.VERSION_17` 覆盖（`capacitor.build.gradle` 是每次 sync 重新生成的，不能改那里）
   - 同时把 `node_modules/@capacitor/android/capacitor/build.gradle` 的 21 改成 17（`npm install` 后需重跑）
2. **Kotlin stdlib 重复类** → 在根 `build.gradle` 的 `allprojects` 里排除 `kotlin-stdlib-jdk7/jdk8`
3. **compileSdk 36 需要更高 JDK** → `variables.gradle` 里降到 34，并把 androidx 版本降到兼容 API 34 的版本
4. **`.gz` 资源会被 Android 重新解包改名** → 数据改为直接分发 `.json`（APK 是 zip，体积差别不大）

## 已知限制

- **图片暂缺**：35% 题目（7,802 题）含图片，当前显示「[图片]」占位。下一步可按模块打包图片（资料分析+数量关系约 34MB）。
- 仅含近 5 年真题（2022–2026）。
- 未做云同步（App 版为纯本地）。

## 下一步建议

1. 图片包：先打「资料分析 + 数量关系」（34MB，做题刚需图表）
2. 年度增量：新增年份单独出包，启动时按需加载
3. 包名/图标/版本号正式化，做 release 签名

---

## 两个发布版本

| 版本 | 体积 | 图片覆盖 | 适用 |
|---|---|---|---|
| `xingce-app-v2-lite.apk` | 62MB | 资料分析 / 数量关系 / 常识判断 / 言语 / 政治（10,655 张） | 微信可直接发（<100MB） |
| `xingce-app-v2-full.apk` | 109MB | 全部模块（12,238 张，含判断推理·图形推理） | 网盘 / 数据线安装 |

精简版中「图形推理」题图片显示 `[图片暂缺]`，其余模块完整。

## 图片说明

- 图片来源：`xingce-tools` 的 `xingcezhenti/90-图片/`，按题目 JSON 里的 `../90-图片/...` 引用复制到 `www/images/`。
- 全部模块去重后 12,238 张 / 90MB；中位体积约 1KB（多为公式/表格小图）。
- **不要转成 JPEG**：实测小图转 JPEG 反而变大 40~160%，PNG 才是最优。
- APK 内路径：`assets/public/images/...`，运行时代码把 `../90-图片/` 重写为 `images/`。
- 图片加载失败时自动降级为 `[图片暂缺]` 占位，不会出现破图。

## 已知限制

- 仅含近 5 年真题（2022–2026）。
- 未做云同步（App 版为纯本地）。
- 精简版缺图形推理图片（见上）。

---

## 应用名与图标

- 应用名：**行测题库**（`values/strings.xml` 的 `app_name` / `title_activity_main`、`capacitor.config.json` 的 `appName`）
- 图标：`图标.png`（用户提供的原始图）→ 自动裁掉白边与"豆包 AI 生成"水印 → 全出血母图 `/tmp/icon/art.png`
- 生成尺寸：`mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}` 的 `ic_launcher.png` / `ic_launcher_round.png` / `ic_launcher_foreground.png`
- 自适应图标底色：`values/ic_launcher_background.xml` = `#F4701E`
- 启动图：`drawable*/splash.png`（白底 + 居中图标徽章）

重新生成图标的步骤：把新图命名为 `图标.png` 放项目根目录，用 `scripts/make-icon`（若存在）或按 README 手工流程裁切后覆盖各 mipmap 目录。

---

## 包名

- `applicationId` / `namespace`：**com.xiaogaostu.xingceapp**
- Java 包路径：`android/app/src/main/java/com/xiaogaostu/xingceapp/MainActivity.java`
- `capacitor.config.json` 的 `appId` 同步为 `com.xiaogaostu.xingceapp`
- `strings.xml` 的 `package_name` / `custom_url_scheme` 同步更新

改包名要同时改：`app/build.gradle`（namespace + applicationId）、Java 包目录与 `package` 声明、
`strings.xml`、`capacitor.config.json`；改完 `npx cap sync android` 让 `assets/capacitor.config.json` 同步。

注意：`applicationId` 变了等于新应用，**旧的 xingce-app 不会自动覆盖**，需要手动卸载旧版。

---

## 变更日志（CHANGELOG）

每次修改代码/界面后，必须在项目根目录的 `CHANGELOG.md` 追加一条记录，格式：

```md
## [版本号] YYYY-MM-DD

### 变更类型：新增 / 修复 / 优化 / 移除
- 具体改动（涉及文件）

### 验证
- 验证方式与结果
```

约定：
- **版本号同步递增**（`web/app/lib/author.ts` 的 `version` 与 CHANGELOG 标题保持一致）
- CHANGELOG **只保存在本机项目目录**，不放入 `web/public/`，因此不会被打包进 `out/` 与 APK
- 检查命令：`ls web/out | grep -i changelog`（应无输出）
