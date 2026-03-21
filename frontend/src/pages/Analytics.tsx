import { useEffect, useState } from 'react';
import { getChartsData, getClients, ChartsData, Client } from '../api/client';
import Layout from '../components/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area
} from 'recharts';
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const timeRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'all_time', label: 'All Time' },
];

export default function Analytics() {
  const [chartsData, setChartsData] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [timeRange, setTimeRange] = useState('last_30_days');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadChartsData();
  }, [selectedClient, timeRange]);

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  const loadChartsData = async () => {
    setLoading(true);
    try {
      const data = await getChartsData({
        client_id: selectedClient || undefined,
        time_range: timeRange,
      });
      setChartsData(data);
    } catch (err) {
      console.error('Failed to load charts data', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMTTA = (seconds: number | null): string => {
    if (seconds === null) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics & Statistics</h1>
            <p className="text-sm text-slate-500 mt-1">Insights into incident trends and performance</p>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="select-field w-48"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </select>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="select-field w-40"
            >
              {timeRangeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <button
              onClick={loadChartsData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card p-12">
            <div className="flex items-center justify-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading analytics...
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Mean Time to Acknowledge</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatMTTA(chartsData?.mtta_seconds ?? null)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">MTTA</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Incidents</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {chartsData?.incidents_trend.reduce((sum, item) => sum + item.count, 0) || 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">In selected period</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-lg">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Clients Affected</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {chartsData?.incidents_by_client.length || 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">With incidents</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Incidents by Client</h3>
                {chartsData?.incidents_by_client && chartsData.incidents_by_client.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartsData.incidents_by_client}
                        dataKey="count"
                        nameKey="client_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ client_name, count }) => `${client_name}: ${count}`}
                        labelLine={true}
                      >
                        {chartsData.incidents_by_client.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} incidents`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-400">
                    No data available
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Escalation Funnel</h3>
                {chartsData?.escalation_funnel && chartsData.escalation_funnel.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartsData.escalation_funnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="level" width={80} />
                      <Tooltip formatter={(value: number) => [`${value} incidents`, 'Count']} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-400">
                    No data available
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Incidents Trend</h3>
              {chartsData?.incidents_trend && chartsData.incidents_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartsData.incidents_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`${value} incidents`, 'Count']}
                      labelFormatter={formatDate}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-slate-400">
                  No data available
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
