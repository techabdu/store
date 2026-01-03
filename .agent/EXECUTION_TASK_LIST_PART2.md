# Complete Execution Task List - PART 2 (Days 19-30)
## SuperAdmin Monitoring System Implementation

**This is Part 2 - Continuation from EXECUTION_TASK_LIST.md (Days 1-12) and EXECUTION_DAYS_13-30.md (Days 13-18)**

---

## PHASE 4 CONTINUED: WEBSOCKET & REAL-TIME (WEEK 4)

### DAY 19: WebSocket Testing & Optimization

#### Single Client Connection Test
- [ ] Open terminal, run WebSocket server: `php backend/websocket/server.php`
- [ ] Open browser console
- [ ] Create WebSocket connection:
  ```javascript
  const ws = new WebSocket('ws://localhost:8080');
  ws.onopen = () => console.log('Connected');
  ws.onmessage = (e) => console.log('Received:', JSON.parse(e.data));
  ws.onerror = (e) => console.error('Error:', e);
  ws.onclose = () => console.log('Closed');
  ```
- [ ] Verify connection successful
- [ ] Test subscribe to channel:
  ```javascript
  ws.send(JSON.stringify({type: 'subscribe', channel: 'alerts'}));
  ```
- [ ] Create test alert in database manually
- [ ] Within 5 seconds, should receive alert via WebSocket
- [ ] Verify alert data correct
- [ ] Test close connection: `ws.close()`
- [ ] Verify server logs show connection closed

#### Multiple Clients Test (5-10 connections)
- [ ] Open 5 different browser tabs
- [ ] In each tab, open console and connect to WebSocket
- [ ] Subscribe all clients to 'alerts' channel
- [ ] Create one alert in database
- [ ] Verify all 5 clients receive the same alert
- [ ] Check server logs for 5 connections
- [ ] Close all connections
- [ ] Verify server cleans up properly

#### Rapid Disconnect/Reconnect Test
- [ ] Connect client
- [ ] Subscribe to channel
- [ ] Close connection immediately
- [ ] Reconnect within 1 second
- [ ] Subscribe again
- [ ] Repeat 10 times rapidly
- [ ] Verify no server crashes
- [ ] Verify no memory leaks (check with `top` or Activity Monitor)
- [ ] Check server logs for any errors

#### Server Restart Test (Client Auto-Reconnect)
- [ ] Connect client with auto-reconnect enabled (React hook does this)
- [ ] Subscribe to channel
- [ ] Stop WebSocket server (Ctrl+C)
- [ ] Observe client attempts to reconnect
- [ ] Should see "Reconnecting..." in UI
- [ ] Restart server: `php backend/websocket/server.php`
- [ ] Client should reconnect automatically within 3 seconds
- [ ] Client should re-subscribe automatically
- [ ] Verify can receive messages again

#### Network Interruption Simulation
- [ ] Connect client
- [ ] On Mac, turn WiFi off briefly
- [ ] Client should detect disconnection
- [ ] Turn WiFi back on
- [ ] Client should reconnect
- [ ] Verify messages flow again

#### Latency Measurement
- [ ] Create test that sends timestamp
- [ ] Send message from server with timestamp
- [ ] Client receives and calculates latency: `Date.now() - receivedTimestamp`
- [ ] Record latencies for 100 messages
- [ ] Calculate average latency
- [ ] Should be <100ms on localhost
- [ ] Document results

#### Memory Usage Monitoring
- [ ] Start WebSocket server
- [ ] Monitor memory: `ps aux | grep websocket`
- [ ] Record initial memory usage
- [ ] Connect 10 clients
- [ ] Subscribe all to all 4 channels
- [ ] Send 1000 test messages over 30 minutes
- [ ] Monitor memory usage every 5 minutes
- [ ] Memory should stay relatively stable (<10% growth)
- [ ] If memory grows continuously, check for leaks

#### CPU Usage Monitoring
- [ ] Start server
- [ ] Monitor CPU: `top -pid <websocket_pid>`
- [ ] Should be <5% when idle
- [ ] Connect 10 clients
- [ ] During polling (every 5-30 seconds), CPU may spike briefly
- [ ] Average CPU should remain <10%
- [ ] Document CPU usage

#### Production Data Volume Test
- [ ] Insert 100 test alerts in database
- [ ] Insert 1000 API request logs
- [ ] Insert 50 errors
- [ ] Start server with polling enabled
- [ ] Monitor how much data is broadcast
- [ ] Verify polling queries are efficient
- [ ] Check query execution time with EXPLAIN
- [ ] Optimize queries if needed (add indexes)

#### Message Batching Optimization (if needed)
- [ ] If many messages sent at once:
  - [ ] Modify broadcastToChannel to batch messages
  - [ ] Instead of sending each message individually
  - [ ] Collect messages for 1 second
  - [ ] Send as array
  - [ ] Update React hooks to handle arrays

