# 功能自检（E2E）

对静态导出产物（`web/out`）或解包后的 APK 资源做端到端验证。

```bash
# 1) 起服务（任选其一）
cd web/out && python3 -m http.server 8095

# 2) 跑自检（需要 playwright，可用 xingce-tools/web 里的）
cd ../xingce-tools/web && node ../../xingce-app/tests/e2e-full.js
```

覆盖：首页、搜索（含筛选/分页/结果跳转）、统计图表、考点树与详情、专练（作答→查看答案→交卷→报告→同类题）、错题本（分组→重做→判分→移除）、模拟考试（列表→作答→答题卡→交卷确认→成绩报告→答题记忆回看）、备份（导出下载/导入）、我的。
