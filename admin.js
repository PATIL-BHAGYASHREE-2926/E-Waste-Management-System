

    const API_BASE = "http://localhost:5000";

    async function loadReports() {

    let reports = [];

    try {
        const response = await fetch(`${API_BASE}/issues`);
        reports = await response.json();
    }
    catch(err){
        console.error(err);
        return;
    }

    const tableBody = document.getElementById("reportBody");

        tableBody.innerHTML = "";

        reports.forEach(report => {

            tableBody.innerHTML += `
                <tr>

                    <td>${report.id}</td>

                    <td>${report.name}</td>

                    <td>${report.location}</td>

                    <td>${report.issue_type}</td>

                    <td>
                        ${
                            report.image
                            ? `
                            <a href="http://localhost:5000/uploads/${report.image}" target="_blank">
                               <img
                                src="http://localhost:5000/uploads/${report.image}"
                                class="report-img">
                            </a>
                            `
                            : "No Image"
                        }
                    </td>

                    <td>
                        ${
                            report.latitude && report.longitude
                            ?
                            `<a
                                class="gps-btn"
                                href="https://www.google.com/maps?q=${report.latitude},${report.longitude}"
                                target="_blank">
                                📍 View
                                </a>`
                            :
                            "Not Available"
                        }
                    </td>

                    <td>
                        <span class="status-badge ${
                            report.status === "Resolved"
                                ? "resolved"
                                : report.status === "Pending"
                                ? "pending"
                                : "progress"
                        }">

                        ${report.status}
                        </span>
                    </td>

                   <td>
                        <button
                            class="update-btn"
                            onclick="updateStatus(${report.id})">

                            Update

                        </button>

                        <button
                            class="delete-btn"
                            onclick="deleteReport(${report.id})">

                            Delete
                        </button>

                    </td>

                </tr>
            `;

        });
        
    }

    async function loadStats(){

    let stats;

    try{
        const response = await fetch(`${API_BASE}/stats`);
        stats = await response.json();
    }
    catch(err){
        console.error(err);
        return;
    }

        document.getElementById("totalReports").innerText = stats.total_reported;
        document.getElementById("pendingReports").innerText = stats.pending;
        document.getElementById("resolvedReports").innerText = stats.resolved;
    }
    loadStats();
    loadReports();
    loadCharts();
    
    async function updateStatus(id) {

    const { value: status } = await Swal.fire({

        title: "Update Report Status",

        input: "select",

        inputOptions: {
            Pending: "Pending",
            "In Progress": "In Progress",
            Resolved: "Resolved"
        },

        inputPlaceholder: "Choose Status",

        showCancelButton: true,

        confirmButtonColor: "#15803d",

        cancelButtonColor: "#6b7280",

        confirmButtonText: "Update",

        cancelButtonText: "Cancel",

        width: "450px"

});
    if (!status) return;

    const response = await fetch(`${API_BASE}/report/${id}`, {
        

        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            status: status
        })

    });

    await Promise.all([
    loadReports(),
    loadStats(),
    loadCharts()
    ]);

    Swal.fire({

        icon: "success",

        title: "Updated Successfully!",

        text: "Report status has been changed.",

        timer: 1300,

        showConfirmButton: false,

        toast: true,

        position: "top-end"

    });
}

  async function deleteReport(id){

    const result = await Swal.fire({

        title: "🗑️ Delete Report?",

        text: "This action cannot be undone!",

        icon: "warning",

        showCancelButton: true,

        confirmButtonColor: "#dc2626",

        cancelButtonColor: "#6b7280",

        confirmButtonText: "Delete",

        cancelButtonText: "Cancel"

    });

    if(!result.isConfirmed){
        return;
    }

    const response = await fetch(`${API_BASE}/report/${id}`,{
    method:"DELETE"
    });

    if(!response.ok){
        Swal.fire("Error","Couldn't delete report","error");
        return;
    }

    await Promise.all([
    loadReports(),
    loadStats(),
    loadCharts()
    ]);

    Swal.fire({

        icon:"success",

        title:"Deleted!",

        text:"Report deleted successfully.",

        timer:1300,

        toast:true,

        position:"top-end",

        showConfirmButton:false

    });

}



