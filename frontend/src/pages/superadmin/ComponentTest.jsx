import React from 'react';
import HealthPillarCard from '../../components/Dashboard/HealthPillarCard';
import { LineChart, BarChart, PieChart } from '../../components/Charts';
import DataTable from '../../components/Tables/DataTable';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import './ComponentTest.css';

const ComponentTest = () => {
    // Sample data for charts
    const lineData = [30, 45, 60, 55, 70, 80, 75];
    const lineLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const barData = [120, 190, 300, 250, 200, 280, 310];
    const barLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

    const pieData = [300, 150, 100, 80, 50];
    const pieLabels = ['Inventory', 'Sales', 'Marketplace', 'Reports', 'Other'];

    // Sample data for table
    const tableColumns = [
        { key: 'name', label: 'Tenant Name', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'mrr', label: 'MRR', sortable: true, render: (value) => `$${value}` },
        { key: 'healthScore', label: 'Health Score', sortable: true },
        {
            key: 'actions',
            label: 'Actions',
            render: () => <button className="action-btn">View</button>
        }
    ];

    const tableData = [
        { id: 1, name: 'Tech Store A', status: 'Active', mrr: 299, healthScore: 95 },
        { id: 2, name: 'Phone Hub B', status: 'Active', mrr: 499, healthScore: 88 },
        { id: 3, name: 'Mobile World C', status: 'Trial', mrr: 0, healthScore: 72 },
        { id: 4, name: 'Device Shop D', status: 'Active', mrr: 199, healthScore: 65 },
        { id: 5, name: 'Gadget Store E', status: 'Suspended', mrr: 0, healthScore: 45 },
        { id: 6, name: 'Smart Phones F', status: 'Active', mrr: 399, healthScore: 92 },
        { id: 7, name: 'Tech Retail G', status: 'Active', mrr: 299, healthScore: 78 },
        { id: 8, name: 'Mobile Plus H', status: 'Trial', mrr: 0, healthScore: 55 },
        { id: 9, name: 'Phone Express I', status: 'Active', mrr: 599, healthScore: 98 },
        { id: 10, name: 'Device Hub J', status: 'Active', mrr: 299, healthScore: 82 },
        { id: 11, name: 'Tech World K', status: 'Active', mrr: 199, healthScore: 70 },
        { id: 12, name: 'Mobile Store L', status: 'Suspended', mrr: 0, healthScore: 38 }
    ];

    const handleRowClick = (row) => {
        console.log('Row clicked:', row);
    };

    return (
        <SuperAdminLayout
            title="Component Test Page"
            subtitle="Testing all Day 21 components"
        >
            {/* Health Pillar Cards */}
            <section className="test-section">
                <h2 className="section-title">Health Pillar Cards</h2>
                <div className="metrics-grid">
                    <HealthPillarCard
                        title="System Health"
                        status="healthy"
                        value="99.9%"
                        trend="+0.1%"
                        trendDirection="up"
                        subtitle="vs last week"
                    />
                    <HealthPillarCard
                        title="API Performance"
                        status="warning"
                        value="450ms"
                        trend="+50ms"
                        trendDirection="down"
                        subtitle="avg response time"
                    />
                    <HealthPillarCard
                        title="Error Rate"
                        status="critical"
                        value="5.2%"
                        trend="+2.1%"
                        trendDirection="down"
                        subtitle="last 24 hours"
                    />
                    <HealthPillarCard
                        title="Database"
                        status="healthy"
                        value="Active"
                        trend="0 issues"
                        trendDirection="up"
                        subtitle="all connections stable"
                    />
                </div>
            </section>

            {/* Charts */}
            <section className="test-section">
                <h2 className="section-title">Chart Components</h2>

                <div className="charts-grid">
                    <LineChart
                        data={lineData}
                        labels={lineLabels}
                        title="API Response Time (ms)"
                        height={300}
                    />

                    <BarChart
                        data={barData}
                        labels={barLabels}
                        title="Monthly Revenue ($)"
                        height={300}
                    />
                </div>

                <div className="charts-grid-single">
                    <PieChart
                        data={pieData}
                        labels={pieLabels}
                        title="Feature Usage Distribution"
                        height={350}
                    />
                </div>
            </section>

            {/* Data Table */}
            <section className="test-section">
                <h2 className="section-title">Data Table Component</h2>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <DataTable
                        columns={tableColumns}
                        data={tableData}
                        pageSize={5}
                        onRowClick={handleRowClick}
                    />
                </div>
            </section>
        </SuperAdminLayout>
    );
};

export default ComponentTest;

