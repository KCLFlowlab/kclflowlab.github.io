# KCL FlowLab 网站设计与素材规划

## 设计主线

首页是一整个可探索的流场，主题 **Follow the vortex.**。真实 CFD 尾迹与被动示踪粒子构成场景，
四项研究以带原始封面缩略图的节点分布其中，悬停或键盘聚焦会强调导航连线。
这些连线仅用于页面导航，不表示研究之间的物理关系或测量位置。

- 浏览状态：全屏流场与四个研究节点；可筛选 Fluid forces / AI models，也可切换背景图层、暂停粒子。
- 展开状态：点击节点打开工作窗口，显示问题、作者、介绍、论文／代码与动画或完整论文图。
- 同一窗口可直接切换研究；支持深链接、浏览器返回、Esc 关闭与焦点返回。
- 团队、研究产出和联系信息通过导航打开独立面板；常规首页不再依靠纵向滚动浏览。
- 手机用紧凑的节点排列，打开研究先显示媒体。极矮横屏允许必要滚动，避免控件不可达。

四个研究节点和工作切换标签按 arXiv 首次提交日期排列：
RA-VFM（2026-03-13，Matteo 的工作最先）、STCO（2026-08-20）、
Deforming VFM（2026-08-31）、MarsVATO（2026-09-01）。统一标注预印本，日期不当作项目启动时间。

标题使用 Space Grotesk，正文使用 Manrope，均本地托管。黑蓝场景、青色流动与少量铜色涡量强调构成统一色彩。
页首和浏览器图标使用 GitHub 黑白头像原图；KCL 机构标识保留在联系面板。

成果列表依据 Juan Li 官方 KCL 主页链接到的 KCL Pure（页面显示 Julia Li）记录。
精选 2022 年 Flow completion network、2023 年分离流模型比较、2024 年涡脱落综述、
2024 年 PEMFC 流道优化，以及 2026 年 Matteo 的 AIAA Journal 待刊文章。
每项显示题目、作者、年份、期刊／会议和 KCL 链接；待刊状态单独标出，不声称完整目录。
AIAA 记录与 RA-VFM 预印本的题名和作者不同，作为独立记录保留，不直接认定为同一版本。

## 科学素材与动画

| 工作 | 来源素材 | 展示方式 |
| --- | --- | --- |
| Deforming VFM | phase-0 calculated-cell CFD 快照；README force_mapping.gif；Figures 5、11 | 快照重新渲染为首屏；研究章节展示原始完整时序动画；详情保留科学面板 |
| MarsVATO | README vato-model；leadtime.gif、incidence.gif | VATO 工作窗口主动切换提前量和攻角扫描；详情包含架构封面 |
| STCO | FRO_Paper README prescribed_condition_pde；四条件响应 GIF | STCO 研究窗口的条件响应动画；详情放概念封面、空间对比与性能图 |
| RA-VFM | 公开论文 Figure 1 和 Figure 5 等值面原图 | 鸟体几何研究窗口；详情展示完整原图 |

首屏仅使用单个冻结速度场，粒子用于显示局部流向；不是鱼体真实时序模拟。
“About this field”说明 phase 0、Re 5000、St 0.4、λ* 1.5，以及定性色图范围。
原始 64 相位动画在 Deforming VFM 工作窗口单独呈现。

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
