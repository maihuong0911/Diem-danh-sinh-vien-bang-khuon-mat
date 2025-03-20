import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './StudentList.css'; // Đảm bảo đường dẫn đúng

const StudentList = ({ onBack }) => {
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendanceList, setAttendanceList] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [filteredStudents, setFilteredStudents] = useState([]);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        // Thực hiện lấy danh sách sinh viên và điểm danh nếu có lớp được chọn
        if (selectedClass) {
            fetchStudents(selectedClass);
            fetchAttendanceList();
        } else {
            // Nếu không có lớp nào được chọn, xóa danh sách sinh viên và điểm danh
            setStudents([]);
            setAttendanceList([]);
            setFilteredStudents([]);
        }
    }, [selectedClass]);

    useEffect(() => {
        filterStudents();
    }, [students, attendanceList, searchName, searchDate]);

    const fetchClasses = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:5000/class_list');
            setClasses(response.data);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách lớp học:', error);
        }
    };

    const fetchStudents = async (classId) => {
        if (!classId) return;
        try {
            const response = await axios.get(`http://127.0.0.1:5000/student_list/${classId}`);
            setStudents(response.data);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách sinh viên:', error);
        }
    };

    const fetchAttendanceList = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:5000/attendance_list');
            setAttendanceList(response.data);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách điểm danh:', error);
        }
    };

    const handleClassChange = (e) => {
        const classId = e.target.value;
        setSelectedClass(classId);
    };

    const filterStudents = () => {
        let filtered = students;

        // Lọc theo tên học sinh
        if (searchName) {
            filtered = filtered.filter(student =>
                student.full_name.toLowerCase().includes(searchName.toLowerCase())
            );
        }

        // Giữ tất cả sinh viên và kiểm tra điểm danh theo ngày
        filtered = filtered.map(student => {
            const attendance = attendanceList.find(
                att => att.user_id === student.user_id && att.check_in_time.startsWith(searchDate)
            );
            return {
                ...student,
                isAttended: !!attendance,  // Thêm thuộc tính kiểm tra điểm danh
                attendanceDate: attendance ? attendance.check_in_time.split(' ')[0] : '-', // Ngày điểm danh
                attendanceTime: attendance ? attendance.check_in_time.split(' ')[1] : '-' // Giờ điểm danh
            };
        });

        setFilteredStudents(filtered);
    };

    return (
        <div>
            <h2>Quản lý học sinh</h2>
            <button onClick={onBack}>Quay lại</button>
            <select onChange={handleClassChange}>
                <option value="">Chọn lớp</option>
                {classes.map(classItem => (
                    <option key={classItem.class_id} value={classItem.class_name}>
                        {classItem.class_name}
                    </option>
                ))}
            </select>

            <input
                type="text"
                placeholder="Tìm kiếm theo tên học sinh"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
            />

            <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
            />

            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Tên học sinh</th>
                        <th>Chức vụ</th>
                        <th>Lớp</th>
                        <th>Trạng thái điểm danh</th>
                        <th>Ngày</th>
                        <th>Giờ điểm danh</th>
                    </tr>
                </thead>
                <tbody>
                    {selectedClass ? (
                        filteredStudents.length > 0 ? (
                            filteredStudents.map((student, index) => (
                                <tr key={student.user_id}>
                                    <td>{index + 1}</td>
                                    <td>{student.full_name}</td>
                                    <td>{student.chucvu}</td>
                                    <td>{selectedClass}</td>
                                    <td>{student.isAttended ? 'Đã điểm danh' : 'Chưa điểm danh'}</td>
                                    <td>{student.attendanceDate}</td>
                                    <td>{student.attendanceTime}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7">Không có sinh viên nào trong lớp này.</td>
                            </tr>
                        )
                    ) : (
                        <tr>
                            <td colSpan="7">Chọn lớp để quản lý sinh viên</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default StudentList;