window.addEventListener('load', () => {
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  const toggleButton = mainContent.querySelector('.banner-content .btn');

  const style = document.createElement('style');
  style.textContent = `
      @media (min-width: 993px) {
            .sidebar {
                position: fixed;
                top: 0;
                bottom: 0;
                left: 0;
                z-index: 1000;
            }
            
            .sidebar.minimized {
                width: 70px;
            }
            
            .sidebar:not(.minimized) {
                width: 250px;
            }
            
            .sidebar.minimized .nav-text {
                display: none;
            }
            
            .sidebar:not(.minimized) .nav-text {
                display: inline-block;
            }
            
            .main-content {
                transition: margin-left 0.3s ease;
            }

            .banner-content .btn {
                display: none;
            }
        }

      @media (max-width: 992px) {
          .sidebar {
              left: -250px;
              width: 250px !important;
              transition: left 0.3s ease;
          }
          
          .sidebar.show-sidebar {
              left: 0;
          }
          
          .main-content {
              width: 100%;
              padding-left: 0 !important;
          }
      }
  `;
  document.head.appendChild(style);

  if (window.innerWidth > 992) {
      sidebar.classList.add('minimized');

      sidebar.addEventListener('mouseenter', () => {
          sidebar.classList.remove('minimized');
          mainContent.classList.add('expanded-sidebar');
      });
      
      sidebar.addEventListener('mouseleave', () => {
          sidebar.classList.add('minimized');
          mainContent.classList.remove('expanded-sidebar');
      });
      
      mainContent.addEventListener('mouseenter', () => {
          sidebar.classList.add('minimized');
          mainContent.classList.remove('expanded-sidebar');
      });
  }

  toggleButton.addEventListener('click', () => {
      if (window.innerWidth <= 992) {
       
          sidebar.classList.remove('minimized');
          sidebar.classList.toggle('show-sidebar');
      }
  });

  document.addEventListener('click', (event) => {
      if (window.innerWidth <= 992 &&
          !sidebar.contains(event.target) && 
          !toggleButton.contains(event.target) && 
          sidebar.classList.contains('show-sidebar')) {
          sidebar.classList.remove('show-sidebar');
          sidebar.classList.add('minimized');
      }
  });

  window.addEventListener('resize', () => {
      if (window.innerWidth > 992) {
          sidebar.classList.add('minimized');
          mainContent.classList.remove('expanded-sidebar');
          sidebar.classList.remove('show-sidebar');
      } else {
          sidebar.classList.remove('minimized');
          mainContent.classList.remove('expanded-sidebar');
          sidebar.classList.remove('show-sidebar');
      }
  });
});

    // Update the dropdown toggle function
    function toggleDropdown() {
        const dropdown = document.getElementById('dropdownMenu');
        const sidebar = document.querySelector('.sidebar');
        const isMinimized = sidebar.classList.contains('minimized');
        
        dropdown.classList.toggle('active');
        
        // Position dropdown correctly based on sidebar state
        if (isMinimized) {
            dropdown.style.left = '50px';
        } else {
            dropdown.style.left = '10px';
        }
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('dropdownMenu');
        const accountSection = document.querySelector('.account-section');
        
        if (!accountSection.contains(event.target) && 
            !dropdown.contains(event.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Card JS
    function updateMetric(value, percentageText) {
        document.querySelector('.card-value').textContent = `$${value.toFixed(2)}`;
    
        let percentage = parseFloat(percentageText.replace(/[^0-9.-]/g, ''));
    
        let icon = percentageText.includes("🔼") ? "🔼" : percentageText.includes("🔽") ? "🔽" : "";
    
        // Set color based on increase or decrease
        let color = percentageText.includes("🔼") ? "green" : percentageText.includes("🔽") ? "red" : "black";
    
        document.querySelector('.card-change').innerHTML = `
            <div class="change-icon" style="color: ${color};">${icon}</div>
            ${percentage.toFixed(2)}% Compared to last month
        `;
    }
  

    // Line Graph
    const ctx = document.getElementById('myChart').getContext('2d');

    const data = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      datasets: [
        {
          label: 'Series 1',
          data: [12, 19, 3, 5, 2, 3, 7, 9],
          borderColor: '#FF6384',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 3,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointHitRadius: 100,
        },
        {
          label: 'Series 2',
          data: [2, 29, 5, 5, 45, 20, 10, 6],
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 3,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointHitRadius: 100,
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
                return tooltipItem.raw + '%';
            }
          },
          backgroundColor: '#fff',
          titleColor: '#333',
          bodyColor: '#333',
          borderColor: '#ccc',
          borderWidth: 1,
          displayColors: false,
          bodyFont: {
            size: 15
          },
          titleFont: {
              size: 14
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#333',
            font: {
              family: 'Montserrat',
              size: 12
            }
          }
        },
        y: {
          position: 'right',
          grid: {
            color: '#eee'
          },
          ticks: {
            color: '#333',
            font: {
              family: 'Montserrat',
              size: 12
            }
          }
        }
      },
      animation: {
        duration: 2000, 
        easing: 'easeOutQuart'
      }
    };

    // Create the chart
    const myChart = new Chart(ctx, {
      type: 'line',
      data: data,
      options: options
});


