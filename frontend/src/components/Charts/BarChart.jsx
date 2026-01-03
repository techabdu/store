import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import './Charts.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const BarChart = ({ data, labels, title, height = 300 }) => {
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

    const chartData = {
        labels: labels,
        datasets: [{
            label: title,
            data: data,
            backgroundColor: isDark
                ? 'rgba(66, 133, 244, 0.7)'
                : 'rgba(66, 133, 244, 0.8)',
            borderColor: '#4285F4',
            borderWidth: 1,
            borderRadius: 8,
            hoverBackgroundColor: '#4285F4'
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
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
                        return context.parsed.y.toLocaleString();
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: isDark ? '#9AA0A6' : '#5F6368',
                    font: {
                        size: 11,
                        family: 'Inter, system-ui'
                    }
                },
                grid: {
                    color: isDark ? '#3C4043' : '#DADCE0',
                    drawBorder: false
                }
            },
            x: {
                ticks: {
                    color: isDark ? '#9AA0A6' : '#5F6368',
                    font: {
                        size: 11,
                        family: 'Inter, system-ui'
                    }
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
            <div className="chart-container" style={{ height: `${height}px` }}>
                <Bar data={chartData} options={options} />
            </div>
        </div>
    );
};

export default BarChart;
