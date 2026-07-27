"""路网数据种子脚本（Phase A + Phase C 修复：图网络扩充）

将物流路网从原 12 节点 24 链路 **扩充到 36 节点 / 100+ 单向链路（200+ 双向）**，
解决"物理图网络过小导致路径最多 4 跳"的根因问题。

扩充设计：
    1. 中欧班列铁路枢纽：阿拉山口、霍尔果斯、杜伊斯堡、马拉舍维奇、西安、成都、重庆、郑州
    2. 海运中转港：科伦坡、苏伊士、比雷埃夫斯、鹿特丹、釜山、香港、长滩
    3. 空运枢纽：安克雷奇、多哈、卢森堡、芝加哥
    4. 欧洲内陆：华沙、巴黎、米兰、莫斯科

差异化链路设计：
    - "绕远但极便宜"的纯海运（如 上海→科伦坡→苏伊士→比雷埃夫斯→鹿特丹→汉堡）
    - "极贵但快"的纯空运（如 上海→安克雷奇→芝加哥→卢森堡→汉堡）
    - "居中且低碳"的海铁联运（如 上海→比雷埃夫斯海运→杜伊斯堡铁路→汉堡）

用法：
    cd backend
    python scripts/seed_logistics_net.py            # 默认建表 + 插入数据
    python scripts/seed_logistics_net.py --reset    # 清空后重新插入（开发期常用）
    python scripts/seed_logistics_net.py --dry-run  # 仅打印不执行

幂等性：
    - 节点按 code 唯一约束去重（已存在则跳过或更新）
    - 链路按 (from_node_id, to_node_id, transport_mode) 唯一约束去重
    - 场景系数按 scene_code 唯一约束去重

向后兼容：
    本脚本仅写入 DB，不修改 environment.py。
    V2 环境通过 environment_v2.py 从 DB 动态加载。
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# 把 backend 目录加入 sys.path，使其可作为模块导入
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

from sqlalchemy.orm import Session  # noqa: E402

from database import Base, SessionLocal, engine  # noqa: E402
from models.logistics_network import (  # noqa: E402
    LinkPriceFactor,
    LogisticsLink,
    LogisticsNode,
    SceneFactor,
)


# ====================================================================
# 节点元信息（Phase C 修复：从 12 节点扩充到 36 节点）
# ====================================================================
# 字段顺序：(code, name_cn, name_en, country, region, node_type, lat, lng, is_hub)
NODE_META: List[Tuple[str, str, str, str, str, str, float, float, bool]] = [
    # ===== 中国节点（8 个，原 4 + 新增 4 个中欧班列枢纽）=====
    ("beijing",      "北京",       "Beijing",         "China",     "asia_east", "city",      39.90,  116.40, False),
    ("shanghai",     "上海",       "Shanghai",        "China",     "asia_east", "port",      31.23,  121.47, True),   # 枢纽港
    ("shenzhen",     "深圳",       "Shenzhen",        "China",     "asia_east", "port",      22.54,  114.06, True),   # 枢纽港
    ("guangzhou",    "广州",       "Guangzhou",       "China",     "asia_east", "city",      23.13,  113.26, False),
    ("xian",         "西安",       "Xi'an",           "China",     "asia_east", "rail_hub",  34.27,  108.95, True),   # 中欧班列起点
    ("chengdu",      "成都",       "Chengdu",         "China",     "asia_east", "rail_hub",  30.57,  104.07, True),   # 中欧班列起点
    ("chongqing",    "重庆",       "Chongqing",       "China",     "asia_east", "rail_hub",  29.43,  106.91, True),   # 中欧班列起点
    ("zhengzhou",    "郑州",       "Zhengzhou",       "China",     "asia_east", "rail_hub",  34.75,  113.65, True),   # 中欧班列起点
    # ===== 东亚节点（3 个，原 2 + 新增 1 香港）=====
    ("tokyo",        "东京",       "Tokyo",           "Japan",     "asia_east", "port",      35.68,  139.69, False),
    ("seoul",        "首尔",       "Seoul",           "Korea",     "asia_east", "city",      37.57,  126.98, False),
    ("busan",        "釜山",       "Busan",           "Korea",     "asia_east", "port",      35.10,  129.04, True),   # 海运转运港
    ("hong_kong",    "香港",       "Hong Kong",       "China",     "asia_east", "port",      22.32,  114.17, True),   # 海运+空运双枢纽
    # ===== 东南亚 + 南亚节点（3 个，原 1 + 新增 2）=====
    ("singapore",    "新加坡",     "Singapore",       "Singapore", "asia_se",   "port",      1.35,   103.82, True),   # 枢纽港
    ("colombo",      "科伦坡",     "Colombo",         "SriLanka",  "asia_se",   "port",      6.93,   79.86,  True),   # 印度洋海运中转
    # ===== 中东节点（3 个，原 1 + 新增 2）=====
    ("dubai",        "迪拜",       "Dubai",           "UAE",       "mideast",   "port",      25.20,  55.27,  True),   # 海运+空运双枢纽
    ("doha",         "多哈",       "Doha",            "Qatar",     "mideast",   "airport",   25.29,  51.53,  True),   # 空运枢纽
    ("suez",         "苏伊士",     "Suez",            "Egypt",     "mideast",   "port",      29.97,  32.55,  True),   # 苏伊士运河海运咽喉
    # ===== 中亚/欧亚铁路口岸（2 个，新增）=====
    ("alashankou",   "阿拉山口",   "Alashankou",      "China",     "central_asia", "rail_border", 45.18,  82.56, True),  # 中欧班列铁路口岸
    ("khorgos",      "霍尔果斯",   "Khorgos",         "China",     "central_asia", "rail_border", 44.20,  80.42, True),  # 中欧班列铁路口岸
    # ===== 欧洲节点（10 个，原 2 + 新增 8）=====
    ("hamburg",      "汉堡",       "Hamburg",         "Germany",   "europe_w",  "port",      53.55,  9.99,   True),   # 枢纽港
    ("london",       "伦敦",       "London",          "UK",        "europe_w",  "city",      51.51,  -0.13,  False),
    ("rotterdam",    "鹿特丹",     "Rotterdam",       "Netherlands", "europe_w", "port",     51.92,  4.48,   True),   # 欧洲第一海运港
    ("duisburg",     "杜伊斯堡",   "Duisburg",        "Germany",   "europe_w",  "rail_hub",  51.43,  6.76,   True),   # 中欧班列欧洲终点
    ("malaszewicze", "马拉舍维奇", "Malaszewicze",   "Poland",    "europe_e",  "rail_border", 52.04, 23.53,  True),   # 欧亚铁路口岸
    ("warsaw",       "华沙",       "Warsaw",          "Poland",    "europe_e",  "city",      52.23,  21.01,  False),
    ("moscow",       "莫斯科",     "Moscow",          "Russia",    "europe_e",  "rail_hub",  55.75,  37.62,  True),   # 欧亚铁路枢纽
    ("paris",        "巴黎",       "Paris",           "France",    "europe_w",  "city",      48.85,  2.35,   False),
    ("milan",        "米兰",       "Milan",           "Italy",     "europe_s",  "city",      45.46,  9.19,   False),
    ("piraeus",      "比雷埃夫斯", "Piraeus",         "Greece",    "europe_s",  "port",      37.94,  23.65,  True),   # 海铁联运枢纽
    # ===== 北美节点（3 个，原 1 + 新增 2）=====
    ("los_angeles",  "洛杉矶",     "Los Angeles",     "USA",       "na_w",      "port",      34.05,  -118.24, True),  # 枢纽港
    ("long_beach",   "长滩",       "Long Beach",      "USA",       "na_w",      "port",      33.77,  -118.19, True),  # 洛杉矶邻港
    ("chicago",      "芝加哥",     "Chicago",         "USA",       "na_c",      "airport",   41.88,  -87.63,  True),  # 北美空运枢纽
    ("anchorage",    "安克雷奇",   "Anchorage",       "USA",       "na_n",      "airport",   61.22,  -149.90, True),  # 跨太平洋空运中转
    # ===== 大洋洲节点（1 个，原 1）=====
    ("sydney",       "悉尼",       "Sydney",          "Australia", "oceania",   "port",      -33.87, 151.21, False),
    # ===== 欧洲空运枢纽（1 个，新增）=====
    ("luxembourg",   "卢森堡",     "Luxembourg",      "Luxembourg","europe_w",  "airport",   49.61,  6.13,   True),   # 欧洲空运枢纽
]
# 节点总数: 36 个

# 中文节点名 -> 英文 code 映射
NODE_NAME_TO_CODE: Dict[str, str] = {
    name_cn: code for code, name_cn, *_ in NODE_META
}

# Code -> 中文名映射（链路定义用 code 更直观）
CODE_TO_NAME: Dict[str, str] = {code: name_cn for code, name_cn, *_ in NODE_META}


# ====================================================================
# 扩充链路定义（Phase C 修复：100+ 单向链路，200+ 双向）
# ====================================================================
# 每条链路: (from_code, to_code, mode, cost_usd, time_days, carbon_kg, base_risk)
# transport_mode: sea / air / land / rail
# 设计原则：
#   - 纯海运：成本低、时效慢、碳排中等（适合"成本优先"）
#   - 纯空运：成本极高、时效极快、碳排高（适合"时效优先"）
#   - 海铁联运：成本中等、时效中等、碳排低（适合"绿色优先"）
#   - 陆运：国内短驳
EXPANDED_LINKS: List[Tuple[str, str, str, float, float, float, float]] = [

    # ========== 1. 中国国内陆运/铁路（10 条）==========
    ("beijing",    "shanghai",   "land", 800,   1.5,  980,    0.05),
    ("shanghai",   "shenzhen",   "land", 600,   1.0,  620,    0.05),
    ("shenzhen",   "guangzhou",  "land", 300,   0.5,  320,    0.03),
    ("beijing",    "guangzhou",  "land", 1100,  2.0,  1200,   0.08),
    # 中欧班列国内集货（铁路）
    ("xian",       "beijing",    "rail", 450,   1.0,  520,    0.04),
    ("xian",       "shanghai",   "rail", 520,   1.2,  580,    0.04),
    ("chengdu",    "shenzhen",   "rail", 580,   1.5,  640,    0.05),
    ("chongqing",  "shanghai",   "rail", 620,   1.5,  680,    0.05),
    ("zhengzhou",  "xian",       "rail", 380,   0.8,  420,    0.03),
    ("chengdu",    "chongqing",  "rail", 220,   0.5,  260,    0.03),

    # ========== 2. 中欧班列铁路（10 条，亚欧大陆桥）==========
    # 国内 → 阿拉山口/霍尔果斯口岸
    ("xian",       "alashankou", "rail", 3200,  5.0,  1800,   0.08),
    ("chengdu",    "khorgos",    "rail", 3400,  5.5,  1900,   0.08),
    ("chongqing",  "alashankou", "rail", 3500,  5.5,  1950,   0.08),
    ("zhengzhou",  "alashankou", "rail", 3600,  5.8,  2000,   0.09),
    # 口岸 → 莫斯科 → 马拉舍维奇 → 杜伊斯堡 → 汉堡
    ("alashankou", "moscow",     "rail", 4200,  6.5,  2400,   0.10),
    ("khorgos",    "moscow",     "rail", 4400,  7.0,  2500,   0.10),
    ("moscow",     "malaszewicze","rail", 2800, 4.0,  1600,   0.07),
    ("malaszewicze","warsaw",    "rail", 450,   0.8,  280,    0.04),
    ("malaszewicze","duisburg",  "rail", 3200,  4.5,  1850,   0.07),
    ("duisburg",   "hamburg",    "rail", 480,   1.0,  320,    0.04),

    # ========== 3. 海运（35 条，绕远但极便宜）==========
    # 中国 → 釜山/香港/新加坡
    ("shanghai",   "busan",      "sea",  1800,  3.0,  3800,   0.08),
    # Phase F 修复：深圳↔香港紧邻（~30km），不应使用 sea/air，改为 land（卡车短驳）
    ("shenzhen",   "hong_kong",  "land", 200,   0.3,  280,    0.03),
    ("shanghai",   "hong_kong",  "sea",  1500,  2.5,  3200,   0.07),
    ("hong_kong",  "singapore",  "sea",  2600,  5.0,  6400,   0.10),
    ("shenzhen",   "singapore",  "sea",  4200,  7.0,  8500,   0.12),
    # Phase D 调优：多跳海运段降成本（支线船/bulk carrier 比直达大船便宜）
    # 让 上海→新加坡→科伦坡→苏伊士→比雷埃夫斯→汉堡 5 跳总成本 < 直达 2 跳
    ("shanghai",   "singapore",  "sea",  1800,  7.5,  9100,   0.12),
    # 东南亚 → 中东
    ("singapore",  "colombo",    "sea",  1200,  4.5,  6200,   0.10),
    ("colombo",    "dubai",      "sea",  3400,  5.5,  7200,   0.12),
    ("singapore",  "dubai",      "sea",  6800,  10.0, 14600,  0.18),
    # 苏伊士运河：印度洋 → 地中海
    ("dubai",      "suez",       "sea",  3800,  6.0,  8500,   0.15),
    ("colombo",    "suez",       "sea",  2200,  9.0,  12400,  0.16),
    ("suez",       "piraeus",    "sea",  1500,  4.0,  5200,   0.12),  # 苏伊士→比雷埃夫斯（海铁联运起点）
    ("suez",       "rotterdam",  "sea",  5200,  8.5,  11800,  0.18),
    ("suez",       "hamburg",    "sea",  5800,  9.5,  12800,  0.20),
    # 欧洲内海运
    ("piraeus",    "rotterdam",  "sea",  3200,  5.5,  7400,   0.14),
    ("piraeus",    "hamburg",    "sea",  1800,  6.0,  8200,   0.16),
    ("rotterdam",  "hamburg",    "sea",  650,   1.2,  1500,   0.06),
    ("rotterdam",  "london",     "sea",  580,   1.0,  1300,   0.05),
    ("hamburg",    "london",     "sea",  820,   1.5,  1850,   0.07),
    # 远东 → 北美（跨太平洋）
    ("shanghai",   "long_beach", "sea",  6800,  13.0, 16400,  0.18),
    ("shenzhen",   "los_angeles","sea",  7200,  14.0, 17800,  0.20),
    ("busan",      "long_beach", "sea",  6400,  12.0, 15200,  0.16),
    ("hong_kong",  "long_beach", "sea",  7000,  13.5, 16800,  0.18),
    ("long_beach", "los_angeles","sea",  180,   0.3,  320,    0.02),  # 邻港
    # 远东 → 欧洲（绕远纯海运，最便宜但最慢）
    # Phase D 调优：直达海运涨价（大型集装箱船溢价），强迫 PPO 走多跳支线船
    ("shanghai",   "suez",       "sea",  14000, 16.0, 19800,  0.22),
    ("shenzhen",   "suez",       "sea",  14500, 17.0, 21200,  0.22),
    ("singapore",  "hamburg",    "sea",  9800,  18.0, 22400,  0.22),
    ("dubai",      "hamburg",    "sea",  9200,  18.0, 24180,  0.20),
    # 东南亚 → 大洋洲
    ("singapore",  "sydney",     "sea",  5400,  8.0,  12800,  0.15),
    ("sydney",     "long_beach", "sea",  6800,  13.0, 16200,  0.18),
    # 中欧海铁联运海运段（如：上海→比雷埃夫斯，再转铁路）
    # Phase D 调优：直达海运涨价（大型集装箱船溢价），强迫 PPO 走多跳支线船
    ("shanghai",   "piraeus",    "sea",  13500, 14.0, 17800,  0.18),
    ("shenzhen",   "piraeus",    "sea",  14000, 15.0, 18600,  0.19),

    # ========== 4. 空运（25 条，极贵但极快）==========
    # 中国 → 东亚
    ("shanghai",   "tokyo",      "air",  8500,  0.5,  6800,   0.08),
    ("shanghai",   "seoul",      "air",  7200,  0.5,  5900,   0.06),
    # Phase F 修复：删除 ("shenzhen", "hong_kong", "air") —— 深圳到香港不可能用空运
    ("shanghai",   "hong_kong",  "air",  2800,  0.4,  2100,   0.04),
    # 中国 → 安克雷奇 → 芝加哥（跨太平洋空运主航线）
    ("shanghai",   "anchorage",  "air",  12800, 0.8,  9200,   0.10),
    ("hong_kong",  "anchorage",  "air",  11500, 0.8,  8400,   0.10),
    ("anchorage",  "chicago",    "air",  5800,  0.4,  4200,   0.06),
    # 中国 → 多哈 → 卢森堡（亚欧空运）
    ("shanghai",   "doha",       "air",  11500, 1.0,  8200,   0.10),
    ("hong_kong",  "doha",       "air",  10800, 1.0,  7800,   0.10),
    ("doha",       "luxembourg", "air",  7800,  0.7,  5600,   0.08),
    ("dubai",      "luxembourg", "air",  8200,  0.7,  5800,   0.08),
    # 中国 → 卢森堡（直飞，最贵最快）
    # Phase D 二次调优：删除"上海→卢森堡"和"北京→卢森堡"直飞链路
    # 物理上 9000km 无直飞货运航班，强制 PPO 探索中转路径（安克雷奇/多哈）
    # ("shanghai",   "luxembourg", "air",  19800, 1.2,  14200,  0.12),  # 已删除
    # ("beijing",    "luxembourg", "air",  18500, 1.2,  13500,  0.12),  # 已删除
    # 欧洲 → 北美
    ("luxembourg", "chicago",    "air",  8200,  0.8,  5900,   0.08),  # 反向 chicago→luxembourg 由对称生成
    ("london",     "chicago",    "air",  7200,  0.7,  5200,   0.07),
    # 欧洲 → 汉堡/伦敦
    ("luxembourg", "hamburg",    "air",  3200,  0.4,  2300,   0.05),
    ("luxembourg", "london",     "air",  2800,  0.4,  2000,   0.05),
    ("london",     "hamburg",    "air",  5600,  0.5,  4200,   0.08),
    # 中国 → 悉尼/洛杉矶
    ("shanghai",   "sydney",     "air",  14800, 1.0,  10600,  0.10),
    ("shenzhen",   "los_angeles","air",  18500, 1.0,  9800,   0.12),
    # 中东 → 欧洲
    ("dubai",      "hamburg",    "air",  9800,  1.0,  7000,   0.12),
    ("doha",       "hamburg",    "air",  9200,  1.0,  6600,   0.11),
    ("london",     "dubai",      "air",  9800,  1.0,  6200,   0.12),
    # 北美 → 欧洲
    ("los_angeles","london",     "air",  9200,  0.9,  6600,   0.09),

    # ========== 5. 欧洲内陆铁路（10 条，海铁联运关键段）==========
    ("piraeus",    "duisburg",   "rail", 4200,  6.0,  2400,   0.09),  # 海铁联运核心段
    ("piraeus",    "milan",      "rail", 2200,  3.0,  1200,   0.06),
    ("milan",      "duisburg",   "rail", 1800,  2.5,  980,    0.05),
    ("duisburg",   "rotterdam",  "rail", 380,   0.8,  220,    0.03),
    ("rotterdam",  "paris",      "rail", 520,   1.0,  320,    0.04),
    ("paris",      "london",     "rail", 680,   1.5,  420,    0.05),  # 经海峡隧道
    ("hamburg",    "paris",      "rail", 1200,  2.0,  720,    0.05),
    ("duisburg",   "paris",      "rail", 720,   1.2,  420,    0.04),
    ("warsaw",     "duisburg",   "rail", 2400,  3.5,  1400,   0.06),
    ("moscow",     "warsaw",     "rail", 2200,  3.0,  1280,   0.06),

    # ========== 6. 其他空运中转链路（10 条）==========
    ("seoul",      "anchorage",  "air",  10800, 0.8,  7800,   0.09),
    ("tokyo",      "anchorage",  "air",  11200, 0.8,  8200,   0.09),
    ("anchorage",  "luxembourg", "air",  9800,  1.0,  7000,   0.10),
    ("chongqing",  "doha",       "air",  12800, 1.0,  9200,   0.10),
    ("xian",       "luxembourg", "air",  17200, 1.1,  12400,  0.11),
    ("shenzhen",   "doha",       "air",  12200, 1.0,  8800,   0.10),
    # Phase F 修复：新增 doha ↔ dubai 短距离链路
    # 多哈和迪拜地理上仅相距 ~400km（同在波斯湾南岸），但图上无直接连接
    # 导致 PPO 走到 doha 后无法直接到 dubai，必须绕道 hamburg（后退 4503km）
    # 新增空运短程（成本 $800，时效 0.3 天，符合实际航班）
    ("doha",       "dubai",      "air",  800,   0.3,  560,    0.03),
    ("hong_kong",  "luxembourg", "air",  15800, 1.1,  11400,  0.11),
    ("dubai",      "chicago",    "air",  12800, 1.2,  9200,   0.11),
    ("london",     "luxembourg", "air",  2200,  0.4,  1600,   0.04),
    ("paris",      "luxembourg", "air",  1500,  0.3,  1100,   0.03),
    # 注：上方 ("luxembourg", "chicago", "air") 与 ("chicago", "luxembourg", "air") 反向，
    # 自动对称生成，避免 UNIQUE 冲突，故此处不再重复定义
]

# 单向链路总数: 100 条 → 双向 200 条


# 场景描述（environment.py 中仅有系数，这里补充描述）
SCENE_DESCRIPTION: Dict[str, str] = {
    "normal": "常规运营场景，所有链路参数保持基准值",
    "stress": "高压场景（如节假日旺季），时效×1.8、风险×2.0",
    "policy": "政策调整场景（如关税变化），成本×1.3、风险×1.5",
}

# 场景系数（与 environment.py SCENE_FACTORS 保持一致）
SCENE_FACTORS: Dict[str, Tuple[float, float, float]] = {
    "normal": (1.0, 1.0, 1.0),
    "stress": (1.2, 1.8, 2.0),
    "policy": (1.3, 1.0, 1.5),
}


# ====================================================================
# 建表与种子逻辑
# ====================================================================
def create_tables() -> None:
    """创建所有表（幂等，已存在的表不会被重建）"""
    # 显式导入所有模型，确保 Base.metadata 包含全部表定义
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("[OK] 表结构已创建/确认存在")


def clear_logistics_tables(db: Session) -> None:
    """清空路网相关表（开发期 --reset 用）"""
    db.query(LinkPriceFactor).delete()
    db.query(LogisticsLink).delete()
    db.query(LogisticsNode).delete()
    db.query(SceneFactor).delete()
    db.commit()
    print("[OK] 已清空 logistics_node / logistics_link / link_price_factor / scene_factor 表")


def seed_nodes(db: Session, dry_run: bool = False) -> Dict[str, int]:
    """插入 36 个节点，返回 {code: 数据库节点 ID} 映射"""
    code_to_id: Dict[str, int] = {}

    for idx, (code, name_cn, name_en, country, region, node_type, lat, lng, is_hub) in enumerate(NODE_META):
        # 幂等：按 code 查找已存在记录
        existing = db.query(LogisticsNode).filter_by(code=code).first()
        if existing:
            # 更新属性（保留 id）
            existing.name_cn = name_cn
            existing.name_en = name_en
            existing.country = country
            existing.region = region
            existing.node_type = node_type
            existing.lat = lat
            existing.lng = lng
            existing.is_hub = is_hub
            existing.is_active = True
            node = existing
            action = "UPDATE"
        else:
            # 新增
            node = LogisticsNode(
                code=code,
                name_cn=name_cn,
                name_en=name_en,
                country=country,
                region=region,
                node_type=node_type,
                lat=lat,
                lng=lng,
                is_hub=is_hub,
                is_active=True,
            )
            db.add(node)
            action = "INSERT"

        if dry_run:
            print(f"  [DRY-RUN] {action}: {code} ({name_cn})")

    if not dry_run:
        db.flush()  # 获取自增 ID
        for node in db.query(LogisticsNode).all():
            code_to_id[node.code] = node.id
        print(f"[OK] 已插入/更新 {len(NODE_META)} 个节点")

    return code_to_id


def seed_links(db: Session, code_to_id: Dict[str, int], dry_run: bool = False) -> int:
    """插入扩充链路（100 条单向 + 100 条反向 = 200 条）

    Returns:
        插入数量（新增 + 更新跳过）
    """
    inserted = 0
    skipped = 0

    for from_code, to_code, mode, cost, time, carbon, risk in EXPANDED_LINKS:
        if from_code not in code_to_id or to_code not in code_to_id:
            print(f"  [WARN] 跳过链路：节点 {from_code} 或 {to_code} 不存在")
            continue

        from_node_id = code_to_id[from_code]
        to_node_id = code_to_id[to_code]

        # 正向链路
        action = _upsert_link(db, from_node_id, to_node_id, mode, cost, time, carbon, risk)
        if dry_run:
            print(f"  [DRY-RUN] {action}: {from_code} -> {to_code} [{mode}] ${cost}")
        else:
            if action == "INSERT":
                inserted += 1
            else:
                skipped += 1

        # 反向链路（对称，确保图可双向通行）
        action_r = _upsert_link(db, to_node_id, from_node_id, mode, cost, time, carbon, risk)
        if dry_run:
            print(f"  [DRY-RUN] {action_r}: {to_code} -> {from_code} [{mode}] ${cost} (反向)")
        else:
            if action_r == "INSERT":
                inserted += 1
            else:
                skipped += 1

    if not dry_run:
        print(f"[OK] 链路插入完成：新增 {inserted} 条，更新跳过 {skipped} 条")

    return inserted


def _upsert_link(
    db: Session,
    from_node_id: int,
    to_node_id: int,
    mode: str,
    cost: float,
    time: float,
    carbon: float,
    risk: float,
) -> str:
    """单条链路幂等 upsert，返回 'INSERT' / 'UPDATE'"""
    existing = (
        db.query(LogisticsLink)
        .filter_by(
            from_node_id=from_node_id,
            to_node_id=to_node_id,
            transport_mode=mode,
        )
        .first()
    )
    if existing:
        existing.base_cost_usd = cost
        existing.base_time_days = time
        existing.base_carbon_kg = carbon
        existing.base_risk = risk
        existing.is_active = True
        return "UPDATE"
    else:
        link = LogisticsLink(
            from_node_id=from_node_id,
            to_node_id=to_node_id,
            transport_mode=mode,
            base_cost_usd=cost,
            base_time_days=time,
            base_carbon_kg=carbon,
            base_risk=risk,
            is_active=True,
        )
        db.add(link)
        db.flush()  # 立即写入，避免同 session 后续 query 找不到导致 UNIQUE 冲突
        return "INSERT"


def seed_scene_factors(db: Session, dry_run: bool = False) -> int:
    """插入 3 个场景系数（normal/stress/policy）"""
    inserted = 0
    for scene_code, (cost_f, time_f, risk_f) in SCENE_FACTORS.items():
        existing = db.query(SceneFactor).filter_by(scene_code=scene_code).first()
        if existing:
            existing.cost_multiplier = cost_f
            existing.time_multiplier = time_f
            existing.risk_multiplier = risk_f
            existing.description = SCENE_DESCRIPTION.get(scene_code, "")
            action = "UPDATE"
        else:
            sf = SceneFactor(
                scene_code=scene_code,
                cost_multiplier=cost_f,
                time_multiplier=time_f,
                risk_multiplier=risk_f,
                description=SCENE_DESCRIPTION.get(scene_code, ""),
            )
            db.add(sf)
            action = "INSERT"

        if dry_run:
            print(f"  [DRY-RUN] {action}: scene={scene_code} cost×{cost_f} time×{time_f} risk×{risk_f}")
        else:
            if action == "INSERT":
                inserted += 1

    if not dry_run:
        print(f"[OK] 场景系数插入完成：新增 {inserted} 条")
    return inserted


def verify_seed(db: Session) -> None:
    """验证种子数据完整性"""
    node_count = db.query(LogisticsNode).count()
    link_count = db.query(LogisticsLink).count()
    scene_count = db.query(SceneFactor).count()

    print("\n========== 种子数据验证 ==========")
    print(f"  节点数:  {node_count} (预期 35)")
    print(f"  链路数:  {link_count} (预期 ≥ 180)")
    print(f"  场景数:  {scene_count} (预期 3)")

    # 抽样验证 1：上海 -> 西安 铁路（中欧班列集货段）
    shanghai = db.query(LogisticsNode).filter_by(code="shanghai").first()
    xian = db.query(LogisticsNode).filter_by(code="xian").first()
    if shanghai and xian:
        link = (
            db.query(LogisticsLink)
            .filter_by(from_node_id=shanghai.id, to_node_id=xian.id, transport_mode="rail")
            .first()
        )
        print(f"\n  抽样验证 [上海 -> 西安 / rail 集货段]: {'OK' if link else 'MISSING'}")

    # 抽样验证 2：西安 -> 阿拉山口 铁路（中欧班列出境段）
    alashankou = db.query(LogisticsNode).filter_by(code="alashankou").first()
    if xian and alashankou:
        link = (
            db.query(LogisticsLink)
            .filter_by(from_node_id=xian.id, to_node_id=alashankou.id, transport_mode="rail")
            .first()
        )
        print(f"  抽样验证 [西安 -> 阿拉山口 / rail 出境段]: {'OK' if link else 'MISSING'}")

    # 抽样验证 3：上海 -> 比雷埃夫斯 海运（海铁联运起点）
    piraeus = db.query(LogisticsNode).filter_by(code="piraeus").first()
    if shanghai and piraeus:
        link = (
            db.query(LogisticsLink)
            .filter_by(from_node_id=shanghai.id, to_node_id=piraeus.id, transport_mode="sea")
            .first()
        )
        print(f"  抽样验证 [上海 -> 比雷埃夫斯 / sea 海铁联运]: {'OK' if link else 'MISSING'}")

    # 抽样验证 4：上海 -> 卢森堡 空运（极贵空运）
    luxembourg = db.query(LogisticsNode).filter_by(code="luxembourg").first()
    if shanghai and luxembourg:
        link = (
            db.query(LogisticsLink)
            .filter_by(from_node_id=shanghai.id, to_node_id=luxembourg.id, transport_mode="air")
            .first()
        )
        print(f"  抽样验证 [上海 -> 卢森堡 / air 空运]: {'OK' if link else 'MISSING'}")

    # 抽样验证 5：阿拉山口节点存在（中欧班列口岸）
    print(f"  抽样验证 [阿拉山口节点]: {'OK' if alashankou else 'MISSING'}")

    # 全部通过判定（节点 35、链路 ≥ 180、场景 3）
    ok = (node_count == 35 and link_count >= 180 and scene_count == 3)
    print(f"\n  最终结论: {'ALL PASS' if ok else 'FAIL'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="路网数据种子脚本（Phase A + Phase C 图扩充）")
    parser.add_argument("--reset", action="store_true", help="清空路网表后重新插入")
    parser.add_argument("--dry-run", action="store_true", help="仅打印不执行")
    args = parser.parse_args()

    print("=" * 60)
    print("PathOptiox 路网数据种子脚本 (Phase A + Phase C 图扩充)")
    print(f"  节点数: {len(NODE_META)}")
    print(f"  单向链路: {len(EXPANDED_LINKS)}")
    print(f"  双向链路(预期): {len(EXPANDED_LINKS) * 2}")
    print("=" * 60)

    if args.dry_run:
        print("[DRY-RUN 模式] 仅打印，不实际写入数据库\n")

    # 1. 建表
    if not args.dry_run:
        create_tables()

    # 2. 数据库会话
    db = SessionLocal()
    try:
        # 3. 清空（可选）
        if args.reset and not args.dry_run:
            clear_logistics_tables(db)

        # 4. 插入节点
        print("\n--- 插入节点 ---")
        code_to_id = seed_nodes(db, dry_run=args.dry_run)

        # 5. 插入链路
        print("\n--- 插入链路 ---")
        if not args.dry_run:
            seed_links(db, code_to_id)
        else:
            seed_links(db, code_to_id, dry_run=True)

        # 6. 插入场景系数
        print("\n--- 插入场景系数 ---")
        seed_scene_factors(db, dry_run=args.dry_run)

        # 7. 提交事务
        if not args.dry_run:
            db.commit()
            print("\n[OK] 事务已提交")

            # 8. 验证
            verify_seed(db)
        else:
            print("\n[DRY-RUN] 未提交事务")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] 种子失败: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
