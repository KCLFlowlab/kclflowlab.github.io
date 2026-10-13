# KCL FlowLab 网站设计与素材规划

## 设计主线

新版以“从流动中理解力，再用物理知识预测流动”为叙事线索。真实 CFD 场构成首屏，
超大标题、铜色衬线斜体与细小数据标签形成尺度对比。正文使用深蓝黑、暖白背景交替，
研究章节各有构图，避免整页重复封面卡片。字体 Manrope 与 Space Grotesk 本地托管。

1. **Uncover the forces of flow.**：全屏流场、被动示踪粒子与进入研究的入口。
2. **A wake is a story of forces.**：简洁说明研究问题与课题组方向。
3. **What keeps a bird aloft?**：Matteo 的 RA-VFM（2026-03-13）。
4. **One flow. Different futures.**：STCO 独立章节与四条件动画（2026-08-20）。
5. **Where does thrust begin?**：Deforming VFM 同步游动与力场动画（2026-08-31）。
6. **Physics inside. Possibilities ahead.**：VATO 提前量／攻角扫描（2026-09-01）。
7. **Different minds. Shared curiosity.**：负责人介绍与五位成员介绍。
8. **Research outputs.**：五条 KCL 发表记录与可展开的四篇预印本列表。
9. **Let’s make waves.**：研究合作联系与开放代码入口。

研究章节按 arXiv 首次提交日期从早到晚排列，不把提交时间当成项目启动时间。
STCO 和 VATO 已核实公开 arXiv 页面，统一标注 Preprint。

成果列表依据 Juan Li 官方 KCL 主页链接到的 KCL Pure（页面显示 Julia Li）记录。
精选 2022 年 Flow completion network、2023 年分离流模型比较、2024 年涡脱落综述、
2024 年 PEMFC 流道优化，以及 2026 年 Matteo 的 AIAA Journal 待刊文章。
每项显示题目、作者、年份、期刊／会议和 KCL 链接；待刊状态单独标出，不声称完整目录。
AIAA 记录与 RA-VFM 预印本的题名和作者不同，作为独立记录保留，不直接认定为同一版本。

## 科学素材与动画

| 工作 | 来源素材 | 展示方式 |
| --- | --- | --- |
| Deforming VFM | phase-0 calculated-cell CFD 快照；README force_mapping.gif；Figures 5、11 | 快照重新渲染为首屏；研究章节展示原始完整时序动画；详情保留科学面板 |
| MarsVATO | README vato-model；leadtime.gif、incidence.gif | VATO 章节主动切换提前量和攻角扫描；详情包含架构封面 |
| STCO | FRO_Paper README prescribed_condition_pde；四条件响应 GIF | STCO 独立章节的条件响应动画；详情放概念封面、空间对比与性能图 |
| RA-VFM | 公开论文 Figure 1 和 Figure 5 等值面原图 | 鸟体几何独立章节；详情展示完整原图 |

首屏仅使用单个冻结速度场，粒子用于显示局部流向；不是鱼体真实时序模拟。
“About this flow”说明 phase 0、Re 5000、St 0.4、λ* 1.5，以及定性色图范围。
原始 64 相位动画在 Deforming VFM 章节单独呈现。

四段研究 GIF 转为 H.264 MP4，合计约 3 MB；保留帧数、显示时长、面板、色标与标签。
VATO 是离散预测提前量／攻角扫描；STCO 每帧是独立查询，不写成连续时间演化。
RA-VFM 没有可核实的 README 动画，采用未修改论文原图，注明 CC BY-NC-ND 4.0。
所有来源、精确 commit、处理方式与 SHA-256 在 asset-manifest.json 中记录。

## 团队资料

| 成员 | 可核实资料 | 展示策略 |
| --- | --- | --- |
| Juan Li | KCL Lecturer in Engineering；官方照片、流体／气动／涡动力学／风能方向 | 负责人单独横向介绍 |
| Xingxin Yang | KCL PhD Student；官方照片、机器学习与 CFD 翼型优化 | 头像、研究介绍、KCL 链接 |
| Vedang Joshi | KCL PhD Student；官方照片、非定常流／涡脱落／集群行为 | 头像、研究介绍、KCL 链接；使用官方拼写 |
| Matteo Liguori | KCL Pure 工程系记录；VFM 论文作者，无可确认照片 | 姓名字标、论文支持的研究方向、KCL Pure 链接 |
| Yichen Li | MarsVATO 论文作者；未可靠匹配到 KCL 个人页 | 姓名字标、已核实论文关联，不推断职位 |
| Zhan Zhang | MarsVATO 与 RA-VFM 作者；未可靠匹配到 KCL 个人页 | 姓名字标、已核实论文关联，不推断职位 |

名单来自用户指定，非声称完整课题组名册。没有使用同名外校人员的信息或生成虚构肖像。
后续取得准确个人主页和照片后可替换姓名字标，扩展个人介绍。

## 交互、适配与发布

首页粒子和三处视频在离开视区、切后台或打开详情时暂停；尊重减少动态效果设置。
动画有暂停、拖动与全屏；STCO 和 VATO 各有播放、拖动与全屏控制；弹窗支持 Escape。
手机使用纵向章节与菜单，保持科学图完整比例。无需 JavaScript 也可阅读成员和论文链接。

静态 HTML/CSS/JavaScript，无服务端、CDN 或追踪。GitHub Actions 只部署 site/ 到
https://kclflowlab.github.io/ 。main 分支更新自动发布。
本地 preview.html 嵌入字体、流场、图像与视频，源码包为 kclflowlab-website.zip。
浏览器 QA 覆盖桌面、320/390/768/1024px 布局、动画、弹窗、无脚本与减少动态效果。
