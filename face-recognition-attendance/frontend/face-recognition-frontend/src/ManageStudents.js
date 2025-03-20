import React, { useEffect, useState } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom";

const ManageStudents = () => {
    const history = useHistory();
    const [studentList, setStudentList] = useState([]);

    useEffect(() => {
        fetchStudentList();
    }, []);

    const fetchStudentList = async () => {
        try {
            const response = await axios.get("http://127.0.0.1:5000/user_list");
            setStudentList(response.data);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách sinh viên:", error);
        }
    };

    return (
        <div>
            <h1>Danh sách sinh viên</h1>
            <button onClick={() => history.push("/")}>Điểm danh học sinh</button> {/* Nút quay lại */}
            <table>
                <thead>
                    <tr>
                        <th>Mã sinh viên</th>
                        <th>Tên sinh viên</th>
                    </tr>
                </thead>
                <tbody>
                    {studentList.map((student) => (
                        <tr key={student.user_id}>
                            <td>{student.user_id}</td>
                            <td>{student.full_name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ManageStudents;