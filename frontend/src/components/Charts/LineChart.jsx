import React, { useEffect, useState } from 'react';
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
import './Charts.css';

// Register Chart.js components
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

const LineChart = ({ data, labels, title, height = 300 }) => {
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
            borderColor: '#4285F4', // var(--primary)
            backgroundColor: isDark
                ? 'rgba(66, 133, 244, 0.1)'
                : 'rgba(66, 133, 244, 0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#4285F4',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2
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
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

export default LineChart;
