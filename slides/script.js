// Khởi tạo Reveal.js
Reveal.initialize({
    hash: true,
    transition: 'convex',
    backgroundTransition: 'fade',
    slideNumber: 'c/t',
    autoAnimateDuration: 0.8,
});

// Khởi tạo Mermaid.js
mermaid.initialize({ 
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    flowchart: { curve: 'basis' }
});

// Vẽ biểu đồ kết quả đánh giá (Chart.js)
document.addEventListener("DOMContentLoaded", () => {
    const ctx = document.getElementById('accuracyChart').getContext('2d');
    
    // Gradient cho cột
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#00f2fe');
    gradient.addColorStop(1, '#4facfe');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Grand Total', 'Item Count', 'Shared Fee Detection'],
            datasets: [{
                label: 'Accuracy (%)',
                data: [88.9, 77.8, 88.9], // Data từ kết quả test thực tế
                backgroundColor: gradient,
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'transparent'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#e2e8f0',
                        font: {
                            size: 14
                        }
                    }
                }
            }
        }
    });
});
