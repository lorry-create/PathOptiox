"""风险仪表盘模块业务服务层

返回情报新闻列表 + 风险指标聚合数据。
字段对齐前端 riskDashboardApi.ts 的 RiskDashboardData 结构。
- IntelligenceNews.risk_level 大写：CRITICAL/HIGH/MODERATE
"""
from datetime import datetime

from schemas.risk_dashboard import (
    IntelligenceNews,
    RiskDashboardData,
    RiskMetrics,
)


def _now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


class RiskDashboardService:
    """风险仪表盘服务（模拟数据，对齐前端契约）"""

    def get_risk_metrics(self) -> RiskDashboardData:
        """返回风险仪表盘聚合数据"""
        news = [
            IntelligenceNews(
                id=1,
                title="苏伊士运河通行风险升级",
                risk_level="CRITICAL",
                region="苏伊士运河 / 红海航线",
                timestamp="2026-07-05 14:30",
            ),
            IntelligenceNews(
                id=2,
                title="上海港台风预警",
                risk_level="HIGH",
                region="上海港 / 东亚沿海",
                timestamp="2026-07-05 10:15",
            ),
            IntelligenceNews(
                id=3,
                title="欧盟 CBAM 政策生效倒计时",
                risk_level="MODERATE",
                region="欧洲主要港口群",
                timestamp="2026-07-04 16:00",
            ),
            IntelligenceNews(
                id=4,
                title="航空燃油价格周环比上涨 8.5%",
                risk_level="HIGH",
                region="全球空运网络",
                timestamp="2026-07-04 14:20",
            ),
            IntelligenceNews(
                id=5,
                title="汉堡港工会罢工预警",
                risk_level="MODERATE",
                region="汉堡港 / 北欧航线",
                timestamp="2026-07-03 11:00",
            ),
        ]
        metrics = RiskMetrics(
            congestion_index=72.4,
            weather_disruption=0.38,
            patency_rate=0.86,
            affected_routes=18,
            updated_at=_now_str(),
        )
        return RiskDashboardData(news=news, metrics=metrics)


risk_dashboard_service = RiskDashboardService()
