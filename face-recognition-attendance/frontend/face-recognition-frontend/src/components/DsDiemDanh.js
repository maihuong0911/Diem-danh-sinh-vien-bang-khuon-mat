import React, { useEffect, useState } from "react";
import './DsDiemDanh.css';

const DsDiemDanh = () => {
    const [attendanceList, setAttendanceList] = useState([]);
    const [searchDate, setSearchDate] = useState('');

    // Hàm để lấy danh sách điểm danh từ server
    const fetchAttendanceList = async () => {
        console.log("Fetching attendance list...");
        try {
            const response = await fetch('http://localhost:5000/attendance_list');
            if (!response.ok) throw new Error('Cannot fetch attendance list');
            
            const data = await response.json();
            setAttendanceList(data);
            console.log("Updated attendance list:", data);
        } catch (error) {
            console.error("Error fetching attendance list:", error);
        }
    };

    useEffect(() => {
        // Lấy danh sách điểm danh khi component mount
        fetchAttendanceList();
    }, []);

    // Hàm lọc điểm danh
    const filterAttendance = (searchDate) => {
        return attendanceList.filter(record => {
            const dateMatch = searchDate ?
                new Date(record.check_in_time).toISOString().startsWith(new Date(searchDate).toISOString().slice(0, 10)) :
                true;
            return dateMatch;
        });
    };

    const filteredAttendance = filterAttendance(searchDate);

    // Hàm reset danh sách
    const resetAttendance = () => {
        setAttendanceList([]); // Xóa toàn bộ danh sách
        setSearchDate(''); // Đặt lại ngày tìm kiếm
    };

    return (
        <div className="attendance-list">
            <h3>Danh sách điểm danh gần đây</h3>

            <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="date-input"
            />
            
            {/* Nút Reset ở đây */}
            <button onClick={resetAttendance} className="reset-button">Reset</button>

            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Họ tên</th>
                        <th>Lớp</th>
                        <th>Thời gian điểm danh</th>
                        <th>Chức vụ</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredAttendance.length > 0 ? (
                        filteredAttendance.map((record, index) => (
                            <tr key={record.user_id}>
                                {/* Tính số thứ tự từ dưới lên */}
                                <td>{filteredAttendance.length - index}</td>
                                <td>{record.full_name}</td>
                                <td>{record.class}</td>
                                <td>{new Date(record.check_in_time).toLocaleString()}</td>
                                <td>{record.chucvu}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5">Không tìm thấy bản ghi nào.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default DsDiemDanh;