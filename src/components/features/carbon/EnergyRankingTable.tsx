
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { carbonApi, CarbonNodeRank } from '@services';

interface EnergyRankRow {
  rank: number;
  node: string;
  energy: number;
  carbon: number;
  grade: 'A' | 'B' | 'C';
}

interface SortState {
  key: keyof EnergyRankRow | null;
  direction: 'asc' | 'desc';
}

/** 碳排放量 → 能效等级 */
function gradeFromCarbon(carbon: number): 'A' | 'B' | 'C' {
  if (carbon < 5000) return 'A';
  if (carbon < 30000) return 'B';
  return 'C';
}

/** 将后端 CarbonNodeRank 映射为表格行 */
function mapToRow(item: CarbonNodeRank, idx: number): EnergyRankRow {
  const carbon = Math.round(item.emission_kg);
  return {
    rank: idx + 1,
    node: item.node_name,
    energy: Math.round(carbon * 1.5), // 碳排 → 能耗粗略换算
    carbon,
    grade: gradeFromCarbon(carbon),
  };
}

const GRADE_STYLES: Record<EnergyRankRow['grade'], string> = {
  A: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  B: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  C: 'bg-red-500/15 text-red-400 border-red-500/30',
};

type ColumnKey = keyof EnergyRankRow;

const COLUMNS: { key: ColumnKey; label: string; sortable: boolean }[] = [
  { key: 'rank',   label: '排名',          sortable: true },
  { key: 'node',   label: '节点名称',       sortable: true },
  { key: 'energy', label: '能耗(kWh)',     sortable: true },
  { key: 'carbon', label: '碳排放量(kg)',  sortable: true },
  { key: 'grade',  label: '能效等级',       sortable: true },
];

const EnergyRankingTable: React.FC = () => {
  const [sort, setSort] = useState<SortState>({ key: 'energy', direction: 'desc' });
  const [rows, setRows] = useState<EnergyRankRow[]>([]);

  // S2-T07: 从后端加载真实节点碳排数据（基于订单计算）
  useEffect(() => {
    (async () => {
      try {
        const data = await carbonApi.getNodes();
        setRows(data.map(mapToRow));
      } catch (err) {
        console.error('加载节点能耗排行失败:', err);
      }
    })();
  }, []);

  const handleSort = (key: ColumnKey) => {
    setSort(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const sortedData = useMemo(() => {
    if (!sort.key) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = a[sort.key!];
      const bv = b[sort.key!];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.direction === 'asc' ? av - bv : bv - av;
      }
      return sort.direction === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [sort, rows]);

  return (
    <div className="bg-bg-tertiary rounded-3xl p-4 md:p-6 border border-border-default">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">节点能耗排行</h3>
        <span className="text-[10px] text-text-muted font-bold uppercase">共 {rows.length} 个节点</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border-default">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-3 text-left text-[10px] font-black text-text-muted uppercase tracking-widest cursor-pointer select-none hover:text-text-secondary transition-colors"
                >
                  <div className="inline-flex items-center gap-1">
                    {col.label}
                    {sort.key === col.key ? (
                      sort.direction === 'asc'
                        ? <ChevronUp size={12} className="text-emerald-400" />
                        : <ChevronDown size={12} className="text-emerald-400" />
                    ) : (
                      <ChevronsUpDown size={12} className="text-text-muted/50" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr
                key={row.rank}
                className={`border-b border-border-default/50 hover:bg-bg-elevated/40 transition-colors ${
                  idx % 2 === 1 ? 'bg-bg-elevated/20' : ''
                }`}
              >
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                    row.rank <= 3
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-bg-elevated text-text-muted'
                  }`}>
                    {row.rank}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm font-bold text-text-primary">{row.node}</td>
                <td className="px-3 py-3 text-sm font-black text-text-primary">{row.energy.toLocaleString()}</td>
                <td className="px-3 py-3 text-sm font-black text-amber-400">{row.carbon.toLocaleString()}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-black border ${GRADE_STYLES[row.grade]}`}>
                    {row.grade}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-text-muted text-xs">
                  暂无节点数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnergyRankingTable;
