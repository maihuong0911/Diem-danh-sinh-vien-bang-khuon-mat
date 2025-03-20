import React, { useEffect, useState } from "react";
import axios from "axios";

const AttendanceList = () => {
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:5000/attendance_list")
      .then(response => setAttendance(response.data))
      .catch(error => console.error("Lỗi khi lấy danh sách điểm danh!", error));
  }, []);

  return (
    <div>
      <h2>Danh sách điểm danh</h2>
      <table border="1">
        <thead>
          <tr>
            <th>ID</th>
            <th>Họ tên</th>
            <th>Chức Vụ</th>
            <th>Class</th>
            <th>Thời gian điểm danh</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.id}</td>
              <td>{entry.full_name}</td>
              <td>{entry.ChucVu}</td>
              <td>{entry.class}</td>
              <td>{entry.check_in_time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceList;
