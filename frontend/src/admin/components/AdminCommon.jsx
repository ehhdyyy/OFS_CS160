export function SummaryCard({ iconWrapClass, iconClass, label, value, subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${iconWrapClass}`}>
        <i className={iconClass} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function Pagination({ summaryText, pages, currentPage, trailingLabel }) {
  return (
    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6 shrink-0 rounded-b-xl">
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">{summaryText}</p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              type="button"
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">Previous</span>
              <i className="fas fa-chevron-left text-xs" />
            </button>
            {pages.map((page, index) =>
              page === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={[
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                    page === currentPage
                      ? 'z-10 bg-green-50 border-green-500 text-green-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {page}
                </button>
              ),
            )}
            {trailingLabel ? (
              <button
                type="button"
                className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
              >
                {trailingLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">Next</span>
              <i className="fas fa-chevron-right text-xs" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function RobotStatusBadge({ row }) {
  let icon = null;

  if (row.statusIconType === 'pulse') {
    icon = <div className="w-2 h-2 bg-blue-500 rounded-full status-pulse" />;
  } else if (row.statusIconType === 'bolt') {
    icon = <i className="fas fa-bolt text-purple-600" />;
  } else if (row.statusIconType === 'parking') {
    icon = <i className="fas fa-parking text-gray-500" />;
  } else if (row.statusIconType === 'warning') {
    icon = <i className="fas fa-exclamation-triangle" />;
  }

  return (
    <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border ${row.statusClass}`}>
      {icon}
      {row.status}
    </span>
  );
}
