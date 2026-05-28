const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxEeFiQQcQ4l2PPCCyCxMfvlCtWBeQxxrDGAv3KzFHWCiZY-9qJ-Tb8UawgYTOvzp7P/exec"; 
let studentDatabase = []; 
let currentUserRole = ""; 
let selectedColor = "";
let selectedColorTh = "";
let currentStudent = null;
let cacheDashboardData = []; // เก็บข้อมูลนักกีฬาที่โหลดมา เพื่อใช้ค้นหาแบบทันที (Client-side Search)

async function checkPassword() {
    const inputPass = document.getElementById('color-password').value.trim();
    const errorDiv = document.getElementById('login-error');
    if(!inputPass) return;

    errorDiv.innerHTML = "<span style='color:orange;'>กำลังตรวจสอบสิทธิ์...</span>";

    try {
        const response = await fetch(`${SCRIPT_URL}?action=checkPassword&password=${encodeURIComponent(inputPass)}`);
        const result = await response.json();
        
        if (result.success) {
            errorDiv.innerText = "";
            currentUserRole = result.user.role;
            studentDatabase = result.studentDb; 
            
            document.getElementById('main-card').classList.add('wide');
            document.getElementById('page-login').classList.add('hidden');
            document.getElementById('page-entry').classList.remove('hidden');
            
            if (currentUserRole === 'admin') {
                document.getElementById('admin-color-selection').classList.remove('hidden');
                document.getElementById('admin-search-box').classList.remove('hidden'); // เปิดกล่องค้นหาสำหรับ Admin
                document.getElementById('th-manage').classList.remove('hidden');       // เปิดหัวตารางปุ่มลบ
                document.getElementById('form-title').innerText = "ระบบจัดการของแอดมิน (Admin)";
                document.getElementById('form-title').style.color = "#333";
                document.getElementById('dashboard-body').innerHTML = `<tr><td colspan="6" class="no-data">เลือกรหัสสีคณะด้านบนเพื่อเปิดดูแดชบอร์ด</td></tr>`;
            } else {
                selectedColor = result.user.name;
                selectedColorTh = result.user.thName;
                
                updateFormTheme();
                renderDashboard(result.registeredData);
            }
        } else {
            errorDiv.innerText = "❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
        }
    } catch (e) {
        errorDiv.innerText = "❌ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ";
    }
}

function adminChangeColor() {
    const selectVal = document.getElementById('admin-select-color').value;
    if(!selectVal) return;
    
    const parts = selectVal.split('|');
    selectedColor = parts[0];   
    selectedColorTh = parts[1]; 
    
    document.getElementById('dashboard-search').value = ""; // รีเซ็ตคำค้นหาเวลาเปลี่ยนสี
    updateFormTheme();
    refreshDashboard();
}

function updateFormTheme() {
    const title = document.getElementById('form-title');
    title.innerText = `ฟอร์มบันทึกข้อมูล - ${selectedColorTh}`;
    title.style.color = selectedColor === 'Yellow' ? '#b8b800' : (selectedColor === 'Green' ? '#00802b' : selectedColor);
    document.getElementById('dashboard-header').innerText = `📊 รายชื่อนักกีฬา - ${selectedColorTh}`;
}

function lookupStudent() {
    const id = document.getElementById('student-id').value;
    const preview = document.getElementById('preview-name');

    if (id.length < 3) {
        preview.innerHTML = "<span style='color:#666;'>กำลังรอเลขประจำตัว...</span>";
        currentStudent = null;
        return;
    }

    const student = studentDatabase.find(row => row[0].toString() === id);

    if (student) {
        const levelText = student[3] && student[3].toUpperCase() === 'J' ? 'ม.ต้น' : 'ม.ปลาย';
        currentStudent = { name: student[1], grade: student[2], level: student[3] || 'J' };
        preview.innerHTML = `<span style="color:green; font-weight:bold;">✔ พบข้อมูล:</span><br>
                             <strong>ชื่อ:</strong> ${student[1]}<br>
                             <strong>ชั้น:</strong> ${student[2]} (${levelText})`;
    } else {
        currentStudent = null;
        preview.innerHTML = `<span style="color:red; font-weight:bold;">✘ ไม่พบเลขประจำตัวนี้ในระบบ</span>`;
    }
}

