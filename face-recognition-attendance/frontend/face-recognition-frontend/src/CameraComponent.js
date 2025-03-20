import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import DsDiemDanh from "./components/DsDiemDanh";
import StudentList from "./components/StudentList";


const CameraComponent = () => {
  const webcamRef = useRef(null);
  const [message, setMessage] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    sdt: '',
    quenquan: '',
    class: '',
    chucvu: ''
  });
  const [viewStudents, setViewStudents] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Trạng thái kiểm soát tính năng điểm danh tự động
  const [autoAttendanceEnabled, setAutoAttendanceEnabled] = useState(false);
  const [autoAttendanceMessage, setAutoAttendanceMessage] = useState("");
  const [showAutoAttendanceMessage, setShowAutoAttendanceMessage] = useState(false);
  
  // Một mảng để lưu các ID sinh viên đã được điểm danh
  const [attendedStudents, setAttendedStudents] = useState([]);

  useEffect(() => {
    fetchClasses();
    fetchAttendanceList();
  }, []);

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current) return null;

    const blob = await captureImage();
    if (!blob) return;

    const formData = new FormData();
    formData.append("image", blob, "capture.jpg");

    // Gửi class_id nếu lớp đã được chọn
    if (selectedClass) {
      formData.append("class_id", selectedClass);
    }

    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:5000/detect", formData);
      if (response.data.detected_user) {
        const { full_name, class: userClass, user_id } = response.data.detected_user;

        // Kiểm tra xem sinh viên đã được điểm danh hay chưa
        if (!attendedStudents.includes(user_id)) {
          const newRecord = {
            id: user_id,
            full_name,
            class: userClass,
            check_in_time: new Date().toLocaleString()
          };
          setAttendanceList(prevList => [...prevList, newRecord]);
          setAttendedStudents(prev => [...prev, user_id]); // Thêm ID sinh viên vào danh sách đã điểm danh
          
          setAutoAttendanceMessage(`✅ Điểm danh tự động thành công: ${full_name} (Lớp: ${userClass})`);
          setShowAutoAttendanceMessage(true);

          // Tự động ẩn thông báo sau 3 giây
          setTimeout(() => {
            setShowAutoAttendanceMessage(false);
          }, 3000);
        }
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage(`Lỗi khi gửi ảnh: ${error.response ? error.response.data.message : "Không xác định"}`);
    } finally {
      setLoading(false);
      fetchAttendanceList();
    }
  }, [selectedClass, attendedStudents]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (autoAttendanceEnabled && selectedClass) {
        captureAndDetect(); // Chỉ quét khi đã chọn lớp và tính năng điểm danh tự động đang bật
      }
    }, 3000); // Quét mỗi 3 giây

    return () => clearInterval(intervalId); // Dọn dẹp interval khi component unmount
  }, [captureAndDetect, autoAttendanceEnabled, selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/class_list");
      setClasses(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách lớp học:", error);
    }
  };

  const fetchStudents = async (classId = '') => {
    setLoadingStudents(true);
    try {
      const endpoint = classId ? `http://127.0.0.1:5000/student_list/${classId}` : "http://127.0.0.1:5000/student_list";
      const response = await axios.get(endpoint);
      setStudents(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sinh viên:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchAttendanceList = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/attendance_list");
      setAttendanceList(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách điểm danh:", error);
    }
  };

  const captureImage = async () => {
    if (!webcamRef.current) return null;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setMessage("Không thể chụp ảnh!");
      setShowSuccessMessage(true);
      return null;
    }

    return await fetch(imageSrc).then(res => res.blob());
  };

  const capture = async () => {
    const blob = await captureImage();
    if (!blob) return;

    const formData = new FormData();
    formData.append("image", blob, "capture.jpg");
    
    if (selectedClass) {
      formData.append("class_id", selectedClass);
    }

    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:5000/detect", formData);
      if (response.data.detected_user) {
        const { full_name, class: userClass, user_id } = response.data.detected_user;

        const newRecord = {
          id: user_id,
          full_name,
          class: userClass,
          check_in_time: new Date().toLocaleString()
        };
        
        setAttendanceList(prevList => [...prevList, newRecord]);
        setMessage(`✅ Điểm danh thành công: ${full_name} (Lớp: ${userClass})`);
        
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage(`Lỗi khi gửi ảnh: ${error.response ? error.response.data.message : "Không xác định"}`);
    } finally {
      setLoading(false);
      setShowSuccessMessage(true);
      fetchAttendanceList();
    }
  };

  const addFace = async () => {
    if (!selectedStudent) {
      setMessage("Vui lòng chọn sinh viên trước!");
      setShowSuccessMessage(true);
      return;
    }

    const blob = await captureImage();
    if (!blob) return;

    const formData = new FormData();
    formData.append("image", blob, "capture.jpg");
    formData.append("user_id", selectedStudent);

    try {
      const response = await axios.post("http://127.0.0.1:5000/add_face", formData);
      setMessage(response.data.message);
    } catch (error) {
      setMessage(`Lỗi khi thêm ảnh: ${error.response ? error.response.data.message : "Không xác định"}`);
    }

    setShowSuccessMessage(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewStudent((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async () => {
    if (!newStudent.full_name || !newStudent.sdt || !newStudent.quenquan || !newStudent.class || !newStudent.chucvu) {
      setMessage("Vui lòng điền đầy đủ thông tin học sinh.");
      setShowSuccessMessage(true);
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:5000/add_user", newStudent);
      setMessage(response.data.message);
      setShowSuccessMessage(true);
      fetchClasses();
    } catch (error) {
      setMessage(`Lỗi khi thêm học sinh: ${error.response ? error.response.data.message : "Không xác định"}`);
    } finally {
      setNewStudent({ full_name: '', sdt: '', quenquan: '', class: '', chucvu: '' });
      setShowUserModal(false);
    }
  };

  const handleManageStudents = () => {
    setViewStudents(prev => !prev);
  };

  // Hàm để bật/tắt tính năng điểm danh tự động
  const toggleAutoAttendance = () => {
    if (!selectedClass) {
      setMessage("Bạn cần phải chọn lớp");
      setShowSuccessMessage(true);
      return;
    }

    const newState = !autoAttendanceEnabled;
    setAutoAttendanceEnabled(newState);
    
    // Cập nhật tin nhắn thông báo
    const message = newState ? "Đã bật chế độ tự động điểm danh." : "Đã tắt chế độ tự động điểm danh.";
    setAutoAttendanceMessage(message);
    setShowAutoAttendanceMessage(true);
  
    // Tự động ẩn thông báo sau 3 giây
    setTimeout(() => {
      setShowAutoAttendanceMessage(false);
    }, 3000);
  };

  // Xử lý thay đổi lớp học
  const handleClassChange = (classId) => {
    if (autoAttendanceEnabled) {
      setShowAutoAttendanceMessage(true);
      setAutoAttendanceMessage("Đã tắt chế độ tự động điểm danh.");
      setAutoAttendanceEnabled(false);
      
      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setShowAutoAttendanceMessage(false);
      }, 3000);
    }
    setSelectedClass(classId);
    fetchStudents(classId);
  };

  return (
    <div className="camera-wrapper">
      {viewStudents ? (
        <StudentList students={students} onBack={handleManageStudents} loading={loadingStudents} />
      ) : (
        <>
          <button className="manage-students-btn" onClick={handleManageStudents}>
            {viewStudents ? "Quay lại camera" : "Quản lý danh sách sinh viên"}
          </button>

          <div className="camera-container">
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="camera-feed" />
          </div>

          <div className="controls">
            {/* Hàng 1: Chọn lớp và chọn học sinh */}
            <div className="dropdown-row">
              <select onChange={(e) => handleClassChange(e.target.value)}>
                <option value="">Chọn lớp</option>
                {classes.map((classItem) => (
                  <option key={classItem.class_id} value={classItem.class_name}>
                    {classItem.class_name}
                  </option>
                ))}
              </select>

              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} disabled={students.length === 0}>
                <option value="">Chọn sinh viên</option>
                {students.map((student) => (
                  <option key={student.user_id} value={student.user_id}>
                    {student.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Hàng 2: Nút bật/tắt tính năng điểm danh tự động */}
            <button 
              onClick={toggleAutoAttendance} 
              className={`toggle-btn ${autoAttendanceEnabled ? "enabled" : "disabled"}`} 
              style={{ width: '100%' }} 
            >
              {autoAttendanceEnabled ? "Tắt Tự Động Điểm Danh" : "Bật Tự Động Điểm Danh"}
            </button>

            {/* Hàng 3: Nút Chụp & Điểm danh */}
            <button className="attendance-btn" onClick={capture} disabled={loading}>
              {loading ? "Đang xử lý..." : "Chụp & Điểm danh"}
            </button>

            {/* Hàng 4: Hai nút còn lại ở cùng một hàng */}
            <div className="button-row">
              <button className="add-face-btn" onClick={addFace} disabled={loading}>
                {loading ? "Đang xử lý..." : "Thêm ảnh vào hệ thống"}
              </button>

              <button className="add-student-btn" onClick={() => setShowUserModal(true)}>
                Thêm học sinh
              </button>
            </div>
          </div>

          <DsDiemDanh attendanceList={attendanceList} />

          {/* Thông báo tự động điểm danh */}
          {showAutoAttendanceMessage && (
            <div className="auto-attendance-message">
                {autoAttendanceMessage}
            </div>
          )}

          {/* Modal thêm học sinh */}
          {showUserModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Thêm học sinh mới</h2>
                <form onSubmit={handleAddUser}>
                  <div className="form-group">
                    <label htmlFor="full_name">Tên sinh viên:</label>
                    <input type="text" id="full_name" name="full_name" placeholder="Tên sinh viên" value={newStudent.full_name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="sdt">SĐT:</label>
                    <input type="text" id="sdt" name="sdt" placeholder="SĐT" value={newStudent.sdt} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="quenquan">Quê quán:</label>
                    <input type="text" id="quenquan" name="quenquan" placeholder="Quê quán" value={newStudent.quenquan} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="class">Lớp:</label>
                    <input type="text" id="class" name="class" placeholder="Lớp" value={newStudent.class} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="chucvu">Chức vụ:</label>
                    <input type="text" id="chucvu" name="chucvu" placeholder="Chức vụ" value={newStudent.chucvu} onChange={handleChange} required />
                  </div>

                  <div className="modal-actions">
                    <button type="submit" className="btn btn-primary">Thêm</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Huỷ</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Thông báo thành công */}
          {showSuccessMessage && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Thông báo</h2>
                <p>{message}</p>
                <button className="btn btn-primary" onClick={() => { 
                  setShowSuccessMessage(false); 
                  setMessage(""); 
                }}>Đóng</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CameraComponent;