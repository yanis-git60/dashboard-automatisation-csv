let allData = [];
let filteredData = [];

let channelChart = null;
let statusChart = null;
let monthlyChart = null;
let clientsChart = null;
let productsChart = null;

const CSV_FILE = "autodash_fake_sales.csv";

const formatEuro = (value) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};

const showStatus = (message, type = "warning") => {
  const statusBox = document.getElementById("statusBox");
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");

  if (type === "success") {
    statusBox.className = "mb-6 rounded-2xl border border-green-400/30 bg-green-400/10 text-green-200 p-4 text-sm";
  } else {
    statusBox.className = "mb-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-200 p-4 text-sm";
  }
};

const hideStatus = () => {
  document.getElementById("statusBox").classList.add("hidden");
};

const parseCSV = (csvText) => {
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== "");

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(header => header.trim().replaceAll('"', ""));

  return lines.slice(1).map(line => {
    const values = line.split(",").map(value => value.trim().replaceAll('"', ""));

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return {
      id: row.id,
      date: row.date,
      client: row.client,
      produit: row.produit,
      canal: row.canal,
      region: row.region,
      commercial: row.commercial,
      statut: row.statut,
      montant: Number(row.montant || 0),
      duree_jours: Number(row.duree_jours || 0),
      satisfaction: row.satisfaction ? Number(row.satisfaction) : null
    };
  });
};

const loadCSVFromFolder = async () => {
  try {
    const response = await fetch(CSV_FILE);

    if (!response.ok) {
      throw new Error("CSV introuvable");
    }

    const csvText = await response.text();
    allData = parseCSV(csvText);
    filteredData = [...allData];

    populateFilters();
    updateDashboard();
    hideStatus();

    showStatus(`CSV chargé avec succès : ${allData.length} lignes importées.`, "success");
  } catch (error) {
    showStatus(
      "Impossible de charger automatiquement le CSV. Vérifie que autodash_fake_sales.csv est bien dans le dossier et lance le projet avec Live Server.",
      "warning"
    );
  }
};

const populateFilters = () => {
  const channelFilter = document.getElementById("channelFilter");
  const channels = [...new Set(allData.map(item => item.canal).filter(Boolean))];

  channelFilter.innerHTML = `<option value="all">Tous</option>`;

  channels.forEach(channel => {
    const option = document.createElement("option");
    option.value = channel;
    option.textContent = channel;
    channelFilter.appendChild(option);
  });
};

const getPaidData = (data = filteredData) => {
  return data.filter(item => item.statut === "Payé");
};

const sumBy = (data, key) => {
  return data.reduce((acc, item) => {
    const label = item[key] || "Non renseigné";
    acc[label] = (acc[label] || 0) + Number(item.montant || 0);
    return acc;
  }, {});
};

const countBy = (data, key) => {
  return data.reduce((acc, item) => {
    const label = item[key] || "Non renseigné";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
};

const getBestChannel = () => {
  const paidData = getPaidData();
  const totals = sumBy(paidData, "canal");
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return entries.length ? entries[0][0] : "-";
};

const updateKpis = () => {
  const paidData = getPaidData();

  const totalRevenue = paidData.reduce((sum, item) => sum + item.montant, 0);
  const totalOrders = filteredData.length;
  const average = paidData.length > 0 ? totalRevenue / paidData.length : 0;

  document.getElementById("totalRevenue").textContent = formatEuro(totalRevenue);
  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("averageOrder").textContent = formatEuro(average);
  document.getElementById("bestChannel").textContent = getBestChannel();

  document.getElementById("resultCount").textContent =
    `${filteredData.length} résultat${filteredData.length > 1 ? "s" : ""}`;
};

const getStatusBadgeClass = (statut) => {
  if (statut === "Payé") return "badge badge-paid";
  if (statut === "En attente") return "badge badge-waiting";
  if (statut === "Annulé") return "badge badge-cancelled";
  return "badge";
};

const renderDataTable = () => {
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";

  if (filteredData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="table-cell text-center text-slate-400 py-10">
          Aucun résultat trouvé.
        </td>
      </tr>
    `;
    return;
  }

  filteredData.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="table-cell font-semibold">${item.id}</td>
      <td class="table-cell">${item.date}</td>
      <td class="table-cell">${item.client}</td>
      <td class="table-cell">${item.produit}</td>
      <td class="table-cell"><span class="badge">${item.canal}</span></td>
      <td class="table-cell"><span class="${getStatusBadgeClass(item.statut)}">${item.statut}</span></td>
      <td class="table-cell text-right font-bold text-cyan-300">${formatEuro(item.montant)}</td>
    `;

    tableBody.appendChild(row);
  });
};

const getMonthlyRevenue = () => {
  const paidData = getPaidData();

  const monthly = paidData.reduce((acc, item) => {
    const month = item.date.slice(0, 7);
    acc[month] = (acc[month] || 0) + item.montant;
    return acc;
  }, {});

  return Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0]));
};