document.getElementById("searchInput").addEventListener("keyup", applyFilters);
document.getElementById("statusFilter").addEventListener("change", applyFilters);
function applyFilters(){

    const search =
        document.getElementById("searchInput")
        .value
        .toLowerCase();

    const status =
        document.getElementById("statusFilter")
        .value;

    const rows =
        document.querySelectorAll("#reportBody tr");

    rows.forEach(row=>{

        const rowText =
            row.innerText.toLowerCase();

        const rowStatus =
            row.cells[6].innerText.trim();

        const matchSearch =
            rowText.includes(search);

        const matchStatus =
            status==="All" ||
            rowStatus===status;

        row.style.display =
            matchSearch && matchStatus
            ? ""
            : "none";

    });

}

let statusChart;
let issueChart;

async function loadCharts() {

    
    let data;

    try{
        const response = await fetch(`${API_BASE}/chart-data`);
        data = await response.json();
    }
    catch(err){
        console.error(err);
        return;
    }

    //---------------- STATUS ----------------//

   const statusMap = {
        "Pending": 0,
        "Resolved": 0,
        "In Progress": 0
    };

    data.status.forEach(item => {
        statusMap[item.status] = item.total;
    });

    const statusLabels = [
        "Pending",
        "Resolved",
        "In Progress"
    ];

    const statusTotals = [
        statusMap["Pending"],
        statusMap["Resolved"],
        statusMap["In Progress"]
    ];

    if(statusChart){
        statusChart.destroy();
    }

    statusChart = new Chart(
        document.getElementById("statusChart"),
        {
            type:"pie",

            data:{
                labels:statusLabels,

                datasets:[{
                    data:statusTotals,  

                    backgroundColor:[
                    "#f59e0b", // Pending
                    "#22c55e", // Resolved
                    "#3b82f6"  // In Progress
                ]
                }]
            },

            options:{
                responsive:true,
                maintainAspectRatio:false,

                plugins:{
                    title:{
                        display:true,
                        text:"Report Status"
                    }
                }
            }

        }
    );


    //---------------- ISSUE ----------------//

    const issueLabels =
        data.issues.map(item=>item.issue_type);

    const issueTotals =
        data.issues.map(item=>item.total);

    if(issueChart){
        issueChart.destroy();
    }

    issueChart = new Chart(

        document.getElementById("issueChart"),

        {

            type:"bar",

            data:{

                labels:issueLabels,

                datasets:[{

                    label:"Reports",

                    data:issueTotals,

                    backgroundColor:[
                        "#16a34a",
                        "#eab308",
                        "#3b82f6"
                    ]

                }]
            },

            options:{
                responsive:true,
                maintainAspectRatio:false,

                scales:{
                    y:{
                        beginAtZero:true,
                        ticks:{
                            stepSize:1
                        }
                    }
                },

                plugins:{

                    title:{
                        display:true,
                        text:"Issue Types"
                    }

                }

            }
        }

    );

}


document.getElementById("exportBtn").addEventListener("click", exportPDF);

function exportPDF(){

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("EcoSmart Waste Reports", 14, 18);

    const rows = [];

    document.querySelectorAll("#reportBody tr").forEach(row=>{

        rows.push([

            row.cells[0].innerText,
            row.cells[1].innerText,
            row.cells[2].innerText,
            row.cells[3].innerText,
            row.cells[6].innerText

        ]);

    });

    doc.autoTable({

        head:[["ID","Name","Location","Issue","Status"]],

        body:rows,

        startY:30,

        theme:"grid",

        headStyles:{
            fillColor:[22,101,52]
        }

    });

    doc.save("EcoSmart_Reports.pdf");

}


