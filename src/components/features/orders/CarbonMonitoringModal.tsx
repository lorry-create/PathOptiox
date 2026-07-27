
import React, { useState, useEffect } from 'react';
import { X, Leaf, Cpu, Plane, Ship, Train, FileText } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useChartTheme } from '@hooks/useChartTheme';
import { MetricCard, EmissionOrderItem } from './OrderModalParts';

interface CarbonMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

interface CarbonData {
  totalEmission: string;
  totalEmissionTrend: string;
  carbonIntensity: string;
  renewableEnergy: string;
  renewableEnergyTrend: string;
  highEmissionOrders: Array<{
    id: string;
    route: string;
    value: string;
    mode: string;
    icon: React.ReactNode;
    color: string;
  }>;
  miniChartData: Array<{ val: number }>;
}

const CarbonMonitoringModal: React.FC<CarbonMonitoringModalProps> = ({ isOpen, onClose, orderId }) => {
  const [carbonData, setCarbonData] = useState<CarbonData>({
    totalEmission: '12,450',
    totalEmissionTrend: '-5.2%',
    carbonIntensity: '0.8',
    renewableEnergy: '28',
    renewableEnergyTrend: '+4.0%',
    highEmissionOrders: [
      {
        id: 'ORD-2024-002',
        route: '深圳 → 法兰克福',
        value: '1,120 kg',
        mode: '空运',
        icon: <Plane size={18} />,
        color: 'bg-red-500/10 text-red-500'
      },
      {
        id: 'ORD-2024-001',
        route: '上海 → 温哥华',
        value: '342 kg',
        mode: '海运',
        icon: <Ship size={18} />,
        color: 'bg-blue-500/10 text-blue-400'
      },
      {
        id: 'ORD-2024-009',
        route: '西安 → 杜伊斯堡',
        value: '215 kg',
        mode: '中欧班列',
        icon: <Train size={18} />,
        color: 'bg-emerald-500/10 text-emerald-400'
      }
    ],
    miniChartData: [
      { val: 40 }, { val: 35 }, { val: 42 }, { val: 38 },
      { val: 30 }, { val: 35 }, { val: 45 }, { val: 48 },
      { val: 55 }, { val: 50 }, { val: 58 }, { val: 65 }
    ]
  });

  const chartTheme = useChartTheme();

  const generateRandomCarbonData = () => {
    // 生成随机总碳排放量 (8000-15000 kg)
    const totalEmission = Math.floor(Math.random() * 7000 + 8000).toLocaleString();
    const totalEmissionTrend = (Math.random() * 10 - 7).toFixed(1) + '%';

    // 生成随机单位碳强度 (0.5-1.2 kg/ton)
    const carbonIntensity = (Math.random() * 0.7 + 0.5).toFixed(1);

    // 生成随机可再生能源比例 (15-40%)
    const renewableEnergy = Math.floor(Math.random() * 25 + 15).toString();
    const renewableEnergyTrend = (Math.random() * 6 - 1).toFixed(1) + '%';

    // 生成随机高排放订单
    const routes = [
      '深圳 → 法兰克福', '上海 → 温哥华', '西安 → 杜伊斯堡',
      '广州 → 洛杉矶', '北京 → 巴黎', '成都 → 伦敦',
      '杭州 → 纽约', '武汉 → 悉尼', '南京 → 迪拜'
    ];

    const highEmissionOrders = [];
    const usedRoutes = new Set();

    for (let i = 0; i < 3; i++) {
      let routeIndex;
      do {
        routeIndex = Math.floor(Math.random() * routes.length);
      } while (usedRoutes.has(routeIndex));
      usedRoutes.add(routeIndex);

      const route = routes[routeIndex];
      const emissionValue = Math.floor(Math.random() * 1000 + 150).toLocaleString() + ' kg';
      
      // 随机选择运输方式
      const modes = [
        { name: '空运', icon: <Plane size={18} />, color: 'bg-red-500/10 text-red-500' },
        { name: '海运', icon: <Ship size={18} />, color: 'bg-blue-500/10 text-blue-400' },
        { name: '中欧班列', icon: <Train size={18} />, color: 'bg-emerald-500/10 text-emerald-400' }
      ];
      const mode = modes[Math.floor(Math.random() * modes.length)];

      highEmissionOrders.push({
        id: `ORD-2024-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        route,
        value: emissionValue,
        mode: mode.name,
        icon: mode.icon,
        color: mode.color
      });
    }

    // 生成随机趋势图数据
    const miniChartData = [];
    for (let i = 0; i < 12; i++) {
      miniChartData.push({ val: Math.floor(Math.random() * 30 + 30) });
    }

    setCarbonData({
      totalEmission,
      totalEmissionTrend,
      carbonIntensity,
      renewableEnergy,
      renewableEnergyTrend,
      highEmissionOrders,
      miniChartData
    });
  };

  // 当模态框打开时生成随机数据
  useEffect(() => {
    if (isOpen) {
      generateRandomCarbonData();
    }
  }, [isOpen]);

  // 生成详细分析报告
  const handleGenerateReport = () => {
    // 创建一个新窗口用于生成PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // 构建PDF内容
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>碳排放详细分析报告 - ${orderId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #ffffff;
            color: #333333;
          }
          h1 {
            color: #047857;
            text-align: center;
            margin-bottom: 30px;
          }
          h2 {
            color: #059669;
            margin-top: 30px;
            border-bottom: 2px solid #d1fae5;
            padding-bottom: 10px;
          }
          h3 {
            color: #10b981;
            margin-top: 20px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .stat-card {
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 20px;
            background-color: #f0fdf4;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
            color: #047857;
          }
          .stat-trend {
            font-size: 14px;
            margin-top: 10px;
          }
          .trend-up {
            color: #059669;
          }
          .trend-down {
            color: #dc2626;
          }
          .chart-container {
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background-color: #f0fdf4;
          }
          .ai-advice {
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background-color: #ecfdf5;
            border-left: 4px solid #10b981;
          }
          .high-emission-list {
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background-color: #f0fdf4;
          }
          .emission-item {
            display: flex;
            justify-content: space-between;
            padding: 15px;
            border-bottom: 1px solid #d1fae5;
          }
          .emission-item:last-child {
            border-bottom: none;
          }
          .emission-route {
            font-weight: bold;
          }
          .emission-value {
            color: #ea580c;
            font-weight: bold;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
          }
          .info-label {
            font-weight: bold;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #718096;
            border-top: 1px solid #d1fae5;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>碳排放详细分析报告</h1>
        <div class="info-row">
          <div class="info-label">订单编号:</div>
          <div>${orderId}</div>
        </div>
        <div class="info-row">
          <div class="info-label">报告生成时间:</div>
          <div>${new Date().toLocaleString()}</div>
        </div>

        <h2>碳排放概览</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>总碳排放 (CO2)</h3>
            <div class="stat-value">${carbonData.totalEmission} kg</div>
            <div class="stat-trend ${carbonData.totalEmissionTrend.includes('-') ? 'trend-down' : 'trend-up'}">
              ${carbonData.totalEmissionTrend.includes('-') ? '↓' : '↑'} ${carbonData.totalEmissionTrend}
            </div>
          </div>
          <div class="stat-card">
            <h3>单位碳强度</h3>
            <div class="stat-value">${carbonData.carbonIntensity} kg/ton</div>
            <div class="stat-trend">能效达标</div>
          </div>
          <div class="stat-card">
            <h3>可持续燃料</h3>
            <div class="stat-value">${carbonData.renewableEnergy}%</div>
            <div class="stat-trend ${carbonData.renewableEnergyTrend.includes('+') ? 'trend-up' : 'trend-down'}">
              ${carbonData.renewableEnergyTrend.includes('+') ? '↑' : '↓'} ${carbonData.renewableEnergyTrend}
            </div>
          </div>
        </div>

        <h2>每周排放趋势</h2>
        <div class="chart-container">
          <p>最近4周碳排放趋势分析显示，排放水平保持稳定，略有${carbonData.totalEmissionTrend.includes('-') ? '下降' : '上升'}趋势。</p>
          <p>平均每周排放量: ${Math.floor((parseInt(carbonData.totalEmission.replace(/,/g, '')) / 4)).toLocaleString()} kg</p>
        </div>

        <h2>AI 减排建议</h2>
        <div class="ai-advice">
          <p>建议切换至 <strong>路线 A</strong>，预计可降低单箱碳足迹 <strong>15%</strong>。</p>
          <p>根据历史数据分析，该路线在同等运输时间下，平均碳排放量比当前路线低约18%。</p>
        </div>

        <h2>高排放订单分析 (TOP 3)</h2>
        <div class="high-emission-list">
          ${carbonData.highEmissionOrders.map((order, index) => `
            <div class="emission-item">
              <div>
                <div class="emission-route">${order.route}</div>
                <div>订单编号: ${order.id}</div>
                <div>运输方式: ${order.mode}</div>
              </div>
              <div class="emission-value">${order.value}</div>
            </div>
          `).join('')}
        </div>

        <h2>减排措施建议</h2>
        <ul>
          <li>优化运输路线，减少空驶里程</li>
          <li>提高装载率，减少运输次数</li>
          <li>使用可持续燃料，提高可再生能源比例</li>
          <li>定期维护运输工具，提高燃油效率</li>
          <li>考虑多式联运，合理选择运输方式</li>
        </ul>

        <div class="footer">
          <p>此报告由PathOptix碳排放监测系统自动生成</p>
          <p>© ${new Date().getFullYear()} PathOptix Global</p>
        </div>
      </body>
      </html>
    `;

    // 写入内容到新窗口
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // 等待内容加载完成后打印
    printWindow.onload = function() {
      printWindow.print();
      // 打印完成后关闭窗口
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300 p-0 md:p-4">
      <div className="bg-bg-elevated w-full h-full md:w-auto md:h-auto md:max-w-xl rounded-none md:rounded-[40px] border border-border-default shadow-[0_32px_128px_-16px_rgba(0,0,0,1)] overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Leaf size={24} fill="currentColor" />
            </div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-black text-text-primary tracking-tight">碳排放快览</h2>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Carbon Quick View</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted hover:text-text-primary transition-all duration-300 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-10 space-y-8">
          
          {/* Top Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard 
              label="总碳排放 (CO2)" 
              value={carbonData.totalEmission} 
              unit="kg" 
              trend={carbonData.totalEmissionTrend} 
            />
            <MetricCard 
              label="单位碳强度" 
              value={carbonData.carbonIntensity} 
              unit="kg/ton" 
              sub="能效达标" 
            />
            <MetricCard 
              label="可持续燃料" 
              value={carbonData.renewableEnergy} 
              unit="%" 
              trend={carbonData.renewableEnergyTrend} 
              isPositiveTrend={carbonData.renewableEnergyTrend.includes('+')}
            />
          </div>

          {/* Middle Section: Trend and AI Advice */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 bg-bg-elevated/40 rounded-3xl p-6 border border-border-default flex flex-col justify-between h-44">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">每周排放趋势</span>
                <span className="text-[9px] text-text-muted font-bold">最近4周</span>
              </div>
              <div className="flex-1 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={carbonData.miniChartData}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartTheme.colors[1]} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={chartTheme.colors[1]} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="val" 
                      stroke={chartTheme.colors[1]} 
                      strokeWidth={2} 
                      fill="url(#colorTrend)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="md:col-span-5 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Cpu size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">AI 减排建议</span>
              </div>
              <p className="text-[13px] text-text-secondary leading-relaxed font-medium">
                建议切换至 <span className="text-text-primary font-black">路线 A</span>，预计可降低单箱碳足迹 <span className="text-emerald-400 font-black">15%</span>。
              </p>
            </div>
          </div>

          {/* High Emission Orders List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">高排放订单 (TOP 3)</h3>
              <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">需要关注</span>
            </div>
            <div className="space-y-3">
              {carbonData.highEmissionOrders.map((order, index) => (
                <EmissionOrderItem 
                  key={index}
                  id={order.id} 
                  route={order.route} 
                  val={order.value} 
                  mode={order.mode} 
                  icon={order.icon} 
                  color={order.color} 
                />
              ))}
            </div>
          </div>

          {/* Footer Button */}
          <div className="pt-2">
            <button
              onClick={handleGenerateReport}
              className="w-full py-5 bg-emerald-500 text-bg-elevated text-sm font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.01] transition-all duration-300 active:scale-95 flex items-center justify-center gap-3"
            >
              <FileText size={18} fill="currentColor" fillOpacity={0.4} /> 生成详细分析报告
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarbonMonitoringModal;
