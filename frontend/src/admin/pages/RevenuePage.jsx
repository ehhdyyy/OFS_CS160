import { useEffect, useMemo, useRef, useState } from 'react';
import AdminShell from '../AdminShell';

const API_BASE = 'http://localhost:8000';
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_LABEL_BY_SHORT = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const EMPTY_DATA = {
  summary: {
    revenue: 0,
    costs: 0,
    profit: 0,
  },
  chart: [],
};

function formatCurrency(value, options = {}) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(Number(value || 0));
}

function normalizeChartPoints(points) {
  const pointMap = new Map();

  (points || []).forEach((point) => {
    const normalizedDay = WEEKDAY_LABEL_BY_SHORT[point.day] || point.day;
    if (!normalizedDay) {
      return;
    }

    pointMap.set(normalizedDay, {
      day: normalizedDay,
      revenue: Number(point.revenue || 0),
      costs: Number(point.costs || 0),
      profit: Number(point.profit || 0),
      date: point.date || null,
    });
  });

  return WEEK_DAYS.map((day) => (
    pointMap.get(day) || {
      day,
      revenue: 0,
      costs: 0,
      profit: 0,
      date: null,
    }
  ));
}

function FinancialSummaryCard({ label, value, iconClass, iconWrapClass, valueClassName = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconWrapClass}`}>
          <i className={iconClass} />
        </div>
      </div>
      <p className={`text-3xl font-bold ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-sm text-gray-400">Current Monday–Sunday week</p>
    </div>
  );
}

export default function RevenuePage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    loadFinancial();
  }, []);

  async function loadFinancial() {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await fetch(`${API_BASE}/api/admin/financial`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to load financial data');
      }

      const payload = await response.json();
      setData({
        summary: payload.summary || EMPTY_DATA.summary,
        chart: normalizeChartPoints(payload.chart || []),
      });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load financial data');
      setData({
        ...EMPTY_DATA,
        chart: normalizeChartPoints([]),
      });
    } finally {
      setIsLoading(false);
    }
  }

  const chartData = useMemo(() => normalizeChartPoints(data.chart), [data.chart]);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) {
      return undefined;
    }

    const ctx = canvasRef.current.getContext('2d');

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: WEEK_DAYS,
        datasets: [
          {
            label: 'Revenue',
            data: chartData.map((point) => point.revenue),
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.72,
          },
          {
            label: 'Costs',
            data: chartData.map((point) => point.costs),
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.72,
          },
          {
            label: 'Profit',
            data: chartData.map((point) => point.profit),
            backgroundColor: 'rgba(34, 197, 94, 0.9)',
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                family: 'Inter, sans-serif',
                size: 13,
              },
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            titleFont: { family: 'Inter, sans-serif', size: 14 },
            bodyFont: { family: 'Inter, sans-serif', size: 13 },
            padding: 12,
            callbacks: {
              label(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }

                if (context.parsed.y !== null) {
                  label += formatCurrency(context.parsed.y);
                }

                return label;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: { family: 'Inter, sans-serif' },
              maxRotation: 0,
              minRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f1f5f9',
              drawBorder: false,
            },
            ticks: {
              font: { family: 'Inter, sans-serif' },
              callback(value) {
                return formatCurrency(value, { maximumFractionDigits: 0 });
              },
            },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData]);

  return (
    <AdminShell
      activeNav="financial"
      title="Financial"
      description="Review revenue, costs, and profit for the current Monday–Sunday week."
      topSearchPlaceholder="Search financials..."
      quickPanel={{ title: 'Overview', items: [] }}
    >
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <FinancialSummaryCard
          label="Weekly Revenue"
          value={formatCurrency(data.summary.revenue)}
          iconClass="fas fa-arrow-trend-up"
          iconWrapClass="bg-blue-50 text-blue-500"
        />

        <FinancialSummaryCard
          label="Weekly Costs"
          value={formatCurrency(data.summary.costs)}
          iconClass="fas fa-receipt"
          iconWrapClass="bg-red-50 text-red-500"
        />

        <FinancialSummaryCard
          label="Weekly Profit"
          value={formatCurrency(data.summary.profit)}
          iconClass="fas fa-wallet"
          iconWrapClass="bg-green-50 text-green-500"
          valueClassName={Number(data.summary.profit || 0) < 0 ? 'text-red-600' : 'text-gray-900'}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Weekly Financial Performance</h2>
            <p className="text-sm text-gray-500">Monday through Sunday only.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center text-sm text-gray-500">
            Loading financial chart...
          </div>
        ) : (
          <div className="relative w-full" style={{ height: '400px' }}>
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Week at a Glance</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Day</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Revenue</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Costs</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {chartData.map((row) => (
                <tr key={row.day} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.day}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                    {formatCurrency(row.costs)}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                      row.profit < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}