async function submitData() {
    if (!selectedColor) {
        alert("กรุณาเลือกสีคณะที่ต้องการบันทึกข้อมูลก่อน!");
        return;
    }
    if (!currentStudent) {
        alert("กรุณากรอกเลขประจำตัวนักเรียนให้ถูกต้องก่อนบันทึก!");
        return;
    }
    
    const btn = document.getElementById('submit-btn');
    const status = document.getElementById('status');
    const sport = document.getElementById('sport-name').value;
    
    btn.disabled = true;
    status.innerHTML = "<span style='color:orange;'>กำลังบันทึกข้อมูล...</span>";

    const payload = {
        id: document.getElementById('student-id').value,
        name: currentStudent.name,
        grade: currentStudent.grade,
        level: currentStudent.level, 
        sport: sport,
        color: selectedColor
    };

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(payload)
        });

        status.innerHTML = `<span style="color:green;">✅ บันทึกข้อมูลของ ${selectedColorTh} เรียบร้อยแล้ว!</span>`;
        
        document.getElementById('student-id').value = "";
        document.getElementById('preview-name').innerHTML = "<span style='color:#666;'>กรุณาพิมพ์เลขประจำตัวนักเรียนคนถัดไป...</span>";
        currentStudent = null;
        
        refreshDashboard();
        
        setTimeout(() => { status.innerText = ""; }, 3000);
    } catch (e) {
        status.innerHTML = `<span style="color:red;">❌ เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต</span>`;
    }
    btn.disabled = false;
}

// ฟังก์ชันกรองข้อมูลในหน้าเว็บ (Real-time Search)
function filterDashboard() {
    const keyword = document.getElementById('dashboard-search').value.toLowerCase().trim();
    if (!keyword) {
        renderDashboard(cacheDashboardData);
        return;
    }
    
    const filtered = cacheDashboardData.filter(item => {
        return item.id.toString().toLowerCase().includes(keyword) || 
               item.name.toLowerCase().includes(keyword) || 
               item.sport.toLowerCase().includes(keyword) ||
               item.grade.toString().toLowerCase().includes(keyword);
    });
    
    renderDashboard(filtered);
}

function renderDashboard(data) {
    const tbody = document.getElementById('dashboard-body');
    const colCount = currentUserRole === 'admin' ? 6 : 5;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="no-data">ไม่พบข้อมูลรายชื่อนักกีฬา</td></tr>`;
        return;
    }

    data.sort((a, b) => a.sport.localeCompare(b.sport) || a.level.localeCompare(b.level));

    let html = "";
    data.forEach(item => {
        const badgeClass = item.level === "ม.ต้น" ? "badge-j" : "badge-s";
        html += `<tr>
            <td><strong>${item.sport}</strong></td>
            <td><span class="badge-level ${badgeClass}">${item.level}</span></td>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.grade}</td>`;
        
        // ถ้าเป็น Admin ให้สร้างปุ่มลบขึ้นมาในแต่ละแถว
        if (currentUserRole === 'admin') {
            html += `<td><button class="btn-delete" onclick="deleteAthlete('${item.id}', '${item.name}', '${item.sport}', '${item.level}')">ลบ</button></td>`;
        }
        
        html += `</tr>`;
    });
    tbody.innerHTML = html;
}

// ฟังก์ชันส่งคำสั่งลบคนไปยัง Google Sheets
async function deleteAthlete(id, name, sport, level) {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบคุณ "${name}" ออกจากกีฬา ${sport} (${level})`)) {
        return;
    }
    
    const tbody = document.getElementById('dashboard-body');
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">🗑 กำลังลบข้อมูลและจัดเรียงแถวใหม่...</td></tr>`;

    const payload = {
        action: "delete",
        id: id,
        sport: sport,
        level: level,
        colorTh: selectedColorTh
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const resText = await response.text();
        
        if (resText === "Delete Success") {
            alert("✅ ลบข้อมูลและจัดเรียงลำดับใหม่เรียบร้อยแล้ว");
        } else {
            alert("❌ เกิดข้อผิดพลาด: " + resText);
        }
    } catch(e) {
        alert("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อลบข้อมูลได้");
    }
    
    // โหลดข้อมูลแบบ Real-time เข้ามาแสดงผลแทนที่ทันที
    refreshDashboard();
}

async function refreshDashboard() {
    if (!selectedColorTh) return;
    const tbody = document.getElementById('dashboard-body');
    const colCount = currentUserRole === 'admin' ? 6 : 5;
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="no-data">🔄 กำลังดึงข้อมูลล่าสุด...</td></tr>`;
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboard&colorTh=${encodeURIComponent(selectedColorTh)}`);
        const data = await response.json();
        cacheDashboardData = data; // อัปเดตข้อมูลใส่ cache
        
        // ถ้ามีการพิมพ์ค้นหาค้างไว้ ให้ใช้ตัวกรองค้นหาทำงานต่อทันที
        const keyword = document.getElementById('dashboard-search')?.value;
        if (keyword) {
            filterDashboard();
        } else {
            renderDashboard(data);
        }
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="no-data" style="color:red;">❌ ไม่สามารถโหลดข้อมูลแดชบอร์ดได้</td></tr>`;
    }
}