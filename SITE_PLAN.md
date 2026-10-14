# KCL FlowLab 网站设计

## 从工作卡片转向研究空间

课题组定位为 **Bio-inspired engineering × Fluid physics × Scientific AI**。
首页主文案是 **Nature in motion. Ideas in flow.**，用自然、物理和智能连接工程愿景。
首页不再以四张论文卡片定义课题组，也不以“04 studies”作为研究规模的提示。

视觉中心是原生 Canvas 渲染的立体流动形态：三组不同颜色的连续曲线与运动粒子。
它是明确标注的生成式导航艺术，不是 CFD、测量数据或研究成果。
通过三维投影、深度、柔和发光和轨道引导形成空间感，不添加虚构科学读数。

三个入口分别对应仿生运动与设计、复杂流动与相互作用、科学 AI 与计算。
点击入口会改变视角与主题强调色，在场景内展开研究问题与成果侧栏。
桌面可拖拽旋转、滚轮缩放；手机可拖拽和双指缩放。另提供加减、重置、暂停按钮，
以及画布聚焦后的方向键、加减号和 0 键。减少动态效果时保持静态，用户仍可主动操作。

## 内容组织

方向下有九个问题入口，并明确区分已有成果和研究兴趣：

| 方向 | 问题入口 | 内容依据 |
| --- | --- | --- |
| 仿生运动 | Flight、Swimming、Collective motion | RA-VFM、Deforming VFM、Vedang 官方 KCL 研究兴趣 |
| 流动物理 | Vortices & forces、Turbulence、Aeroelasticity | VFM 工作、涡脱落综述、AIAA 待刊记录、分离流气动弹性论文 |
| 科学 AI | Neural operators、Incomplete data、Engineering design | STCO、VATO、Flow completion network、PEMFC CFD 优化、Xingxin 官方设计方向 |

研究兴趣不伪装成新项目或已完成成果。跨方向关联只表示网站主题组织，
不表示论文之间已被证实的技术依赖。

Research 索引汇合四项近期精选工作与五项 2022–2026 KCL 成果记录。
首页底部同时展示历年成果，桌面可手动切换；动态开启且页面可见时每九秒轮换。
论文的原始封面在方向侧栏与研究索引中保留。进入单项工作后展示完整动画、图、作者及论文／代码。

精选工作与切换标签保持 arXiv 首次提交顺序：
RA-VFM（2026-03-13，Matteo 最先）、STCO（2026-08-20）、
Deforming VFM（2026-08-31）、MarsVATO（2026-09-01）。不把这些日期当作项目启动时间。
KCL 记录与预印本保留独立出处，尤其不把 AIAA 待刊记录直接合并为 RA-VFM 预印本。

## 交互与适配

常规视窗中首页是固定研究空间，无纵向章节滚动。方向内容在侧栏内滚动；
手机将侧栏放在方向导航下方。极矮屏幕允许必要的页面滚动。
研究窗口使用原有媒体控制与完整图像。关闭研究返回原方向、原问题及触发链接，
支持浏览器返回、直接链接和 Escape。快速关闭再打开窗口不会误停新窗口的视频。
画布在研究窗口打开或页面进入后台时停止渲染。

小屏保留简洁的方向短标题，进入后显示完整方向名。
原生黑白 GitHub 头像不变，KCL 机构标识留在联系面板。
Space Grotesk 为标题，Manrope 为正文；所有字体与科研素材本地托管。

## 团队、愿景与原始素材

Juan Li 单独作为负责人。学生按用户指定年级顺序：
Yichen Li → Matteo Liguori → Vedang Joshi → Xingxin Yang → Zhan Zhang。
三张可核实头像来自官方 KCL 页面，其余保留字标；不推断入学年份或缺失个人资料。
Vision 将自然启发、理解物理、预测工具与工程设计连接起来。未来工程目标用愿景表述。

所有原始科学面板、时序和署名不变。四段 MP4 保留 GIF 的帧数与时间语义。
VATO 为独立预测提前量／攻角扫描；STCO 是独立查询；Deforming VFM 是完整 64 相位周期。
RA-VFM 使用 CC BY-NC-ND 4.0 论文原图，不裁切、不修改。

原有 phase-0 CFD 快照保留在 About the visual 及无画布回退中，和生成式首页形态区分。
快照仍为 calculated cells、Re 5000、St 0.4、λ* 1.5，定性涡量范围 −30 到 +30。
来源、原始 commit、处理方式与哈希继续记录于 asset-manifest.json。

## 验证与发布

浏览器检查覆盖三维交互、九个主题、历年成果入口、焦点返回、媒体控制、团队排序，
以及 320/390/768/1024/1366/1440px 布局、减少动态设置和无脚本回退。
仍采用静态 GitHub Pages；GitHub Actions 只部署 site/。
本地 preview.html 为嵌入素材的离线预览，源码包为 kclflowlab-website.zip。
