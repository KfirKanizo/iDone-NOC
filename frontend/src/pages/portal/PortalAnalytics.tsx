import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  getPortalStats, 
  getPortalCharts, 
  getPortalIncidents,
  type PortalDashboardStats,
  type PortalChartsData
} from '../../api/portalClient';
import { useToast } from '../../components/Toast';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

const timeRangeOptions = [
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'all_time', label: 'All Time' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#ef4444',
  ACKNOWLEDGED: '#f59e0b',
  RESOLVED: '#22c55e',
  FAILED_ESCALATION: '#6b7280',
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export default function PortalAnalytics() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [stats, setStats] = useState<PortalDashboardStats | null>(null);
  const [chartsData, setChartsData] = useState<PortalChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('last_30_days');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, chartsData] = await Promise.all([
        getPortalStats({ time_range: timeRange }),
        getPortalCharts({ time_range: timeRange }),
      ]);
      setStats(statsData);
      setChartsData(chartsData);
    } catch (err) {
      console.error('Failed to load analytics', err);
      showToast('error', 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const prepareTrendData = () => {
    if (!chartsData?.incidents_trend) return [];
    return chartsData.incidents_trend.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      incidents: item.count,
    }));
  };

  const prepareStatusData = () => {
    if (!chartsData?.escalation_funnel) return [];
    
    const statusCounts: Record<string, number> = {
      OPEN: 0,
      ACKNOWLEDGED: 0,
      RESOLVED: 0,
    };

    chartsData.escalation_funnel.forEach(item => {
      if (item.level.startsWith('Level ')) {
        const level = parseInt(item.level.replace('Level ', ''));
        if (level === 0) statusCounts.OPEN += item.count;
        else if (level < 5) statusCounts.ACKNOWLEDGED += item.count;
        else statusCounts.RESOLVED += item.count;
      }
    });

    return Object.entries(statusCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0) + name.slice(1).toLowerCase().replace('_', ' '),
        value,
        color: STATUS_COLORS[name],
      }));
  };

  const trendData = prepareTrendData();
  const statusData = prepareStatusData();

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: React.ElementType; 
    color: string;
  }) => (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Your organization's incident statistics</p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="select-field w-48"
          >
            {timeRangeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-slate-500">
            <Activity className="w-5 h-5 animate-spin" />
            <span>Loading analytics...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Incidents" 
              value={stats?.total_count || 0} 
              icon={Activity} 
              color="bg-blue-100 text-blue-600" 
            />
            <StatCard 
              title="Open Incidents" 
              value={stats?.open_count || 0} 
              icon={AlertTriangle} 
              color="bg-red-100 text-red-600" 
            />
            <StatCard 
              title="Acknowledged" 
              value={stats?.acknowledged_count || 0} 
              icon={Clock} 
              color="bg-amber-100 text-amber-600" 
            />
            <StatCard 
              title="Avg. Response Time" 
              value={formatTime(chartsData?.mtta_seconds || null)}
              subtitle="Mean Time To Acknowledge"
              icon={TrendingUp} 
              color="bg-purple-100 text-purple-600" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Incidents Over Time</h3>
              </div>
              {trendData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Bar 
                        dataKey="incidents" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]}
                        name="Incidents"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-500">
                  <p>No trend data available</p>
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Incidents by Status</h3>
              </div>
              {statusData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-500">
                  <p>No status data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Escalation Levels</h3>
            </div>
            {chartsData?.escalation_funnel && chartsData.escalation_funnel.length > 0 ? (
              <div className="space-y-3">
                {chartsData.escalation_funnel.map((item, index) => {
                  const maxCount = Math.max(...chartsData.escalation_funnel.map(i => i.count), 1);
                  const percentage = (item.count / maxCount) * 100;
                  return (
                    <div key={item.level} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-slate-600">{item.level}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                      <div className="w-12 text-sm text-slate-500 text-right">{item.count}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">No escalation data available</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