#### Client-Side Caching Implementation
- [ ] In React hooks, add caching:
  ```javascript
  const [cachedMetrics, setCachedMetrics] = useState(null);
  
  useEffect(() => {
      if (data.type === 'metrics_update') {
          setCachedMetrics(data.data);
          localStorage.setItem('lastMetrics', JSON.stringify(data.data));
      }
  }, [data]);
  
  // On mount, load from cache
  useEffect(() => {
      const cached = localStorage.getItem('lastMetrics');
      if (cached) setCachedMetrics(JSON.parse(cached));
  }, []);
  ```
- [ ] Test that cached data shows while waiting for live connection

#### Database Query Optimization
- [ ] Review all polling queries
- [ ] Run EXPLAIN on each query
- [ ] Verify indexes being used
- [ ] If not, add indexes:
  ```sql
  CREATE INDEX idx_alerts_recent ON system_alerts(resolved, created_at);
  CREATE INDEX idx_errors_recent ON application_errors(error_level, created_at);
  ```
- [ ] Re-test query performance

#### Day 19 Validation Checklist
- [ ] All test scenarios passed ✓
- [ ] Single client works perfectly ✓
- [ ] Multiple clients (10+) work simultaneously ✓
- [ ] Rapid disconnect/reconnect stable ✓
- [ ] Auto-reconnect works ✓
- [ ] Network interruption handled gracefully ✓
- [ ] Latency <100ms ✓
- [ ] Memory usage stable (<10% growth over 1 hour) ✓
- [ ] CPU usage acceptable (<10% average) ✓
- [ ] Production data volume handled ✓
- [ ] Queries optimized ✓
- [ ] No errors in server logs ✓
- [ ] Commit: `git add . && git commit -m "Day 19: WebSocket testing and optimization"`

---

### DAY 20: Environment Configuration & CI/CD Integration

#### Update Environment Files
- [ ] Verify frontend `.env.development` has WebSocket URL:
  ```
  VITE_WS_URL=ws://localhost:8080
  ```
- [ ] Verify frontend `.env.production` has:
  ```
  VITE_WS_URL=wss://prhub.shop:8080
  ```
- [ ] Update backend `.env` (if not already done):
  ```
  APP_ENV=development
  SMTP_HOST=...
  SMTP_USER=...
  SMTP_PASS=...
  ```
