import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import './Charts.css';

// Register Chart.js components
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend
);

const PieChart = ({ data, labels, title, height = 300 }) => {
    const [theme, setTheme] = useState('light');

    // Detect theme changes
    useEffect(() => {
        const detectTheme = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            setTheme(currentTheme);
        };

        detectTheme();

        // Watch for theme changes
        const observer = new MutationObserver(detectTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        return () => observer.disconnect();
    }, []);

    const isDark = theme === 'dark';

    // Google-inspired color palette
    const colors = [
        '#4285F4', // Primary Blue
        '#34A853', // Success Green
        '#FBBC04', // Warning Yellow
        '#EA4335', // Error Red
        '#8B5CF6', // Purple
        '#06B6D4', // Cyan
        '#F97316', // Orange
        '#EC4899'  // Pink
    ];

    const chartData = {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: colors.slice(0, data.length),
            borderColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 8
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: isDark ? '#E8EAED' : '#202124',
                    font: {
                        family: 'Inter, system-ui',
                        size: 12
                    },
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
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
                displayColors: true,
                titleFont: {
                    family: 'Inter, system-ui',
                    size: 13,
                    weight: '600'
                },
                bodyFont: {
                    family: 'Inter, system-ui',
                    size: 12
                },
                callbacks: {
                    label: function (context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            }
        }
    };

    return (
        <div className="chart-wrapper glass-card">
            {title && <h3 className="chart-title">{title}</h3>}
            <div className="chart-container" style={{ height: `${height}px` }}>
                <Pie data={chartData} options={options} />
            </div>
        </div>
    );
};

export default PieChart;
