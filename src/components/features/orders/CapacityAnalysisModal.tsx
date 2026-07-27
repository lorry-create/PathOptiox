
import React, { useState, useEffect } from 'react';
import { X, Download, Lightbulb, Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { KPICard, RelatedPoint, LogItem } from './OrderModalParts';

interface CapacityAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

interface KPIData {
  delayRate: string;
  delayTrend: string;
  delayIsDown: boolean;
  anomalyRate: string;
  anomalyTrend: string;
  anomalyIsDown: boolean;
  carbonEmission: string;
  carbonTrend: string;
  carbonIsDown: boolean;
  loadingRate: string;
  loadingTrend: string;
  loadingIsDown: boolean;
  distance: string;
  timeRange: string;
  costRange: string;
}

const CapacityAnalysisModal: React.FC<CapacityAnalysisModalProps> = ({ isOpen, onClose, orderId }) => {
  const [kpiData, setKpiData] = useState<KPIData>({
    delayRate: '8.5%',
    delayTrend: '-1.2%',
    delayIsDown: true,
    anomalyRate: '3.2%',
    anomalyTrend: '+0.5%',
    anomalyIsDown: false,
    carbonEmission: '0.8',
    carbonTrend: '-0.1%',
    carbonIsDown: true,
    loadingRate: '85.2%',
    loadingTrend: '-1.2%',
    loadingIsDown: true,
    distance: '12000 km',
    timeRange: '14-16 天',
    costRange: '¥15000-18000'
  });

  // 生成随机KPI数据
  const generateRandomKPI = () => {
    // 生成随机延误率 (5-15%)
    const delayRate = (Math.random() * 10 + 5).toFixed(1) + '%';
    const delayTrend = (Math.random() * 2 - 1).toFixed(1) + '%';
    const delayIsDown = parseFloat(delayTrend) < 0;

    // 生成随机异常率 (1-5%)
    const anomalyRate = (Math.random() * 4 + 1).toFixed(1) + '%';
    const anomalyTrend = (Math.random() * 1 - 0.5).toFixed(1) + '%';
    const anomalyIsDown = parseFloat(anomalyTrend) < 0;

    // 生成随机单位碳排 (0.5-1.2 kg/ton)
    const carbonEmission = (Math.random() * 0.7 + 0.5).toFixed(1);
    const carbonTrend = (Math.random() * 0.5 - 0.3).toFixed(1) + '%';
    const carbonIsDown = parseFloat(carbonTrend) < 0;

    // 生成随机装载率 (75-95%)
    const loadingRate = (Math.random() * 20 + 75).toFixed(1) + '%';
    const loadingTrend = (Math.random() * 2 - 1).toFixed(1) + '%';
    const loadingIsDown = parseFloat(loadingTrend) < 0;

    // 生成随机距离 (8000-15000 km)
    const distance = Math.floor(Math.random() * 7000 + 8000) + ' km';

    // 生成随机时间范围 (10-20 天)
    const timeMin = Math.floor(Math.random() * 5 + 10);
    const timeMax = timeMin + Math.floor(Math.random() * 5 + 2);
    const timeRange = `${timeMin}-${timeMax} 天`;

    // 生成随机成本范围 (¥10000-25000)
    const costMin = Math.floor(Math.random() * 5000 + 10000);
    const costMax = costMin + Math.floor(Math.random() * 5000 + 3000);
    const costRange = `¥${costMin}-${costMax}`;

    setKpiData({
      delayRate,
      delayTrend,
      delayIsDown,
      anomalyRate,
      anomalyTrend,
      anomalyIsDown,
      carbonEmission,
      carbonTrend,
      carbonIsDown,
      loadingRate,
      loadingTrend,
      loadingIsDown,
      distance,
      timeRange,
      costRange
    });
  };

  // 当模态框打开时，生成随机KPI数据
  useEffect(() => {
    if (isOpen) {
      generateRandomKPI();
    }
  }, [isOpen]);

  // 导出报告为PDF
  const handleExportReport = () => {
    // 创建一个新窗口用于生成PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // 构建PDF内容
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>KPI分析报告 - ${orderId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #ffffff;
            color: #333333;
          }
          h1 {
            color: #1a365d;
            text-align: center;
            margin-bottom: 30px;
          }
          h2 {
            color: #2c5282;
            margin-top: 30px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
          }
          h3 {
            color: #4a5568;
            margin-top: 20px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .kpi-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            background-color: #f8fafc;
          }
          .kpi-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
          }
          .kpi-trend {
            font-size: 14px;
            margin-top: 10px;
          }
          .trend-up {
            color: #e53e3e;
          }
          .trend-down {
            color: #38a169;
          }
          .path-info {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background-color: #f8fafc;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
          }
          .info-label {
            font-weight: bold;
          }
          .warning {
            color: #e53e3e;
          }
          .ai-insight {
            background-color: #ebf8ff;
            border-left: 4px solid #3182ce;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #718096;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>KPI分析报告</h1>
        <div class="info-row">
          <div class="info-label">订单编号:</div>
          <div>${orderId}</div>
        </div>
        <div class="info-row">
          <div class="info-label">区域:</div>
          <div>华东区域</div>
        </div>
        <div class="info-row">
          <div class="info-label">报告生成时间:</div>
          <div>${new Date().toLocaleString()}</div>
        </div>

        <h2>KPI分析</h2>
        <div class="kpi-grid">
          <div class="kpi-card">
            <h3>延误率</h3>
            <div class="kpi-value">${kpiData.delayRate}</div>
            <div class="kpi-trend ${kpiData.delayIsDown ? 'trend-down' : 'trend-up'}">
              ${kpiData.delayIsDown ? '↓' : '↑'} ${kpiData.delayTrend}
            </div>
          </div>
          <div class="kpi-card">
            <h3>异常率</h3>
            <div class="kpi-value">${kpiData.anomalyRate}</div>
            <div class="kpi-trend ${kpiData.anomalyIsDown ? 'trend-down' : 'trend-up'}">
              ${kpiData.anomalyIsDown ? '↓' : '↑'} ${kpiData.anomalyTrend}
            </div>
          </div>
          <div class="kpi-card">
            <h3>单位碳排</h3>
            <div class="kpi-value">${kpiData.carbonEmission} kg/ton</div>
            <div class="kpi-trend ${kpiData.carbonIsDown ? 'trend-down' : 'trend-up'}">
              ${kpiData.carbonIsDown ? '↓' : '↑'} ${kpiData.carbonTrend}
            </div>
          </div>
          <div class="kpi-card">
            <h3 class="warning">装载率 (WARNING)</h3>
            <div class="kpi-value warning">${kpiData.loadingRate}</div>
            <div class="kpi-trend ${kpiData.loadingIsDown ? 'trend-down' : 'trend-up'}">
              ${kpiData.loadingIsDown ? '↓' : '↑'} ${kpiData.loadingTrend}
            </div>
          </div>
        </div>

        <h2>AI 实时洞察</h2>
        <div class="ai-insight">
          当前延误率上升原因: 拥堵事件影响12%
        </div>

        <h2>最优路径融合</h2>
        <div class="path-info">
          <h3>推荐路径</h3>
          <div class="info-row">
            <div class="info-label">最优综合路径:</div>
            <div>${kpiData.distance}</div>
          </div>
          <div class="info-row">
            <div class="info-label">预计时间:</div>
            <div>${kpiData.timeRange}</div>
          </div>
          <div class="info-row">
            <div class="info-label">预计成本:</div>
            <div>${kpiData.costRange}</div>
          </div>
          <h3>推荐理由</h3>
          <p>平衡了时间、成本和可靠性，结合了公路运输的灵活性与铁路运输的稳定性，适合当前货物的高频率、中等时效性要求。</p>
        </div>

        <div class="footer">
          <p>此报告由PathOptix系统自动生成</p>
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
      <div className="bg-bg-modal w-full h-full md:w-auto md:h-auto md:max-w-5xl rounded-none md:rounded-[40px] border border-border-default shadow-[0_32px_128px_-16px_rgba(0,0,0,1)] overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300 md:max-h-[90vh]">
        
        {/* Header Section */}
        <div className="px-6 md:px-10 py-6 md:py-8 flex flex-wrap justify-between items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-text-primary tracking-tight">KPI 分析详情</h2>
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-text-muted" />
              <p className="text-xs text-text-muted font-bold">KPI趋势与最优路径融合看板</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportReport()}
              className="px-6 py-3 bg-orange-500 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-600/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Download size={16} /> 一键导出报告
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 md:py-10 space-y-8 scrollbar-hide">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <KPICard label="延误率" value={kpiData.delayRate} trend={kpiData.delayTrend} isDown={kpiData.delayIsDown} />
            <KPICard label="异常率" value={kpiData.anomalyRate} trend={kpiData.anomalyTrend} isDown={kpiData.anomalyIsDown} />
            <KPICard label="单位碳排" value={kpiData.carbonEmission} unit="kg/ton" trend={kpiData.carbonTrend} isDown={kpiData.carbonIsDown} />
            <KPICard label="装载率 (WARNING)" value={kpiData.loadingRate} trend={kpiData.loadingTrend} isDown={kpiData.loadingIsDown} isWarning />
          </div>

          {/* AI Insight Banner */}
          <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-4 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-brand-accent/20 rounded-xl text-brand-accent">
                <Lightbulb size={20} />
              </div>
              <div>
                <span className="text-[11px] font-black text-brand-accent uppercase tracking-widest mr-3">AI Real-time Insight</span>
                <span className="text-sm font-bold text-text-secondary">当前延误率上升原因: <span className="text-brand-accent">拥堵事件影响12%</span></span>
              </div>
            </div>
            <button className="text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors duration-300">查看优化策略</button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left Column: Optimal Path Fusion */}
            <div className="md:col-span-8 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Activity size={14} />
                </div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">最优路径融合</h3>
              </div>

              <div className="bg-bg-tertiary border border-border-default rounded-3xl p-8 space-y-8">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-blue-500 uppercase tracking-widest">• 推荐路径</span>
                </div>

                <div className="bg-bg-modal/50 border border-border-default rounded-2xl p-6 space-y-8">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-text-muted">最优综合路径</span>
                    <span className="text-2xl font-black text-text-primary italic tracking-tighter">{kpiData.distance}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-text-muted">预计时间:</span>
                      <span className="text-sm font-black text-text-primary">{kpiData.timeRange}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-text-muted">预计成本:</span>
                      <span className="text-sm font-black text-cyan-400 font-mono italic">{kpiData.costRange}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">推荐理由:</span>
                    <div className="bg-bg-tertiary rounded-xl p-5 text-xs text-text-muted leading-relaxed font-medium">
                      平衡了时间、成本和可靠性，结合了公路运输的灵活性与铁路运输的稳定性，适合当前货物的高频率、中等时效性要求。
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 pl-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest">预测的相关联点</h4>
                </div>
                <div className="space-y-4">
                  <RelatedPoint 
                    title="中转站: 建议在广州设立中转站，可提高运输效率" 
                    desc="基于区域流量模型分析，预计可缩短中转等待时间约15%" 
                    color="border-blue-500"
                    textColor="text-blue-400"
                  />
                  <RelatedPoint 
                    title="备选路线: 当主路线受阻时，可考虑经香港转海运" 
                    desc="备选方案冗余度 1.4x" 
                    color="border-blue-500"
                    textColor="text-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Real-time Risk Logs */}
            <div className="md:col-span-4 space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500">
                  <AlertCircle size={14} fill="currentColor" fillOpacity={0.2} />
                </div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">风控实时日志</h3>
              </div>

              <div className="space-y-4">
                <LogItem 
                  color="border-amber-500" 
                  title="预测模型时间与历史平均时间长20%" 
                  time="2分钟前" 
                  region="Region: East-China-01" 
                  icon={<Clock size={16} className="text-amber-500" />}
                />
                <LogItem 
                  color="border-blue-500" 
                  title="自动符合要求上机，影响时间决策" 
                  time="15分钟前" 
                  region="Node: A-Hub-Shanghai" 
                  icon={<CheckCircle2 size={16} className="text-blue-500" />}
                />
                <LogItem 
                  color="border-red-500" 
                  title="近期检查路径安全多起延误事件" 
                  time="42分钟前" 
                  region="Path: Route-66-ZJ" 
                  icon={<X size={16} className="text-red-500" />}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CapacityAnalysisModal;
