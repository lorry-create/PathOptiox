"""预测沙箱模块业务服务层

按 offset_hours 返回预测时间点数据。
字段对齐前端 predictiveSandboxApi.ts 的 PredictionTimeData 结构。
- RiskRadar.severity 大写：LOW/MODERATE/HIGH/CRITICAL
- PreemptiveAction.status 大写：QUEUED/EXECUTING/COMPLETED

数据参考前端 PredictiveSandbox.tsx 内置 MOCK_DATA_MAP，
保证前端零修改即可直接渲染。
"""
from typing import Dict

from schemas.predictive_sandbox import (
    PredictionTimeData,
    PreemptiveAction,
    RiskRadar,
)


class PredictiveSandboxService:
    """预测沙箱服务（基于 offset_hours 返回预测数据）"""

    def get_prediction(self, offset_hours: int) -> PredictionTimeData:
        """根据时间偏移返回预测数据

        支持的 offset_hours: 0 / 24 / 48 / 72
        其他值按就近原则归并到最近的可用时间点。
        """
        data = self._build_data_map()
        # 就近匹配
        if offset_hours <= 12:
            return data[0]
        if offset_hours <= 36:
            return data[24]
        if offset_hours <= 60:
            return data[48]
        return data[72]

    def _build_data_map(self) -> Dict[int, PredictionTimeData]:
        """构建 4 个时间点的预测数据"""
        return {
            0: PredictionTimeData(
                offset_hours=0,
                label="当前态势",
                narrative=(
                    "基于PPO强化学习模型的实时分析显示，全球供应链整体风险处于可控区间。"
                    "红海航线存在中等拥堵风险，建议持续监控；东南亚区域港口周转效率稳定，无需立即干预。"
                ),
                risks=[
                    RiskRadar(id="r1", hazard_type="气象异常", probability=35, impact_region="北太平洋航路", estimated_loss="$18万/日", severity="LOW"),
                    RiskRadar(id="r2", hazard_type="港口拥堵", probability=58, impact_region="鹿特丹港 EU447-EU512", estimated_loss="$34万/日", severity="MODERATE"),
                    RiskRadar(id="r3", hazard_type="政策变动", probability=22, impact_region="欧盟碳边境区", estimated_loss="$50万/批", severity="MODERATE"),
                    RiskRadar(id="r4", hazard_type="运力波动", probability=31, impact_region="美元结算通道", estimated_loss="$89万/周", severity="LOW"),
                    RiskRadar(id="r5", hazard_type="地缘风险", probability=72, impact_region="红海-苏伊士运河", estimated_loss="$120万/日", severity="HIGH"),
                ],
                actions=[
                    PreemptiveAction(id="a1", target_order="ORD-2026-0892", strategy="好望角备选路线切换", cost_saved="$1.2万", status="COMPLETED"),
                    PreemptiveAction(id="a2", target_order="ORD-2026-0915", strategy="鹿特丹港泊位预占", cost_saved="$0.8万", status="COMPLETED"),
                    PreemptiveAction(id="a3", target_order="ORD-2026-0933", strategy="多式联运方案激活", cost_saved="$1.5万", status="COMPLETED"),
                    PreemptiveAction(id="a4", target_order="ORD-2026-0941", strategy="碳配额提前锁定", cost_saved="$0.6万", status="COMPLETED"),
                    PreemptiveAction(id="a5", target_order="ORD-2026-0952", strategy="欧洲港口罢工预案启动", cost_saved="$2.1万", status="COMPLETED"),
                    PreemptiveAction(id="a6", target_order="ORD-2026-0967", strategy="燃油远期合约对冲", cost_saved="$0.9万", status="COMPLETED"),
                    PreemptiveAction(id="a7", target_order="ORD-2026-0978", strategy="中欧班列运力预占", cost_saved="$1.8万", status="COMPLETED"),
                    PreemptiveAction(id="a8", target_order="ORD-2026-0985", strategy="战略库存前置部署", cost_saved="$0.7万", status="COMPLETED"),
                    PreemptiveAction(id="a9", target_order="ORD-2026-0992", strategy="替代供应商激活 (Tier-2)", cost_saved="$1.3万", status="EXECUTING"),
                    PreemptiveAction(id="a10", target_order="ORD-2026-1005", strategy="客户预期管理 + SLA 协商", cost_saved="$0.5万", status="EXECUTING"),
                    PreemptiveAction(id="a11", target_order="ORD-2026-1018", strategy="保险条款动态调整", cost_saved="$0.4万", status="QUEUED"),
                    PreemptiveAction(id="a12", target_order="ORD-2026-1027", strategy="碳排放额度动态调配", cost_saved="$0.8万", status="QUEUED"),
                ],
            ),
            24: PredictionTimeData(
                offset_hours=24,
                label="+24H 预测",
                narrative=(
                    "未来24小时，鹿特丹港泊位紧张情况将加剧，拥堵概率升至68%，"
                    "建议提前调整靠泊计划，启用备用内陆运输线路。"
                ),
                risks=[
                    RiskRadar(id="r1", hazard_type="气象异常", probability=40, impact_region="北太平洋 + 东亚沿海", estimated_loss="$22万/日", severity="MODERATE"),
                    RiskRadar(id="r2", hazard_type="港口拥堵", probability=68, impact_region="鹿特丹港 + 安特卫普", estimated_loss="$42万/日", severity="HIGH"),
                    RiskRadar(id="r3", hazard_type="政策变动", probability=33, impact_region="欧洲主要港口群", estimated_loss="$68万/日", severity="MODERATE"),
                    RiskRadar(id="r4", hazard_type="运力波动", probability=51, impact_region="全球航运主干道", estimated_loss="$110万/周", severity="HIGH"),
                    RiskRadar(id="r5", hazard_type="地缘风险", probability=78, impact_region="红海-苏伊士运河", estimated_loss="$150万/日", severity="HIGH"),
                ],
                actions=[
                    PreemptiveAction(id="a1", target_order="ORD-2026-1024", strategy="紧急航线重规划 (好望角)", cost_saved="$6.7万", status="EXECUTING"),
                    PreemptiveAction(id="a2", target_order="ORD-2026-1038", strategy="中欧班列分流启动", cost_saved="$3.4万", status="QUEUED"),
                    PreemptiveAction(id="a3", target_order="ORD-2026-1045", strategy="燃油远期合约锁定", cost_saved="$8.9万", status="COMPLETED"),
                    PreemptiveAction(id="a4", target_order="ORD-2026-1052", strategy="港口罢工应急预案就绪", cost_saved="$12万", status="QUEUED"),
                    PreemptiveAction(id="a5", target_order="ORD-2026-1067", strategy="碳排放额度动态调配", cost_saved="$3.1万", status="EXECUTING"),
                ],
            ),
            48: PredictionTimeData(
                offset_hours=48,
                label="+48H 预测",
                narrative=(
                    "未来48小时，东南亚海域台风预警生效，南海航线时效延误风险上升至47%，"
                    "建议部分高时效订单切换空运备选方案。"
                ),
                risks=[
                    RiskRadar(id="r1", hazard_type="气象异常", probability=62, impact_region="西北太平洋台风走廊", estimated_loss="$35万/日", severity="MODERATE"),
                    RiskRadar(id="r2", hazard_type="港口拥堵", probability=71, impact_region="新加坡 + 鹿特丹 + 洛杉矶", estimated_loss="$58万/日", severity="HIGH"),
                    RiskRadar(id="r3", hazard_type="政策变动", probability=48, impact_region="德国汉堡 + 英国费利克斯托", estimated_loss="$92万/日", severity="HIGH"),
                    RiskRadar(id="r4", hazard_type="运力波动", probability=28, impact_region="半导体关键节点", estimated_loss="$320万/批次", severity="CRITICAL"),
                    RiskRadar(id="r5", hazard_type="地缘风险", probability=85, impact_region="红海 + 阿曼湾", estimated_loss="$210万/日", severity="CRITICAL"),
                ],
                actions=[
                    PreemptiveAction(id="a1", target_order="ORD-2026-1102", strategy="全局多式联运应急调度", cost_saved="$14.5万", status="EXECUTING"),
                    PreemptiveAction(id="a2", target_order="ORD-2026-1118", strategy="战略库存前置部署", cost_saved="$7.8万", status="COMPLETED"),
                    PreemptiveAction(id="a3", target_order="ORD-2026-1125", strategy="替代供应商激活 (Tier-2)", cost_saved="$5.6万", status="QUEUED"),
                    PreemptiveAction(id="a4", target_order="ORD-2026-1134", strategy="保险条款动态调整", cost_saved="$21万", status="EXECUTING"),
                    PreemptiveAction(id="a5", target_order="ORD-2026-1141", strategy="客户预期管理 + SLA 协商", cost_saved="$9.2万", status="QUEUED"),
                ],
            ),
            72: PredictionTimeData(
                offset_hours=72,
                label="+72H 远景",
                narrative=(
                    "未来72小时，北美西海岸劳资谈判风险升级，港口作业效率预计下降30%，"
                    "建议启动美西航线绕行预案，规避大面积延误。"
                ),
                risks=[
                    RiskRadar(id="r1", hazard_type="气象异常", probability=38, impact_region="关键物流枢纽城市", estimated_loss="$520万/月", severity="MODERATE"),
                    RiskRadar(id="r2", hazard_type="港口拥堵", probability=75, impact_region="全球主干港口网络", estimated_loss="$280万/日", severity="CRITICAL"),
                    RiskRadar(id="r3", hazard_type="政策变动", probability=36, impact_region="跨境贸易合规框架", estimated_loss="$80万/批", severity="HIGH"),
                    RiskRadar(id="r4", hazard_type="运力波动", probability=75, impact_region="全球主干航运网络", estimated_loss="$450万/日", severity="HIGH"),
                    RiskRadar(id="r5", hazard_type="地缘风险", probability=68, impact_region="远东-欧洲燃料补给链", estimated_loss="$280万/日", severity="CRITICAL"),
                ],
                actions=[
                    PreemptiveAction(id="a1", target_order="ORD-2026-1201", strategy="全球供应链重构计划启动", cost_saved="$38万", status="EXECUTING"),
                    PreemptiveAction(id="a2", target_order="ORD-2026-1215", strategy="数字孪生平台采购立项", cost_saved="$120万/年", status="QUEUED"),
                    PreemptiveAction(id="a3", target_order="ORD-2026-1228", strategy="战略合作伙伴风险共担协议", cost_saved="$56万", status="COMPLETED"),
                    PreemptiveAction(id="a4", target_order="ORD-2026-1235", strategy="新能源船队优先调度", cost_saved="$23万", status="QUEUED"),
                    PreemptiveAction(id="a5", target_order="ORD-2026-1249", strategy="AI 预测模型迭代升级 v3.2", cost_saved="$67万", status="EXECUTING"),
                ],
            ),
        }


predictive_sandbox_service = PredictiveSandboxService()