const chartBaseOptions = {
  responsive: true,
  plugins: {
    legend: {
      labels: {
        color: "#cbd5e1"
      }
    }
  },
  scales: {
    y: {
      ticks: { color: "#94a3b8" },
      grid: { color: "rgba(255, 255, 255, 0.08)" }
    },
    x: {
      ticks: { color: "#94a3b8" },
      grid: { color: "rgba(255, 255, 255, 0.04)" }
    }
  }
};

const destroyCharts = () => {
  [channelChart, statusChart, monthlyChart, clientsChart, productsChart].forEach(chart => {
    if (chart) chart.destroy();
  });
};

const renderOverviewCharts = () => {
  const paidData = getPaidData();

  const channelTotals = sumBy(paidData, "canal");
  const statusTotals = countBy(filteredData, "statut");
  const monthlyTotals = getMonthlyRevenue();

  if (channelChart) channelChart.destroy();
  if (statusChart) statusChart.destroy();
  if (monthlyChart) monthlyChart.destroy();

  channelChart = new Chart(document.getElementById("channelChart"), {
    type: "bar",
    data: {
      labels: Object.keys(channelTotals),
      datasets: [{
        label: "CA payé",
        data: Object.values(channelTotals),
        backgroundColor: "rgba(34, 211, 238, 0.65)",
        borderColor: "rgba(34, 211, 238, 1)",
        borderWidth: 1,
        borderRadius: 12
      }]
    },
    options: chartBaseOptions
  });

  statusChart = new Chart(document.getElementById("statusChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(statusTotals),
      datasets: [{
        label: "Statuts",
        data: Object.values(statusTotals),
        backgroundColor: [
          "rgba(34, 197, 94, 0.75)",
          "rgba(250, 204, 21, 0.75)",
          "rgba(239, 68, 68, 0.75)"
        ],
        borderColor: "rgba(15, 23, 42, 1)"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#cbd5e1" }
        }
      }
    }
  });

  monthlyChart = new Chart(document.getElementById("monthlyChart"), {
    type: "line",
    data: {
      labels: monthlyTotals.map(item => item[0]),
      datasets: [{
        label: "CA mensuel payé",
        data: monthlyTotals.map(item => item[1]),
        borderColor: "rgba(34, 211, 238, 1)",
        backgroundColor: "rgba(34, 211, 238, 0.12)",
        fill: true,
        tension: 0.35
      }]
    },
    options: chartBaseOptions
  });
};

const renderClients = () => {
  const paidData = getPaidData();
  const clientRevenue = sumBy(paidData, "client");
  const clientCount = countBy(paidData, "client");

  const sortedClients = Object.entries(clientRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const clientsTable = document.getElementById("clientsTable");
  clientsTable.innerHTML = "";

  sortedClients.forEach(([client, revenue]) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="table-cell font-semibold">${client}</td>
      <td class="table-cell text-right font-bold text-cyan-300">${formatEuro(revenue)}</td>
      <td class="table-cell text-right">${clientCount[client] || 0}</td>
    `;

    clientsTable.appendChild(row);
  });

  if (clientsChart) {
    clientsChart.destroy();
  }

  const ctx = document.getElementById("clientsChart");

  clientsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedClients.map(item => item[0]),
      datasets: [{
        label: "CA payé par client",
        data: sortedClients.map(item => Number(item[1])),
        backgroundColor: "rgba(34, 211, 238, 0.65)",
        borderColor: "rgba(34, 211, 238, 1)",
        borderWidth: 1,
        borderRadius: 12
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#cbd5e1"
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: "#94a3b8",
            callback: function(value) {
              return value + " €";
            }
          },
          grid: {
            color: "rgba(255, 255, 255, 0.08)"
          }
        },
        y: {
          ticks: {
            color: "#94a3b8"
          },
          grid: {
            color: "rgba(255, 255, 255, 0.04)"
          }
        }
      }
    }
  });
};

const renderProducts = () => {
  const paidData = getPaidData();
  const productRevenue = sumBy(paidData, "produit");
  const productCount = countBy(paidData, "produit");

  const sortedProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1]);

  const productsTable = document.getElementById("productsTable");
  productsTable.innerHTML = "";

  sortedProducts.forEach(([product, revenue]) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="table-cell font-semibold">${product}</td>
      <td class="table-cell text-right font-bold text-cyan-300">${formatEuro(revenue)}</td>
      <td class="table-cell text-right">${productCount[product] || 0}</td>
    `;

    productsTable.appendChild(row);
  });

  if (productsChart) {
    productsChart.destroy();
  }

  const ctx = document.getElementById("productsChart");

  productsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedProducts.map(item => item[0]),
      datasets: [{
        label: "CA payé par produit",
        data: sortedProducts.map(item => Number(item[1])),
        backgroundColor: "rgba(34, 211, 238, 0.65)",
        borderColor: "rgba(34, 211, 238, 1)",
        borderWidth: 1,
        borderRadius: 12
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#cbd5e1"
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: "#94a3b8",
            callback: function(value) {
              return value + " €";
            }
          },
          grid: {
            color: "rgba(255, 255, 255, 0.08)"
          }
        },
        y: {
          ticks: {
            color: "#94a3b8"
          },
          grid: {
            color: "rgba(255, 255, 255, 0.04)"
          }
        }
      }
    }
  });
};


