
import React from 'react';
import { X, Share2, Leaf, Shield, Globe, Download, TrendingUp, Sparkles } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell 
} from 'recharts';
import { useChartTheme } from '@hooks/useChartTheme';

interface ESGReportViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const emissionData = [
  { name: 'Q1', value: 30 },
  { name: 'Q2', value: 25 },
  { name: 'Q3', value: 45 },
  { name: 'Q4', value: 85 },
];

const projectionData = [
  { year: '2024', val: 80 },
  { year: '2025', val: 65 },
  { year: '2026', val: 55 },
  { year: '2027', val: 40 },
  { year: '2028', val: 30 },
  { year: '2029', val: 15 },
  { year: '2030', val: 5 },
];

const ESGReportView: React.FC<ESGReportViewProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const chartTheme = useChartTheme();

  // 处理PDF下载
  const handleDownloadPDF = () => {
    // TODO(print): 打印模板使用独立窗口(window.open)，无法继承应用CSS变量。
    // 内联样式中的硬编码颜色(#1e293b, #10b981, #06b6d4等)专为打印输出优化。
    // 未来可考虑: 1)将样式抽取至public/print-styles.css 2)使用CSS @media print + iframe方案
    // Tech Debt — 见 REMEDY-M6-ISSUE-M03
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // 构建HTML内容，包含报告的所有相关数据
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>企业可持续性 (ESG) 年度分析报告</title>
        <style>
          body {
            font-family: 'Inter', sans-serif;
            background: white;
            color: black;
            margin: 40px;
            padding: 40px;
            border: 1px solid #e5e7eb;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #1e293b;
          }
          h2 {
            font-size: 24px;
            font-weight: bold;
            margin-top: 40px;
            margin-bottom: 20px;
            color: #1e293b;
          }
          h3 {
            font-size: 18px;
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 15px;
            color: #1e293b;
          }
          p {
            margin-bottom: 15px;
            line-height: 1.6;
          }
          .subtitle {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 40px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin: 40px 0;
          }
          .metric-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
          }
          .metric-value {
            font-size: 48px;
            font-weight: bold;
            color: #10b981;
            margin: 20px 0;
          }
          .metric-label {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .progress-section {
            margin: 40px 0;
          }
          .progress-item {
            margin-bottom: 30px;
          }
          .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .progress-label {
            font-weight: bold;
          }
          .progress-value {
            font-weight: bold;
            color: #10b981;
          }
          .progress-bar {
            height: 10px;
            background-color: #f1f5f9;
            border-radius: 5px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background-color: #10b981;
          }
          .chart-section {
            margin: 40px 0;
          }
          .chart-container {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
          }
          .insight-section {
            background-color: #f0fdfa;
            border: 1px solid #a7f3d0;
            border-radius: 8px;
            padding: 30px;
            margin: 40px 0;
          }
          .insight-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #065f46;
          }
          .insight-content {
            color: #15803d;
          }
          .highlight {
            font-weight: bold;
            color: #10b981;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          th {
            background-color: #f8fafc;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>企业可持续性 (ESG) 年度分析报告</h1>
          <div class="subtitle">Global Governance & Environmental Impact Summary</div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">88%</div>
              <div class="metric-label">ESG 综合评分</div>
            </div>
          </div>
          
          <div class="progress-section">
            <h2>核心支柱评分</h2>
            
            <div class="progress-item">
              <div class="progress-header">
                <span class="progress-label">环境支柱 (E)</span>
                <span class="progress-value">88%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: 88%"></div>
              </div>
              <p>碳排放强度显著降低，通过 AI 路径优化成功减少了 15.4% 的无效能耗。</p>
            </div>
            
            <div class="progress-item">
              <div class="progress-header">
                <span class="progress-label">治理支柱 (G)</span>
                <span class="progress-value">92%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: 92%"></div>
              </div>
              <p>合规自动化审计覆盖率达 100%，数据安全防御体系已通过 ISO 标准认证。</p>
            </div>
          </div>
          
          <div class="chart-section">
            <h2>趋势与可视化</h2>
            
            <div class="chart-container">
              <h3>二氧化碳排放季度趋势 (KG)</h3>
              <table>
                <thead>
                  <tr>
                    <th>季度</th>
                    <th>排放量 (KG)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Q1</td>
                    <td>30</td>
                  </tr>
                  <tr>
                    <td>Q2</td>
                    <td>25</td>
                  </tr>
                  <tr>
                    <td>Q3</td>
                    <td>45</td>
                  </tr>
                  <tr>
                    <td>Q4</td>
                    <td>85</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="chart-container">
              <h3>2030 净零排放预测路径</h3>
              <table>
                <thead>
                  <tr>
                    <th>年份</th>
                    <th>预测排放量</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>2024</td>
                    <td>80</td>
                  </tr>
                  <tr>
                    <td>2025</td>
                    <td>65</td>
                  </tr>
                  <tr>
                    <td>2026</td>
                    <td>55</td>
                  </tr>
                  <tr>
                    <td>2027</td>
                    <td>40</td>
                  </tr>
                  <tr>
                    <td>2028</td>
                    <td>30</td>
                  </tr>
                  <tr>
                    <td>2029</td>
                    <td>15</td>
                  </tr>
                  <tr>
                    <td>2030</td>
                    <td>5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="insight-section">
            <h2>AI 可持续发展洞察</h2>
            <p class="insight-content">
              通过对全球 14 个拥堵节点的实时优化，系统预计在下一季度可将单次运输的平均碳足迹降低 <span class="highlight">12.5%</span>。建议进一步扩大"绿色能源优先"路由权重的应用范围，以对冲即将到来的季节性物流高峰带来的排放波动。
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 写入HTML内容并触发打印
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // 等待内容加载完成后打印
    printWindow.onload = () => {
      printWindow.print();
      // 打印完成后关闭窗口
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onClose}
      />
      
      {/* 模态框主体 */}
      <div className="bg-bg-modal w-full max-w-6xl h-[90vh] rounded-[24px] md:rounded-[40px] border border-border-default shadow-[0_32px_128px_-16px_rgba(0,0,0,1)] overflow-hidden flex flex-col relative transform animate-in zoom-in-95 duration-300">

        {/* 顶部标题栏 */}
        <div className="px-4 md:px-10 py-4 md:py-8 border-b border-border-default flex justify-between items-center bg-bg-modal/80 sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="p-2 md:p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <Leaf size={20} fill="currentColor" fillOpacity={0.2} />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-text-primary tracking-tight italic">企业可持续性 (ESG) 年度分析报告</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] md:text-[10px] text-text-muted font-black uppercase tracking-widest">Global Governance & Environmental Impact Summary</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 md:p-3 bg-bg-elevated border border-border-default rounded-xl text-text-muted hover:text-cyan-400 transition-all duration-300">
              <Share2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-300 active:scale-90 shadow-xl"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 滚动内容区 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 md:space-y-12 scrollbar-hide">

          {/* 1. 核心指标概览 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-3 bg-bg-elevated/40 border border-border-default rounded-[24px] md:rounded-[32px] p-6 md:p-8 flex flex-col items-center justify-center">
              <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="45" stroke={chartTheme.axisStroke} strokeWidth="8" fill="transparent" />
                  <circle cx="50" cy="50" r="45" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="282.7" strokeDashoffset={282.7 * (1 - 0.88)} strokeLinecap="round" />
                </svg>
                <span className="absolute text-3xl md:text-4xl font-black text-text-primary italic">88%</span>
              </div>
              <div className="mt-4 md:mt-6 text-center">
                 <div className="text-[10px] text-text-muted font-black uppercase tracking-widest">ESG 综合评分</div>
              </div>
            </div>

            <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
              <div className="bg-bg-elevated/40 border border-border-default rounded-[24px] md:rounded-[32px] p-6 md:p-8 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-[10px] text-text-muted font-black uppercase tracking-widest">环境支柱 (E)</div>
                  <span className="text-emerald-500 font-black italic">88%</span>
                </div>
                <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[88%]" />
                </div>
                <p className="text-[10px] text-text-muted font-medium leading-relaxed italic">碳排放强度显著降低，通过 AI 路径优化成功减少了 15.4% 的无效能耗。</p>
              </div>
              <div className="bg-bg-elevated/40 border border-border-default rounded-[24px] md:rounded-[32px] p-6 md:p-8 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-[10px] text-text-muted font-black uppercase tracking-widest">治理支柱 (G)</div>
                  <span className="text-cyan-400 font-black italic">92%</span>
                </div>
                <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 w-[92%]" />
                </div>
                <p className="text-[10px] text-text-muted font-medium leading-relaxed italic">合规自动化审计覆盖率达 100%，数据安全防御体系已通过 ISO 标准认证。</p>
              </div>
            </div>
          </div>

          {/* 2. 趋势与可视化 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="bg-bg-elevated/40 border border-border-default rounded-[24px] md:rounded-[32px] p-6 md:p-8 space-y-6 md:space-y-8">
               <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">二氧化碳排放季度趋势 (KG)</h3>
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={emissionData}>
                       <defs>
                         <linearGradient id="modalEm" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: chartTheme.axisTextColor, fontSize: 10}} dy={10} />
                       <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#modalEm)" animationDuration={1500} />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
            <div className="bg-bg-elevated/40 border border-border-default rounded-[24px] md:rounded-[32px] p-6 md:p-8 space-y-6 md:space-y-8">
               <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">2030 净零排放预测路径</h3>
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionData}>
                       <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                          {projectionData.map((entry, index) => (
                            <Cell key={`c-${index}`} fill={index === projectionData.length - 1 ? '#06b6d4' : '#10b981'} fillOpacity={0.4 + (index / 10)} />
                          ))}
                       </Bar>
                       <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: chartTheme.axisTextColor, fontSize: 9}} dy={10} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* 3. AI 深度建议 */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[24px] md:rounded-[32px] p-6 md:p-10 flex flex-col sm:flex-row gap-4 md:gap-8 items-start">
            <div className="p-3 md:p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 shrink-0 shadow-lg">
              <Sparkles size={28} />
            </div>
            <div className="space-y-4">
               <h4 className="text-lg font-black text-text-primary italic tracking-tight">AI 可持续发展洞察</h4>
               <p className="text-text-secondary leading-relaxed font-bold">
                 通过对全球 14 个拥堵节点的实时优化，系统预计在下一季度可将单次运输的平均碳足迹降低 <span className="text-emerald-400 font-black">12.5%</span>。建议进一步扩大“绿色能源优先”路由权重的应用范围，以对冲即将到来的季节性物流高峰带来的排放波动。
               </p>
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="px-4 md:px-10 py-4 md:py-8 bg-bg-primary/60 border-t border-border-default flex flex-col sm:flex-row justify-end gap-3 md:gap-4 backdrop-blur-md">
           <button
             onClick={onClose}
             className="px-8 md:px-10 py-3 md:py-4 bg-bg-elevated border border-border-default text-text-muted text-xs font-black rounded-2xl hover:bg-bg-tertiary transition-all duration-300 uppercase tracking-widest"
           >
             暂不导出
           </button>
           <button
             onClick={handleDownloadPDF}
             className="px-8 md:px-12 py-3 md:py-4 bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-xl shadow-emerald-600/30 hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
           >
             <Download size={18} /> 下载完整报告 (PDF)
           </button>
        </div>
      </div>
    </div>
  );
};

export default ESGReportView;