// user statistics card

window.addEventListener('load', () => {
  const progressCircle = document.querySelector('.user-statistics-progress');
  const totalDisplay = document.querySelector('.user-statistics-total');
  const premiumDisplay = document.querySelector('.user-statistics-premium-count');
  const basicDisplay = document.querySelector('.user-statistics-basic-count');
  
  const radius = progressCircle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  
  // Set initial state
  progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressCircle.style.strokeDashoffset = circumference;
  
  // Target values
  const TOTAL_USERS = 2324;
  const PREMIUM_USERS = 1809;
  const BASIC_USERS = 515;
  const TARGET_PERCENTAGE = PREMIUM_USERS / TOTAL_USERS;
  
  const duration = 1500;
  const startTime = performance.now();
  
  function updateProgress(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Update circle
    const currentOffset = circumference - (progress * TARGET_PERCENTAGE * circumference);
    progressCircle.style.strokeDashoffset = currentOffset;
    
    // Update numbers
    totalDisplay.textContent = Math.round(progress * TOTAL_USERS).toLocaleString();
    premiumDisplay.textContent = Math.round(progress * PREMIUM_USERS).toLocaleString();
    basicDisplay.textContent = Math.round(progress * BASIC_USERS).toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(updateProgress);
    }
  }
  
  requestAnimationFrame(updateProgress);
});

// Line Bar Chart
window.addEventListener('load', () => {
  const bars = document.querySelectorAll('.country-sessions-bar');
  setTimeout(() => {
    bars.forEach((bar, index) => {
      const percentage = bar.getAttribute('data-percentage');
      setTimeout(() => {
        bar.style.width = `${percentage}%`;
      }, index * 200);
    });
  }, 100);
});

// Radar Chart
document.addEventListener('DOMContentLoaded', function () {
  const dataPolygon = document.getElementById('dataPolygon');
  dataPolygon.classList.add('animate');

  const replayButton = document.getElementById('replayButton');
  replayButton.addEventListener('click', function () {
    dataPolygon.classList.remove('animate');
    void dataPolygon.offsetWidth;
    dataPolygon.classList.add('animate');
  });
});