const applyFilters = () => {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const channel = document.getElementById("channelFilter").value;
  const status = document.getElementById("statusFilter").value;

  filteredData = allData.filter(item => {
    const matchesSearch =
      item.client.toLowerCase().includes(search) ||
      item.produit.toLowerCase().includes(search) ||
      item.id.toLowerCase().includes(search);

    const matchesChannel = channel === "all" || item.canal === channel;
    const matchesStatus = status === "all" || item.statut === status;

    return matchesSearch && matchesChannel && matchesStatus;
  });

  updateDashboard();
};

const resetFilters = () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("channelFilter").value = "all";
  document.getElementById("statusFilter").value = "all";

  filteredData = [...allData];
  updateDashboard();
};

const exportCSV = () => {
  if (filteredData.length === 0) {
    showStatus("Aucune donnée à exporter.", "warning");
    return;
  }

  const headers = [
    "id",
    "date",
    "client",
    "produit",
    "canal",
    "region",
    "commercial",
    "statut",
    "montant",
    "duree_jours",
    "satisfaction"
  ];

  const rows = filteredData.map(item => headers.map(header => item[header] ?? ""));

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "export-autodash-filtre.csv";
  link.click();

  URL.revokeObjectURL(url);
};

const updateDashboard = () => {
  updateKpis();
  renderDataTable();

  const activeTab = document.querySelector(".tab-panel.active")?.id;

  if (activeTab === "overview") {
    renderOverviewCharts();
  }

  if (activeTab === "clients") {
    renderClients();
  }

  if (activeTab === "products") {
    renderProducts();
  }
};


const switchTab = (tabName) => {
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.remove("active");
  });

  document.querySelectorAll(".tab-btn, .mobile-tab-btn").forEach(button => {
    button.classList.remove("active");
  });

  document.getElementById(tabName).classList.add("active");

  document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(button => {
    button.classList.add("active");
  });

  setTimeout(() => {
    if (tabName === "overview") {
      renderOverviewCharts();
    }

    if (tabName === "clients") {
      renderClients();
    }

    if (tabName === "products") {
      renderProducts();
    }
  }, 50);
};


document.querySelectorAll(".tab-btn, .mobile-tab-btn").forEach(button => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);
    document.getElementById("mobileMenu").classList.add("hidden");
  });
});

document.getElementById("mobileMenuBtn").addEventListener("click", () => {
  document.getElementById("mobileMenu").classList.toggle("hidden");
});

document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("channelFilter").addEventListener("change", applyFilters);
document.getElementById("statusFilter").addEventListener("change", applyFilters);
document.getElementById("resetFiltersBtn").addEventListener("click", resetFilters);
document.getElementById("exportBtn").addEventListener("click", exportCSV);
document.getElementById("reloadCsvBtn").addEventListener("click", loadCSVFromFolder);

document.getElementById("csvInput").addEventListener("change", event => {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    const csvText = e.target.result;

    allData = parseCSV(csvText);
    filteredData = [...allData];

    document.getElementById("importFileName").textContent = file.name;

    populateFilters();
    resetFilters();
    switchTab("overview");

    showStatus(`Nouveau CSV importé avec succès : ${allData.length} lignes.`, "success");
  };

  reader.readAsText(file);
});

loadCSVFromFolder();