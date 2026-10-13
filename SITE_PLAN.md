# KCL FlowLab 网站设计与素材规划

## 当前设计

英文课题组主页，围绕用户提出的“科技感、精简、极简”与“优先使用 GitHub 仓库封面素材”。
使用石墨黑背景、暖白正文和冰蓝强调色；大标题、细线、克制的等宽标签构成界面。
研究图像保留原始白底、科学配色、色标和完整面板。首页直接展示研究动画。

页面压缩为三段：

1. **Flow. Force. Intelligence.**：一句研究定位，四项工作可切换的大幅主视觉。
2. **Physics meets prediction.**：四张封面图卡，每项一句话、动画入口、论文与代码链接。
3. **Understand the flow.**：简短课题组介绍、KCL 工程系归属与研究联系入口。

详情弹窗承载完整题目、作者、方法概述、补充图和来源；首页不堆砌长段落与指标。
四个项目由访客主动切换，不自动轮播。动画支持暂停、拖动和全屏；减少动态效果
设置会关闭自动播放。离开可视区域或打开详情时暂停，避免后台持续播放。

## 真实展示素材

| 工作 | 仓库封面／README 素材 | 展示方式 |
| --- | --- | --- |
| Deforming VFM | `03_plotting/media/force_mapping.gif`；README 中的 Figure 11 | 默认首屏同步游动与力场动画；图卡展示完整力图，详情补充 Figure 5 |
| MarsVATO | `paper/figures/vato-model.jpg`；`docs/assets/leadtime.gif`、`incidence.gif` | 架构封面图卡；首屏可切换提前量和攻角两种动画 |
| STCO | 当前 FRO_Paper README 的 `prescribed_condition_pde.png`、四条件响应 GIF | 条件算子概念图卡；首屏展示 GAOT Base–STCO 对照，详情增加空间对比与性能图 |
| RA-VFM | 当前 README 没有封面图；使用公开论文 Figure 1 和 Figure 5 等值面原图 | 鸟体几何图卡；主视觉展示几何与三维力贡献原图 |

16 个科学媒体文件已经纳入网站。四段 GIF 转为 H.264 MP4，总体约 3 MB；没有裁掉
科学面板、色标或标签，也没有对物理结果插值。静态封面只做等比例网页缩放。
精确来源、Git commit、变换方式和 SHA-256 见 `asset-manifest.json`。

## 内容准确性

- FRO_Paper 是仓库名；当前展示工作的正式名称是 **STCO**。
- MarsVATO 与 STCO 标注 Manuscript；不推断录用或正式发表状态。
- MarsVATO 动画是离散提前量／攻角扫描，不标成连续时间演化。
- STCO 每帧对应独立查询的提前量；不是自回归滚动预测。
- RA-VFM 当前没有可确认的 README 动画，因此展示论文原图。
- RA-VFM 图片保持原始文件，注明 CC BY-NC-ND 4.0。
- 学校、系所和公开研究联系信息来自 KCL 主页；不推断完整团队名单。

## 工程与发布

静态 HTML/CSS/JavaScript；没有服务端、CDN、账号系统或访客追踪。
部署目录为 `site/`；GitHub Actions 不上传研究源仓库、本地工具依赖或 QA 截图。
`preview.html` 是包含图片和视频的单文件审阅版，`kclflowlab-website.zip` 是源码包。

发布目标为 `KCLFlowlab/kclflowlab.github.io`；Pages 使用 GitHub Actions 部署。
后续向 `main` 推送网站更新后自动发布。精确研究来源与版本已记录在素材清单中。
网站仓库只包含独立网站源文件，不改变任何研究仓库的可见性。