// chart one line
document.addEventListener('DOMContentLoaded', function () {
  const ctx = document.getElementById('chart2nd');
  new Chart(ctx, {
      type: 'line',
      data: {
          labels: ['QAD', 'MIS', 'QSD', 'PDN', 'SWD', 'IPC'],
          datasets: [{
              label: '',
              data: [65, 20, 18, 65, 55, 90],
              fill: 'start',
              backgroundColor: 'rgba(92, 135, 196, 0.253)',
              borderColor: '#5c88c4',
              borderWidth: 1.5,
              tension: 0.1,
              pointRadius: 2,
              pointHoverRadius: 5,
              pointHitRadius: 100,
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
                      label: function (tooltipItem) {
                          return tooltipItem.raw + '%';
                      }
                  },
                  displayColors: false,
                  bodyFont: {
                      size: 15
                  },
                  titleFont: {
                      size: 14
                  }
              }
          },
          scales: {
              y: {
                  beginAtZero: true,
                  min: 0,
                  max: 100,
                  grid: {
                      display: false,
                  },
                  ticks: {
                      callback: function (value) {
                          if (value === 100 || value === 50) return value + '%';
                          return '';
                      }
                  }
              },
              x: {
                  offset: false,
                  grid: {
                      display: false,
                  },
                  ticks: {
                      align: 'start',
                      font: {
                          family: 'Montserrat',
                          size: 12,
                          weight: 'normal'
                      },
                      color: '#333'
                  }
              },
              y: {
                position: 'right',
                grid: {
                  color: '#eee'
                },
                ticks: {
                  color: '#333',
                  font: {
                    family: 'Montserrat',
                    size: 12
                  }
                }
              }
          }
      }
  });
});


// Pie Graph

document.addEventListener("DOMContentLoaded", function () {
  const ctx = document.getElementById('expenseChart').getContext('2d');

  const expenseChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
          labels: ['Bills Payment', 'Foods and Drinks', 'Uncategorized'],
          datasets: [{
              data: [52.66, 635.18, 21.00],
              backgroundColor: ['#D2665A', '#5c88c4', '#B2A5FF'],
              borderWidth: 0
          }]
      },
      options: {
          responsive: true,
          animation: {
              animateScale: true,
              animateRotate: true
          },
          plugins: {
              legend: {
                  display: false
              }
          },
          cutout: '60%'
      }
  });
});


// Search Toggle
function toggleSearch() {
  document.getElementById('searchContainer').classList.toggle('active');
}

// Handle the search functionality
function handleSearch() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  filteredData = allData.filter(item =>
    Object.values(item).some(value =>
      value.toString().toLowerCase().includes(searchTerm)
    )
  );
  currentPage = 1;
  populateTable();
  updatePagination();
}

// Filter
document.addEventListener('DOMContentLoaded', function() {
  const filterButton = document.querySelector('.filter-button');
  const filterPanel = document.querySelector('.filter-panel');
  const clearButtons = document.querySelectorAll('.clear-btn');
  const resetButton = document.querySelector('.reset-btn');
  const inputs = document.querySelectorAll('input, select');
  
  filterButton.addEventListener('click', function() {
    filterPanel.classList.toggle('active');
  });
  
  document.addEventListener('click', function(event) {
    if (!filterPanel.contains(event.target) && !filterButton.contains(event.target)) {
      filterPanel.classList.remove('active');
    }
  });
  
  clearButtons.forEach(button => {
    button.addEventListener('click', function() {
      const section = button.closest('.filter-section');
      const sectionInputs = section.querySelectorAll('input, select');
      sectionInputs.forEach(input => {
        input.value = '';
      });
    });
  });
  
  resetButton.addEventListener('click', function() {
    inputs.forEach(input => {
      input.value = '';
    });
  });
});

// Modal Upload
function handleDrop(e) {
  e.preventDefault();
  const files = e.dataTransfer.files;
  console.log('Dropped files:', files);
}

function handleDragOver(e) {
  e.preventDefault();
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof bootstrap !== 'undefined') {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  }
});


// Login Password toggle

function togglePassword(id, eyeId) {
  const passwordInput = document.getElementById(id);
  const eyeIcon = document.getElementById(eyeId);
  
  if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
  } else {
      passwordInput.type = 'password';
      eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
      `;
  }
}

// Toast message
document.addEventListener('DOMContentLoaded', function () {
  // Select all toasts
  const toastElList = [].slice.call(document.querySelectorAll('.toast'));
  
  // Initialize each toast
  toastElList.forEach(function (toastEl) {
    const toast = new bootstrap.Toast(toastEl);
    toast.show(); // Show toast on page load
  });
});


// Form Validation
(() => {
  'use strict'
  const forms = document.querySelectorAll('.needs-validation')
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

