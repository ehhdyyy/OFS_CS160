import { useEffect, useMemo, useRef } from 'react';
import AdminShell from '../AdminShell';
import { COST_SERIES, LEDGER_ROWS, REVENUE_LABELS, REVENUE_SERIES } from '../data/adminData';

export default function RevenuePage() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const profitSeries = useMemo(() => REVENUE_SERIES.map((value, index) => value - COST_SERIES[index]), []);

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
        labels: REVENUE_LABELS,
        datasets: [
          {
            label: 'Revenue ($)',
            data: REVENUE_SERIES,
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.8,
          },
          {
            label: 'Costs ($)',
            data: COST_SERIES,
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.8,
          },
          {
            label: 'Net Profit ($)',
            data: profitSeries,
            backgroundColor: 'rgba(34, 197, 94, 0.9)',
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.8,
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
                  label += new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  }).format(context.parsed.y);
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
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            grid: {
              color: '#f1f5f9',
              drawBorder: false,
            },
            ticks: {
              font: { family: 'Inter, sans-serif' },
              callback(value) {
                return `$${value / 1000}k`;
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
  }, [profitSeries]);

  return (
    <AdminShell
      activeNav="revenue"
      title="Financial Overview"
      description="Analyze revenue, operating costs, and net profit margins over time."
      topSearchPlaceholder="Search financials or reports..."
      quickPanel={{
        title: 'Export Options',
        items: [
          {
            label: 'Export to Excel',
            icon: 'fas fa-file-excel',
            hoverClassName: 'hover:text-blue-600 cursor-pointer',
          },
          {
            label: 'Download PDF Report',
            icon: 'fas fa-file-pdf',
            hoverClassName: 'hover:text-red-600 cursor-pointer',
          },
        ],
      }}
      headerAction={
        <select className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer shadow-sm font-medium">
          <option>Last 24 Months</option>
          <option>Year to Date</option>
          <option>Last 12 Months</option>
          <option>2025</option>
          <option>2024</option>
        </select>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Total Revenue (24m)</p>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <i className="fas fa-arrow-trend-up" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">$1,845,290</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600 font-medium flex items-center"><i className="fas fa-caret-up mr-1" /> 14.2%</span>
            <span className="text-gray-400 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Total Costs (24m)</p>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <i className="fas fa-receipt" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">$1,102,450</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-red-600 font-medium flex items-center"><i className="fas fa-caret-up mr-1" /> 5.8%</span>
            <span className="text-gray-400 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Net Profit (24m)</p>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
              <i className="fas fa-wallet" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">$742,840</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600 font-medium flex items-center"><i className="fas fa-caret-up mr-1" /> 22.4%</span>
            <span className="text-gray-400 ml-2">Avg Margin: 40.2%</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Financial Performance (24 Months)</h2>
        <div className="relative w-full" style={{ height: '400px' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col mb-8">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Recent Months Ledger</h2>
          <button type="button" className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Full Ledger</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Revenue</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Costs</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Net Profit</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {LEDGER_ROWS.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{row.revenue}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">{row.costs}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-bold">{row.profit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{row.margin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
