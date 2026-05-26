const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycTffXDjKo-rkavklBNRKtz9I_0GjH5z2lmQIgDjNrWeCXra9IQ0vQg_VIq_x1P1GS/exec"; 
let studentDatabase = []; 
let selectedColor = "";
let selectedColorTh = "";
let currentStudent = null;

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
            selectedColor = result.color.name;
            selectedColorTh = result.color.thName;
            
            studentDatabase = result.studentDb; 
            
            // ขยายกรอบ Card ให้กว้างขึ้นเพื่อรองรับ Dashboard
            document.getElementById('main-card').classList.add('wide');
            document.getElementById('page-login').classList.add('hidden');
            document.getElementById('page-entry').classList.remove('hidden');
            
            const title = document.getElementById('form-title');
            title.innerText = `ฟอร์มบันทึกข้อมูล - ${selectedColorTh}`;
            title.style.color = selectedColor === 'Yellow' ? '#b8b800' : (selectedColor === 'Green' ? '#00802b' : selectedColor);
            
            // นำข้อมูลนักกีฬาที่บันทึกไว้แล้วไปแสดงผลในแดชบอร์ด
            renderDashboard(result.registeredData);
        } else {
            errorDiv.innerText = "❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
        }
    } catch (e) {
        errorDiv.innerText = "❌ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ";
    }
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

        status.innerHTML = `<span style="color:green;">✅ บันทึกข้อมูลเรียบร้อยแล้ว!</span>`;
        
        document.getElementById('student-id').value = "";
        document.getElementById('preview-name').innerHTML = "<span style='color:#666;'>กรุณาพิมพ์เลขประจำตัวนักเรียนคนถัดไป...</span>";
        currentStudent = null;
        
        // บันทึกเสร็จแล้วสั่งโหลดข้อมูล Dashboard ใหม่แบบอัตโนมัติ
        refreshDashboard();
        
        setTimeout(() => { status.innerText = ""; }, 3000);
    } catch (e) {
        status.innerHTML = `<span style="color:red;">❌ เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต</span>`;
    }
    btn.disabled = false;
}

// ฟังก์ชันสร้างและวาดตาราง Dashboard รายชื่อนักกีฬาลงบนหน้าเว็บ
function renderDashboard(data) {
    const tbody = document.getElementById('dashboard-body');
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="no-data">ยังไม่มีรายชื่อนักกีฬาลงทะเบียนในสีนี้</td></tr>`;
        return;
    }

    // เรียงลำดับชนิดกีฬา และจัดกลุ่มให้เรียบร้อยเพื่อความสวยงาม
    data.sort((a, b) => a.sport.localeCompare(b.sport) || a.level.localeCompare(b.level));

    let html = "";
    data.forEach(item => {
        const badgeClass = item.level === "ม.ต้น" ? "badge-j" : "badge-s";
        html += `<tr>
            <td><strong>${item.sport}</strong></td>
            <td><span class="badge-level ${badgeClass}">${item.level}</span></td>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.grade}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ฟังก์ชันดึงข้อมูล Dashboard ใหม่จากเซิร์ฟเวอร์แบบแมนนวลหรือหลังบันทึกงาน
async function refreshDashboard() {
    const tbody = document.getElementById('dashboard-body');
    tbody.innerHTML = `<tr><td colspan="5" class="no-data">🔄 กำลังดึงข้อมูลล่าสุด...</td></tr>`;
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboard&colorTh=${encodeURIComponent(selectedColorTh)}`);
        const data = await response.json();
        renderDashboard(data);
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="5" class="no-data" style="color:red;">❌ ไม่สามารถโหลดข้อมูลแดชบอร์ดได้</td></tr>`;
    }
}