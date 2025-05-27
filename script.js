
document.addEventListener('DOMContentLoaded', () => {
    const sbdInput = document.getElementById('sbdInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultContainer = document.getElementById('resultContainer');
    let studentData = [];

    function isValidScore(score) {
        if (!score || score === '') return false;
        if (typeof score === 'string') {
            if (score.toUpperCase().includes('VẮNG') || score.toUpperCase().includes('N/V')) return false;
            const normalized = score.replace(',', '.');
            return !isNaN(parseFloat(normalized));
        }
        return !isNaN(parseFloat(score));
    }

    function parseScore(score) {
        if (!score || score === '') return 'N/V';
        if (typeof score === 'string') {
            if (score.toUpperCase().includes('VẮNG') || score.toUpperCase().includes('N/V')) return 'N/V';
            const normalized = score.replace(',', '.');
            const num = parseFloat(normalized);
            return isNaN(num) ? 'N/V' : num;
        }
        return parseFloat(score);
    }

    function calculateTotalScore(student) {
        let total = 0;
        const subjects = ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'];
        subjects.forEach(sub => {
            const score = student[sub];
            if (isValidScore(score)) total += parseScore(score);
        });
        return total;
    }

    function parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const rawHeader = lines[0].replace(/^\uFEFF/, '').split(',');
        const headers = rawHeader.map(h => h.trim());

        const students = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const values = [];
            let current = '', inQuotes = false;

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            if (values.length === headers.length) {
                const student = {};
                headers.forEach((h, idx) => {
                    student[h.trim()] = values[idx];
                });

                const subjectMap = {
                    'Toán': ['Toán', 'Toán '],
                    'Văn': ['Văn', 'Văn '],
                    'Anh': ['Anh', 'Anh '],
                    'Lý': ['Lý'],
                    'Hóa': ['Hóa'],
                    'Sinh': ['Sinh']
                };

                for (const [normalizedKey, possibleKeys] of Object.entries(subjectMap)) {
                    let score = null;
                    for (const key of possibleKeys) {
                        if (student[key] !== undefined && student[key] !== '') {
                            score = student[key];
                            break;
                        }
                    }
                    student[normalizedKey] = parseScore(score);
                }

                student['Tổng điểm'] = calculateTotalScore(student);
                students.push(student);
            }
        }

        return students;
    }

    async function loadStudentData() {
        try {
            const response = await fetch('diem_thi.csv');
            const text = await response.text();
            studentData = parseCSV(text);
        } catch (e) {
            resultContainer.innerHTML = '<p style="color:red;">Không thể tải dữ liệu.</p>';
        }
    }

    function findStudentBySBD(sbd) {
        return studentData.find(std => String(std['SBD']).trim() === sbd);
    }

    searchBtn.addEventListener('click', async () => {
        const sbd = sbdInput.value.trim();
        if (!sbd) {
            resultContainer.innerHTML = '<p style="color:red;">Vui lòng nhập SBD.</p>';
            return;
        }

        if (studentData.length === 0) await loadStudentData();

        const student = findStudentBySBD(sbd);
        if (!student) {
            resultContainer.innerHTML = `<p style="color:orange;">Không tìm thấy SBD <strong>${sbd}</strong></p>`;
        } else {
            displayStudent(student);
        }
    });

    function displayStudent(data) {
        const infoFields = ['SBD', 'HỌ VÀ TÊN', 'NGÀY THÁNG NĂM SINH', 'GIỚI TÍNH', 'ĐIỂM THI'];
        const scoreFields = ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'];

        let html = `
        <div class="student-info">
            <h2>Thông tin học sinh</h2>
            <table class="info-table"><tbody>`;

        infoFields.forEach(f => {
            if (data[f]) html += `<tr><th>${f}:</th><td>${data[f]}</td></tr>`;
        });

        html += `</tbody></table></div><div class="score-info"><h2>Kết quả điểm</h2><table class="score-table"><thead><tr>`;

        scoreFields.forEach(f => html += `<th>${f}</th>`);
        html += `</tr></thead><tbody><tr>`;
        scoreFields.forEach(f => {
            const score = data[f];
            html += `<td>${score !== undefined && score !== null && score !== '' ? score : 'N/V'}</td>`;
        });
        html += `</tr></tbody></table></div>`;

        const khoiMap = {
            'A00': ['Toán', 'Lý', 'Hóa'],
            'A01': ['Toán', 'Lý', 'Anh'],
            'A02': ['Toán', 'Lý', 'Sinh'],
            'B00': ['Toán', 'Hóa', 'Sinh'],
            'B08': ['Toán', 'Sinh', 'Anh'],
            'B03': ['Toán', 'Văn', 'Sinh'],
            'C01': ['Văn', 'Toán', 'Lý'],
            'C02': ['Văn', 'Toán', 'Hóa'],
            'C08': ['Văn', 'Hóa', 'Sinh'],
            'D01': ['Văn', 'Toán', 'Anh'],
            'D07': ['Toán', 'Hóa', 'Anh'],
            'D08': ['Toán', 'Sinh', 'Anh'],
            'D11': ['Văn', 'Lý', 'Anh'],
            'D12': ['Văn', 'Hóa', 'Anh'],
            'D13': ['Văn', 'Sinh', 'Anh']
        };

        html += `<div class="group-code"><h2>Mã khối phù hợp</h2>`;

        let found = false;
        for (const [code, subjects] of Object.entries(khoiMap)) {
            if (subjects.every(sub => isValidScore(data[sub]))) {
                const scores = subjects.map(s => parseScore(data[s]));
                const sum = scores.reduce((a, b) => a + b, 0);
                html += `
                <table class="score-table" style="margin-bottom: 20px; border-collapse: collapse; min-width: 300px;">
                    <thead>
                        <tr style="background-color: #dceeff;">
                            <th>Mã khối</th>
                            <th>Môn 1</th>
                            <th>Môn 2</th>
                            <th>Môn 3</th>
                            <th>Điểm tổng</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>${code}</strong></td>
                            <td>${subjects[0]}</td>
                            <td>${subjects[1]}</td>
                            <td>${subjects[2]}</td>
                            <td rowspan="2" style="font-weight: bold; text-align: center;">${sum.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>${scores[0]}</td>
                            <td>${scores[1]}</td>
                            <td>${scores[2]}</td>
                        </tr>
                    </tbody>
                </table>`;
                found = true;
            }
        }

        if (!found) {
            html += `<p style="text-align:center; color:red;"><strong>Không có mã khối phù hợp</strong></p>`;
        }

        html += `</div>`;
        resultContainer.innerHTML = html;
    }

    loadStudentData(); // preload
});