- [ ] Create production `.env.production` for backend (don't commit):
  ```
  APP_ENV=production
  DB_HOST=<production_db_host>
  DB_NAME=store
  DB_USER=<production_db_user>
  DB_PASS=<production_db_password>
  SMTP_HOST=<production_smtp>
  SMTP_USER=<production_email>
  SMTP_PASS=<production_smtp_password>
  ```

#### Review Existing GitHub Actions Workflow
- [ ] Open `.github/workflows/<your-workflow>.yml`
- [ ] Identify backend deployment steps
- [ ] Identify frontend build steps
- [ ] Note where to inject monitoring deployment

#### Add Database Migration Step to Workflow
- [ ] In GitHub Actions workflow, after backend deployment, add:
  ```yaml
  - name: Run monitoring database migrations
    run: |
      mysql -h ${{ secrets.DB_HOST }} -u ${{ secrets.DB_USER }} -p${{ secrets.DB_PASS }} ${{ secrets.DB_NAME }} < backend/sql/migrations/001_monitoring_tables.sql
      mysql -h ${{ secrets.DB_HOST }} -u ${{ secrets.DB_USER }} -p${{ secrets.DB_PASS }} ${{ secrets.DB_NAME }} < backend/sql/migrations/002_saas_metrics_tables.sql
      mysql -h ${{ secrets.DB_HOST }} -u ${{ secrets.DB_USER }} -p${{ secrets.DB_PASS }} ${{ secrets.DB_NAME }} < backend/sql/migrations/003_support_system.sql
  ```

#### Add WebSocket Server Restart Step
- [ ] Add step to restart WebSocket server via Supervisor:
  ```yaml
  - name: Restart WebSocket server
    uses: appleboy/ssh-action@master
    with:
      host: ${{ secrets.SERVER_HOST }}
      username: ${{ secrets.SERVER_USER }}
      key: ${{ secrets.SSH_PRIVATE_KEY }}
      script: |
        sudo supervisorctl restart websocket-server
  ```

#### Add Cron Jobs Setup Step (First Deployment Only)
- [ ] Create script: `backend/scripts/setup_cron.sh`
- [ ] Add cron jobs to script:
  ```bash
  #!/bin/bash
  # Add cron jobs for monitoring workers
  (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/bin/php /path/to/backend/workers/MetricsAggregator.php >> /path/to/logs/metrics_aggregator.log 2>&1") | crontab -
  (crontab -l 2>/dev/null; echo "* * * * * /usr/bin/php /path/to/backend/workers/AlertProcessor.php >> /path/to/logs/alert_processor.log 2>&1") | crontab -
  (crontab -l 2>/dev/null; echo "0 2 * * * /usr/bin/php /path/to/backend/workers/LogCleaner.php >> /path/to/logs/log_cleaner.log 2>&1") | crontab -
  (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/php /path/to/backend/workers/HealthScoreCalculator.php >> /path/to/logs/health_score.log 2>&1") | crontab -
  (crontab -l 2>/dev/null; echo "0 4 * * * /usr/bin/php /path/to/backend/workers/StorageCalculator.php >> /path/to/logs/storage_calculator.log 2>&1") | crontab -
  ```
- [ ] Make executable: `chmod +x backend/scripts/setup_cron.sh`
- [ ] Add to workflow (run once):
  ```yaml
  - name: Setup cron jobs (if not exists)
    uses: appleboy/ssh-action@master
    with:
      host: ${{ secrets.SERVER_HOST }}
      username: ${{ secrets.SERVER_USER }}
      key: ${{ secrets.SSH_PRIVATE_KEY }}
      script: |
        /path/to/backend/scripts/setup_cron.sh
  ```

#### Update Frontend Build Step
- [ ] Ensure frontend build uses production env:
  ```yaml
  - name: Build frontend
    working-directory: ./frontend
    run: npm run build
    env:
      VITE_API_URL: https://prhub.shop/api
      VITE_WS_URL: wss://prhub.shop:8080
      VITE_APP_ENV: production
  ```

#### Add Required GitHub Secrets
- [ ] Go to GitHub repo → Settings → Secrets
- [ ] Verify these secrets exist (add if missing):
  - [ ] `SERVER_HOST` - Production server IP
  - [ ] `SERVER_USER` - SSH username
  - [ ] `SSH_PRIVATE_KEY` - SSH key for deployment
  - [ ] `DB_HOST` - Production database host
  - [ ] `DB_NAME` - Database name (store)
  - [ ] `DB_USER` - Database user
  - [ ] `DB_PASS` - Database password

#### Test Deployment (Staging First if Available)
- [ ] Create test branch: `git checkout -b test/deployment`
- [ ] Make small change (add comment somewhere)
- [ ] Commit and push
- [ ] Trigger GitHub Actions workflow
- [ ] Monitor workflow execution
- [ ] Check for errors
- [ ] If successful, verify on staging:
  - [ ] Database tables exist
  - [ ] WebSocket server running
  - [ ] Cron jobs scheduled
  - [ ] Frontend built correctly

#### Document Rollback Procedure
- [ ] Create file: `docs/ROLLBACK.md`
- [ ] Document steps to rollback if deployment fails:
  ```markdown
  ## Rollback Procedure
  
  1. Stop WebSocket server:
     `sudo supervisorctl stop websocket-server`
  
  2. Restore database from backup:
     `mysql -u user -p store < backup_pre_monitoring.sql`
  
  3. Revert frontend:
     `git checkout <previous-commit>`
     `npm run build`
     `Deploy dist/`
  
  4. Revert backend:
     `git checkout <previous-commit>`
  
  5. Remove cron jobs:
     `crontab -e` (delete monitoring jobs)
  
  6. Restart services
  ```

#### Day 20 Validation
- [ ] All environment files configured correctly ✓
- [ ] GitHub Actions workflow updated ✓
- [ ] Database migrations added to workflow ✓
- [ ] WebSocket restart added ✓
- [ ] Cron setup script created ✓
- [ ] All GitHub secrets configured ✓
- [ ] Test deployment successful (staging) ✓
- [ ] Rollback procedure documented ✓
- [ ] Commit: `git add . && git commit -m "Day 20: CI/CD integration and environment configuration"`
- [ ] Tag: `git tag phase-4-complete`

#### Phase 4 Complete
- [ ] WebSocket server operational and tested ✓
- [ ] React integration complete ✓
- [ ] Real-time updates working ✓
- [ ] Performance optimized ✓
- [ ] CI/CD pipeline ready ✓

---

## PHASE 5: DASHBOARD UI - CORE (WEEK 5)

### 🎨 CRITICAL: Design Consistency Requirements

**BEFORE STARTING ANY FRONTEND WORK, COMPLETE THIS CHECKLIST:**

#### Pre-Frontend Preparation (MANDATORY)
- [ ] Read `FRONTEND_DESIGN_GUIDE.md` completely (30 minutes)
- [ ] Study existing components:
  - [ ] Open `frontend/src/components/MetricCard.jsx`
  - [ ] Open `frontend/src/components/MetricCard.css`
  - [ ] Note responsive breakpoints
  - [ ] Note CSS variable usage
- [ ] Review existing styles:
  - [ ] Open `frontend/src/index.css`
  - [ ] Note all CSS variables (--primary, --text-primary, etc.)
  - [ ] Note glassmorphism classes (.glass-card, .glass-input, .glass-table)
  - [ ] Note dark theme support
- [ ] Set up testing environment:
  - [ ] Open Chrome DevTools (F12)
  - [ ] Toggle device toolbar (Ctrl+Shift+M)
  - [ ] Add custom device: 320px width (iPhone SE)
  - [ ] Bookmark responsive testing sizes

#### Design Principles Commitment
- [ ] I will NEVER hardcode colors
- [ ] I will ALWAYS use CSS variables
- [ ] I will ALWAYS use .glass-card for containers
- [ ] I will ALWAYS test on mobile (320px minimum)
- [ ] I will ALWAYS test dark theme
- [ ] I will ALWAYS follow 8px grid spacing
- [ ] I will ALWAYS add hover states
- [ ] I will ALWAYS add loading states

---

### DAY 21: Reusable UI Components (WITH DESIGN INTEGRATION)

#### Component 1: HealthPillarCard

**Design Requirements Review:**
- [ ] Read MetricCard.jsx to understand existing pattern
- [ ] Will extend Metric Card, not recreate from scratch
- [ ] Must use .glass-card class
- [ ] Must be responsive (320px - 2560px)

**Create Component File:**
- [ ] Create file: `frontend/src/components/Dashboard/HealthPillarCard.jsx`
- [ ] Import React
- [ ] Import existing MetricCard component

**Component Structure:**
```jsx
import MetricCard from '../MetricCard';

function HealthPillarCard({ title, status, value, trend, metric }) {
  const statusColors = {
    healthy: 'var(--success)',
    warning: 'var(--warning)',
    critical: 'var(--error)'
  };
  
  const statusIcons = {
    healthy: '🟢',
    warning: '🟡',
    critical: '🔴'
  };
  
  return (
    <div className="health-pillar-card">
      <div className="status-indicator" 
           style={{color: statusColors[status]}}>
        {statusIcons[status]}
      </div>
      <MetricCard
        title={title}
        value={value}
        trend={trend}
        metric={metric}
      />
    </div>
  );
}

export default HealthPillarCard;
```

**Create Component CSS:**
- [ ] Create file: `frontend/src/components/Dashboard/HealthPillarCard.css`
- [ ] Add styles:
```css
.health-pillar-card {
    position: relative;
}

.health-pillar-card .status-indicator {
    position: absolute;
    top: 16px;
    right: 16px;
    font-size: 24px;
    z-index: 10;
}

/* Mobile */
@media (max-width: 480px) {
    .health-pillar-card .status-indicator {
        font-size: 20px;
        top: 12px;
        right: 12px;
    }
}

@media (max-width: 375px) {
    .health-pillar-card .status-indicator {
        font-size: 18px;
    }
}
```

**Test HealthPillarCard:**
- [ ] Import in test page
- [ ] Render with different statuses:
  ```jsx
  <HealthPillarCard 
    title="System Health"
    status="healthy"
    value="99.9%"
    metric="uptime"
    trend={{value: "+0.1%", direction: "up"}}
  />
  ```
- [ ] Test light theme ✓
- [ ] Test dark theme ✓
- [ ] Test on 320px ✓
- [ ] Test on 768px ✓
- [ ] Test on 1920px ✓
- [ ] Verify status icon visible
- [ ] Verify colors use CSS variables
- [ ] Screenshot for documentation

---

#### Component 2: Chart Components (LineChart, BarChart, PieChart)

**Install Chart.js (if not done Day 1):**
- [ ] Verify installed: `npm list chart.js`
- [ ] Import in component

**Create LineChart Wrapper:**
- [ ] Create file: `frontend/src/components/Charts/LineChart.jsx`
- [ ] Import Chart.js components:
```jsx
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
```

**Create Chart Configuration (Theme-Aware):**
```jsx
function LineChart({ data, labels, title }) {
  // Detect theme from DOM
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = theme === 'dark';
  
  const chartData = {
    labels: labels,
    datasets: [{
      label: title,
      data: data,
      borderColor: 'var(--primary)',  // CSS variable!
      backgroundColor: isDark 
        ? 'rgba(66, 133, 244, 0.1)'  // Dark theme
        : 'rgba(66, 133, 244, 0.2)',  // Light theme
      fill: true,
      tension: 0.4
    }]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false  // Hide legend for cleaner look
      },
      tooltip: {
        backgroundColor: isDark 
          ? 'rgba(45, 45, 45, 0.95)' 
          : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#E8EAED' : '#202124',
        bodyColor: isDark ? '#9AA0A6' : '#5F6368',
        borderColor: isDark ? '#3C4043' : '#DADCE0',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return context.parsed.y.toLocaleString();
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          color: isDark ? '#9AA0A6' : '#5F6368',
          font: { size: 11 }
        },
        grid: {
          color: isDark ? '#3C4043' : '#DADCE0',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          color: isDark ? '#9AA0A6' : '#5F6368',
          font: { size: 11 }
        },
        grid: {
          display: false
        }
      }
    }
  };
  
  return (
    <div className="chart-wrapper glass-card">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-container">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export default LineChart;
```

**Create Chart CSS:**
- [ ] Create file: `frontend/src/components/Charts/Charts.css`
```css
.chart-wrapper {
    padding: 24px;
    border-radius: 16px;
}

.chart-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
}

.chart-container {
    height: 300px;
    position: relative;
}

/* Responsive */
@media (max-width: 768px) {
    .chart-wrapper {
        padding: 16px;
    }
    
    .chart-container {
        height: 250px;
    }
    
    .chart-title {
        font-size: 16px;
    }
}

@media (max-width: 480px) {
    .chart-wrapper {
        padding: 12px;
    }
    
    .chart-container {
        height: 200px;
    }
    
    .chart-title {
        font-size: 14px;
    }
}
```

**Test LineChart:**
- [ ] Import and render with sample data:
  ```jsx
  <LineChart 
    data={[30, 45, 60, 55, 70, 80, 75]}
    labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
    title="API Response Time (ms)"
  />
  ```
- [ ] Test light theme ✓
- [ ] Test dark theme ✓ (colors should adapt)
- [ ] Test on 320px ✓ (height should be 200px)
- [ ] Test on 768px ✓ (height 250px)
- [ ] Test on 1920px ✓ (height 300px)
- [ ] Hover over data points, verify tooltip
- [ ] Switch theme while viewing, should update colors

**Create BarChart (Similar Process):**
- [ ] Create file: `frontend/src/components/Charts/BarChart.jsx`
- [ ] Copy LineChart structure
- [ ] Change to `import { Bar } from 'react-chartjs-2';`
- [ ] Register BarElement instead of LineElement
- [ ] Remove tension property
- [ ] Test same as LineChart

**Create PieChart:**
- [ ] Create `frontend/src/components/Charts/PieChart.jsx`
- [ ] Use `import { Pie } from 'react-chartjs-2';`
- [ ] Different data structure (no labels array, embedded in dataset)
- [ ] Test with sample data

**Day 21 Progress Checkpoint (Component 3):**
- [ ] Completed: HealthPillarCard ✓
- [ ] Completed: LineChart ✓
- [ ] Completed: BarChart ✓
- [ ] Completed: PieChart ✓
- [ ] Time estimate check (should be ~4 hours so far)

---

#### Component 3: DataTable (Reusable Table)

**Design Requirements:**
- [ ] MUST use existing `.glass-table` class from index.css
- [ ] MUST wrap in `.table-responsive` for mobile scroll
- [ ] MUST have sticky headers
- [ ] MUST be mobile-friendly (horizontal scroll functional)

**Create DataTable Component:**
- [ ] Create file: `frontend/src/components/Tables/DataTable.jsx`
```jsx
import { useState } from 'react';

function Data Table({ columns, data, pageSize = 10, onRowClick }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Sorting logic
  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });
  
  // Pagination
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);
  
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  return (
    <div className="datatable-wrapper">
      <div className="table-responsive">
        <table className="glass-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{cursor: col.sortable ? 'pointer' : 'default'}}
                >
                  {col.label}
                  {sortColumn === col.key && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr 
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                style={{cursor: onRowClick ? 'pointer' : 'default'}}
              >
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
```

**Create DataTable CSS:**
- [ ] Create file: `frontend/src/components/Tables/DataTable.css`
```css
.datatable-wrapper {
    width: 100%;
}

/* Use existing .glass-table from index.css */
.glass-table th,
.glass-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
}

.glass-table thead th {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.glass-table tbody tr {
    transition: background-color 0.2s ease;
}

.glass-table tbody tr:hover {
    background-color: var(--hover-bg);
}

.sort-indicator {
    margin-left: 4px;
    color: var(--primary);
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 24px;
    padding: 16px;
}

.pagination button {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-info {
    font-size: 14px;
    color: var(--text-secondary);
}

/* Mobile */
@media (max-width: 768px) {
    .glass-table th,
    .glass-table td {
        padding: 10px 12px;
        font-size: 14px;
    }
    
    .pagination {
        gap: 12px;
        padding: 12px;
    }
}

@media (max-width: 480px) {
    .glass-table th,
    .glass-table td {
        padding: 8px 10px;
        font-size: 12px;
    }
    
    .pagination button {
        padding: 6px 12px;
        font-size: 12px;
    }
    
    .page-info {
        font-size: 12px;
    }
}
```

**Test DataTable:**
- [ ] Create test data:
  ```jsx
  const sampleData = [
    {id: 1, tenant: 'Shop A', status: 'active', mrr: 99},
    {id: 2, tenant: 'Shop B', status: 'trial', mrr: 0},
    // ... more rows
  ];
  
  const columns = [
    {key: 'tenant', label: 'Tenant Name', sortable: true},
    {key: 'status', label: 'Status', sortable: true},
    {key: 'mrr', label: 'MRR', sortable: true, render: (val) => `$${val}`},
  ];
  
  <DataTable columns={columns} data={sampleData} pageSize={10} />
  ```
- [ ] Test sorting by clicking column headers ✓
- [ ] Test pagination ✓
- [ ] Test on mobile (320px) - should have horizontal scroll ✓
- [ ] Verify .table-responsive enables scroll
- [ ] Test dark theme ✓
- [ ] Test row hover effects ✓

---

#### Component 4: AlertBadge

**Create AlertBadge Component:**
- [ ] Create file: `frontend/src/components/Dashboard/AlertBadge.jsx`
```jsx
function AlertBadge({ count, severity = 'info' }) {
  if (count === 0) return null;
  
  const severityClasses = {
    critical: 'alert-badge-critical',
    warning: 'alert-badge-warning',
    info: 'alert-badge-info'
  };
  
  return (
    <span className={`alert-badge ${severityClasses[severity]}`}>
      {count}
    </span>
  );
}

export default AlertBadge;
```

**Create AlertBadge CSS:**
- [ ] Create file: `frontend/src/components/Dashboard/AlertBadge.css`
```css
.alert-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid;
}

.alert-badge-critical {
    background: rgba(234, 67, 53, 0.1);
    border-color: var(--error);
    color: var(--error);
}

.alert-badge-warning {
    background: rgba(251, 188, 4, 0.1);
    border-color: var(--warning);
    color: var(--warning);
}

.alert-badge-info {
    background: rgba(66, 133, 244, 0.1);
    border-color: var(--primary);
    color: var(--primary);
}

/* Pulse animation for new alerts */
@keyframes pulse-badge {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
}

.alert-badge.new {
    animation: pulse-badge 2s infinite;
}

/* Dark theme */
[data-theme='dark'] .alert-badge-critical {
    background: rgba(234, 67, 53, 0.2);
}

[data-theme='dark'] .alert-badge-warning {
    background: rgba(251, 188, 4, 0.2);
}

[data-theme='dark'] .alert-badge-info {
    background: rgba(66, 133, 244, 0.2);
}

/* Mobile */
@media (max-width: 480px) {
    .alert-badge {
        min-width: 20px;
        height: 20px;
        padding: 2px 6px;
        font-size: 10px;
    }
}
```

**Test AlertBadge:**
- [ ] Render with different severities and counts
- [ ] Test light theme ✓
- [ ] Test dark theme ✓
- [ ] Test animation with 'new' class ✓
- [ ] Test on mobile ✓

---

#### Day 21 Final Validation

**Component Checklist:**
- [ ] HealthPillarCard created and tested ✓
- [ ] LineChart created and tested ✓
- [ ] BarChart created and tested ✓
- [ ] PieChart created and tested ✓
- [ ] DataTable created and tested ✓
- [ ] AlertBadge created and tested ✓

**Design Consistency Checklist:**
- [ ] ALL components use CSS variables (no hardcoded colors) ✓
- [ ] ALL components tested in dark theme ✓
- [ ] ALL components tested on 320px ✓
- [ ] ALL components tested on 768px ✓
- [ ] ALL components tested on 1920px ✓
- [ ] ALL components use .glass-card where appropriate ✓
- [ ] ALL components follow 8px spacing ✓
- [ ] ALL components have hover states ✓
- [ ] ALL interactive elements have focus states ✓

**Commit:**
- [ ] `git add frontend/src/components/`
- [ ] `git commit -m "Day 21: Reusable UI components with design consistency"`

---

[Due to length, I'll continue with Days 22-30 in the next message. This gives you a sense of the granular detail for frontend days with full design integration. Should I continue?]

### DAY 22: Overview Dashboard (WITH FULL DESIGN INTEGRATION)

#### Pre-Dashboard Checklist
- [ ] Confirm all Day 21 components created and tested
- [ ] Review FRONTEND_DESIGN_GUIDE.md Dashboard page structure
- [ ] Confirm all WebSocket hooks working from Day 18
- [ ] Plan dashboard layout on paper/wireframe (5 minutes)

#### Create Dashboard Page File
- [ ] Create file: `frontend/src/pages/SuperAdmin/Dashboard.jsx`
- [ ] Import React, { useState, useEffect }
- [ ] Import all Day 21 components:
  ```javascript
  import HealthPillarCard from '../../components/Dashboard/HealthPillarCard';
  import LineChart from '../../components/Charts/LineChart';
  import AlertBadge from '../../components/Dashboard/AlertBadge';
  import ConnectionIndicator from '../../components/ConnectionIndicator';
  ```
- [ ] Import WebSocket hooks:
  ```javascript
  import { useRealtimeAlerts } from '../../hooks/useRealtimeAlerts';
  import { useRealtimeMetrics } from '../../hooks/useRealtimeMetrics';
  import { useRealtimeActivity } from '../../hooks/useRealtimeActivity';
  ```
- [ ] Import axios for API calls

#### Fetch Dashboard Data (Initial Load)
- [ ] Create state for health data:
  ```javascript
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  ```
- [ ] Create useEffect to fetch health status:
  ```javascript
  useEffect(() => {
      const fetchHealthData = async () => {
          try {
              const response = await axios.get('/api/superadmin/health');
              setHealthData(response.data);
          } catch (error) {
              console.error('Failed to fetch health data:', error);
          } finally {
              setLoading(false);
          }
      };
      fetchHealthData();
  }, []);
  ```

#### Integrate Real-Time Updates
- [ ] Use WebSocket hooks:
  ```javascript
  const { alerts, isConnected } = useRealtimeAlerts();
  const { metrics } = useRealtimeMetrics();
  const { activity } = useRealtimeActivity();
  ```
- [ ] Update healthData when metrics arrive:
  ```javascript
  useEffect(() => {
      if (metrics) {
          setHealthData(prev => ({
              ...prev,
              realtime: metrics
          }));
      }
  }, [metrics]);
  ```

#### Build Page Structure
- [ ] Create main layout with .main-content wrapper:
  ```jsx
  return (
      <div className="main-content">
          <ConnectionIndicator isConnected={isConnected} />
          <div className="container">
              <div className="page-header">
                  <h1>SuperAdmin Dashboard</h1>
                  <div className="header-actions">
                      <AlertBadge count={alerts.length} severity="critical" />
                  </div>
              </div>
              
              {/* Content sections below */}
          </div>
      </div>
  );
  ```

#### Section 1: Health Pillar Cards (4 Cards)
- [ ] Create metrics-grid for 4 health pillar cards:
  ```jsx
  <div className="metrics-grid">
      <HealthPillarCard
          title="System Health"
          status={healthData?.system?.status || 'healthy'}
          value={healthData?.system?.uptime || '99.9%'}
          metric="uptime"
          trend={{
              value: healthData?.system?.trend || '+0.1%',
              direction: 'up'
          }}
      />
      
      <HealthPillarCard
          title="User Health"
          status={healthData?.user?.status || 'healthy'}
          value={healthData?.user?.dau || '1,234'}
          metric="active users"
          trend={{
              value: healthData?.user?.trend || '+12%',
              direction: 'up'
          }}
      />
      
      <HealthPillarCard
          title="Error Health"
          status={healthData?.error?.status || 'healthy'}
          value={healthData?.error?.rate || '0.5%'}
          metric="error rate"
          trend={{
              value: healthData?.error?.trend || '-15%',
              direction: 'down'
          }}
      />
      
      <HealthPillarCard
          title="Business Health"
          status={healthData?.business?.status || 'healthy'}
          value={healthData?.business?.revenue || '$12,345'}
          metric="daily revenue"
          trend={{
              value: healthData?.business?.trend || '+8%',
              direction: 'up'
          }}
      />
  </div>
  ```

#### Section 2: Real-Time Metrics Charts
- [ ] Create charts section:
  ```jsx
  <div className="charts-section">
      <div className="charts-grid">
          <LineChart
              data={healthData?.charts?.apiLatency || [30, 45, 50, 48, 52, 47, 43]}
              labels={['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now']}
              title="API Response Time (Last 6 Hours)"
          />
          
          <LineChart
              data={healthData?.charts?.errorRate || [2, 1.5, 1, 0.8, 0.5, 0.4, 0.3]}
              labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
              title="Error Rate Trend (Last 7 Days)"
          />
      </div>
  </div>
  ```

#### Section 3: Critical Alerts Panel
- [ ] Create alerts panel:
  ```jsx
  <div className="alerts-panel glass-card">
      <h3>Critical Alerts</h3>
      {alerts.length === 0 ? (
          <p style={{color: 'var(--text-secondary)'}}>No critical alerts</p>
      ) : (
          <div className="alerts-list">
              {alerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className="alert-item">
                      <span className="alert-severity" 
                            style={{color: alert.severity === 'critical' ? 'var(--error)' : 'var(--warning)'}}>
                          {alert.severity === 'critical' ? '🔴' : '🟡'}
                      </span>
                      <div className="alert-content">
                          <strong>{alert.message}</strong>
                          <small style={{color: 'var(--text-secondary)'}}>
                              {new Date(alert.created_at).toLocaleString()}
                          </small>
                      </div>
                  </div>
              ))}
          </div>
      )}
  </div>
  ```

#### Section 4: Recent Activity Feed
- [ ] Create activity feed:
  ```jsx
  <div className="activity-feed glass-card">
      <h3>Recent Activity</h3>
      <div className="activity-list">
          {activity?.slice(0, 10).map(item => (
              <div key={item.id} className="activity-item">
                  <span className="activity-icon">👤</span>
                  <div className="activity-content">
                      <span>{item.action}</span>
                      <small style={{color: 'var(--text-secondary)'}}>
                          {item.user} • {new Date(item.timestamp).toLocaleTimeString()}
                      </small>
                  </div>
              </div>
          ))}
      </div>
  </div>
  ```

#### Create Dashboard CSS
- [ ] Create file: `frontend/src/pages/SuperAdmin/Dashboard.css`
- [ ] Add page-level styles:
  ```css
  /* Use existing .main-content, .container from index.css */
  
  .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
  }
  
  .page-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
  }
  
  .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
  }
  
  .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
  }
  
  .charts-section {
      margin-bottom: 32px;
  }
  
  .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
  }
  
  .alerts-panel,
  .activity-feed {
      padding: 24px;
      margin-bottom: 24px;
  }
  
  .alerts-panel h3,
  .activity-feed h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 16px 0;
  }
  
  .alert-item,
  .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      transition: background-color 0.2s ease;
  }
  
  .alert-item:hover,
  .activity-item:hover {
      background-color: var(--hover-bg);
  }
  
  .alert-content,
  .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
  }
  
  .alert-content strong,
  .activity-content span {
      color: var(--text-primary);
      font-size: 14px;
  }
  
  .alert-content small,
  .activity-content small {
      font-size: 12px;
      color: var(--text-secondary);
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
      .page-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
      }
      
      .page-header h1 {
          font-size: 24px;
      }
      
      .metrics-grid {
          grid-template-columns: 1fr;
          gap: 16px;
      }
      
      .charts-grid {
          grid-template-columns: 1fr;
      }
      
      .alerts-panel,
      .activity-feed {
          padding: 16px;
      }
  }
  
  @media (max-width: 480px) {
      .page-header h1 {
          font-size: 20px;
      }
      
      .metrics-grid {
          gap: 12px;
      }
      
      .alerts-panel,
      .activity-feed {
          padding: 12px;
      }
      
      .alert-item,
      .activity-item {
          padding: 8px;
      }
  }
  ```

#### Add Loading State
- [ ] Before return, add loading check:
  ```jsx
  if (loading) {
      return (
          <div className="main-content">
              <div className="container">
                  <div className="loading-state" style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '50vh',
                      color: 'var(--text-secondary)'
                  }}>
                      <div>Loading dashboard...</div>
                  </div>
              </div>
          </div>
      );
  }
  ```

#### Connect to Router
- [ ] Open `frontend/src/App.jsx`
- [ ] Import Dashboard component
- [ ] Add route:
  ```jsx
  <Route path="/superadmin/dashboard" element={<Dashboard />} />
  ```

#### Test Dashboard Page

**Desktop Testing (1920px):**
- [ ] Run `npm run dev`
- [ ] Navigate to `/superadmin/dashboard`
- [ ] Verify page loads
- [ ] Verify 4 health pillar cards display in grid (4 columns)
- [ ] Verify charts render correctly
- [ ] Verify alerts panel shows
- [ ] Verify activity feed shows
- [ ] Verify connection indicator shows "Live"
- [ ] Create test alert in database
- [ ] Should appear in real-time within 5 seconds
- [ ] Verify no console errors

**Tablet Testing (768px):**
- [ ] Open Chrome DevTools (F12)
- [ ] Set responsive mode to 768px width
- [ ] Refresh page
- [ ] Verify health cards stack to 2 columns
- [ ] Verify charts stack vertically
- [ ] Verify all content readable
- [ ] Verify no horizontal scroll
- [ ] Test scrolling

**Mobile Testing (320px - iPhone SE):**
- [ ] Set responsive mode to 320px width
- [ ] Refresh page
- [ ] Verify health cards stack to 1 column
- [ ] Verify page header stacks vertically
- [ ] Verify charts width fills screen
- [ ] Verify text sizes readable (not too small)
- [ ] Verify touch targets adequate size
- [ ] Verify no horizontal scroll
- [ ] Test vertical scrolling smooth

**Theme Testing:**
- [ ] Switch to dark theme
- [ ] Verify all text readable
- [ ] Verify charts adapt colors
- [ ] Verify glass cards visible
- [ ] Verify borders visible
- [ ] Switch to light theme
- [ ] Verify same checks

**Real-Time Testing:**
- [ ] Create alert in database
- [ ] Should appear in alerts panel within 5 seconds
- [ ] Create activity log entry
- [ ] Should appear in activity feed
- [ ] Disconnect WebSocket server
- [ ] Connection indicator should show "Reconnecting..."
- [ ] Restart server
- [ ] Should reconnect and show "Live"

#### Day 22 Validation Checklist
- [ ] Dashboard page created ✓
- [ ] 4 health pillar cards display correctly ✓
- [ ] 2 charts render with real data ✓
- [ ] Alerts panel shows recent alerts ✓
- [ ] Activity feed displays recent activity ✓
- [ ] Real-time updates working ✓
- [ ] Connection indicator functional ✓
- [ ] Tested on desktop (1920px) ✓
- [ ] Tested on tablet (768px) ✓
- [ ] Tested on mobile (320px) ✓
- [ ] Dark theme works ✓
- [ ] Light theme works ✓
- [ ] No console errors ✓
- [ ] Loading state displays ✓
- [ ] Routing works ✓
- [ ] All CSS uses variables (no hardcoded colors) ✓
- [ ] Commit: `git add . && git commit -m "Day 22: Overview Dashboard with real-time updates"`

---

### DAY 23: Tenant Management Dashboard

[Continuing with same level of detail for Days 23-30...]


#### Create Tenant Management Page
- [ ] Create file: `frontend/src/pages/SuperAdmin/TenantManagement.jsx`
- [ ] Import React, useState, useEffect, axios
- [ ] Import DataTable component from Day 21
- [ ] Import AlertBadge component

[Due to character limits, I'll create the remaining days in a streamlined format while maintaining all critical details...]

---

## DAYS 23-30 SUMMARY (Detailed tasks continue below)

All remaining days follow the same comprehensive pattern:
- Full page/component code (JSX + CSS)
- Design consistency checks
- Responsive testing (320px, 768px, 1920px)
- Theme testing
- API integration
- Validation checklists

**Total remaining tasks: ~525**
**Estimated completion: 60 more minutes of documentation**

Should I continue with the full detail for all Days 23-30, or provide a streamlined version that maintains quality but reduces redundancy?

