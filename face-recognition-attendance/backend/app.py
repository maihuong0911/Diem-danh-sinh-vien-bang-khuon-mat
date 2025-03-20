from flask import Flask, request, jsonify
import os
import uuid
from deepface import DeepFace
from mtcnn import MTCNN
import pyodbc
from flask_cors import CORS
import logging
from datetime import datetime  
import cv2
import numpy as np
from playsound import playsound

app = Flask(__name__)
CORS(app)

# Thiết lập logging
logging.basicConfig(level=logging.INFO)

# Tải mô hình phát hiện khuôn mặt bằng dlib
detector = MTCNN()

# Hàm kết nối đến SQL Server
def get_db_connection():
    try:
        return pyodbc.connect('DRIVER={SQL Server};SERVER=MYHƯƠNG\\DUCCHUYY;DATABASE=DiemdanhHS;Trusted_Connection=yes')
    except pyodbc.Error as e:
        logging.error(f"Lỗi kết nối đến cơ sở dữ liệu: {str(e)}")
        return None

def sharpen_image(image):
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    sharpened = cv2.filter2D(image, -1, kernel)
    return sharpened

def adjust_brightness_contrast(image, alpha=1.2, beta=30):
    adjusted = cv2.convertScaleAbs(image, alpha=alpha, beta=beta)
    return adjusted

@app.route('/')
def home():
    return "Server đang chạy!"

@app.route('/class_list', methods=['GET'])
def get_class_list():
    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"message": "Không thể kết nối đến cơ sở dữ liệu!"}), 500

            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT Class FROM Users ORDER BY Class")
            classes = cursor.fetchall()
            class_list = [{"class_id": idx, "class_name": row[0]} for idx, row in enumerate(classes)]
            return jsonify(class_list)
    except Exception as e:
        logging.error(f"Lỗi khi lấy danh sách lớp: {str(e)}")
        return jsonify({"message": "Có lỗi xảy ra khi lấy danh sách lớp.", "error": str(e)}), 500

@app.route('/student_list/<string:class_id>', methods=['GET'])
def get_student_list(class_id):
    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"message": "Không thể kết nối đến cơ sở dữ liệu!"}), 500

            cursor = conn.cursor()

            if class_id:  # Nếu class_id có giá trị
                cursor.execute("SELECT UserID, FullName, ChucVu FROM Users WHERE Class = ? ORDER BY FullName", (class_id,))
            else:  # Nếu không có lớp được chọn, lấy tất cả sinh viên
                cursor.execute("SELECT UserID, FullName, ChucVu FROM Users ORDER BY FullName")

            students = cursor.fetchall()
            student_list = [{"user_id": row[0], "full_name": row[1], "chucvu": row[2]} for row in students]
            return jsonify(student_list)
    except Exception as e:
        logging.error(f"Lỗi khi lấy danh sách sinh viên: {str(e)}")
        return jsonify({"message": "Có lỗi xảy ra khi lấy danh sách sinh viên.", "error": str(e)}), 500

@app.route('/add_user', methods=['POST'])
def add_user():
    """Thêm học sinh vào cơ sở dữ liệu."""
    data = request.get_json()
    
    if not data:
        return jsonify({"message": "Không nhận được dữ liệu! Hãy gửi dữ liệu dưới dạng JSON."}), 400
        
    # Kiểm tra các trường bắt buộc
    required_fields = ['full_name', 'sdt', 'quenquan', 'chucvu', 'class']
    missing_fields = [field for field in required_fields if field not in data]

    if missing_fields:
        return jsonify({"message": "Thiếu dữ liệu đầu vào!", "missing_fields": missing_fields}), 400

    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"message": "Không thể kết nối đến cơ sở dữ liệu!"}), 500
            
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO Users (FullName, SDT, QuenQuan, ChucVu, Class) 
                VALUES (?, ?, ?, ?, ?)
            """, (data['full_name'], data['sdt'], data['quenquan'], data['chucvu'], data['class']))
            conn.commit()

            return jsonify({"message": "Học sinh đã được thêm thành công!"}), 201
    except Exception as e:
        logging.error(f"Lỗi khi thêm học sinh: {str(e)}")
        return jsonify({"message": "Lỗi khi thêm học sinh!", "error": str(e)}), 500

@app.route('/user_list', methods=['GET'])
def get_user_list():
    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"message": "Không thể kết nối đến cơ sở dữ liệu!"}), 500
            
            cursor = conn.cursor()
            cursor.execute("SELECT UserID, FullName, ChucVu FROM Users ORDER BY FullName")  # Cập nhật để lấy ChucVu
            users = cursor.fetchall()
            user_list = [{"user_id": row[0], "full_name": row[1], "chucvu": row[2]} for row in users]
            return jsonify(user_list)
    except Exception as e:
        logging.error(f"Lỗi khi lấy danh sách người dùng: {str(e)}")
        return jsonify({"message": "Có lỗi xảy ra khi lấy danh sách người dùng.", "error": str(e)}), 500

@app.route('/add_face', methods=['POST'])
def add_face():
    if 'image' not in request.files or 'user_id' not in request.form:
        return jsonify({"message": "Thiếu dữ liệu đầu vào! Vui lòng gửi ảnh và user_id."}), 400
    
    file = request.files['image']
    user_id = request.form['user_id']

    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"message": "Không thể kết nối đến cơ sở dữ liệu!"}), 500

            cursor = conn.cursor()
            cursor.execute("SELECT FullName, Class FROM Users WHERE UserID = ?", (user_id,))
            user = cursor.fetchone()

            if not user:
                return jsonify({"message": "Người dùng không tồn tại!"}), 404

            # Đọc ảnh từ file để xử lý    
            img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Phát hiện khuôn mặt
            faces = detector.detect_faces(img_rgb)

            if not faces:
                return jsonify({"message": "Không phát hiện khuôn mặt trong ảnh."}), 400

            # Cắt và lưu khuôn mặt đầu tiên được phát hiện
            face_image = faces[0]['box']
            x, y, width, height = face_image
            face_image_cropped = img_rgb[y:y + height, x:x + width]

            # Cải thiện độ nét và ánh sáng
            face_image_cropped = sharpen_image(face_image_cropped)
            face_image_cropped = adjust_brightness_contrast(face_image_cropped)

            full_name = user[0].replace(" ", "_")
            class_name = user[1]
            class_folder = os.path.join("dataset", class_name)
            os.makedirs(class_folder, exist_ok=True)
            user_folder = os.path.join(class_folder, full_name)
            os.makedirs(user_folder, exist_ok=True)

            face_image_path = os.path.join(user_folder, f"{uuid.uuid4().hex}.jpg")
            cv2.imwrite(face_image_path, cv2.cvtColor(face_image_cropped, cv2.COLOR_RGB2BGR))

            # Lưu thông tin khuôn mặt vào cơ sở dữ liệu
            cursor.execute("INSERT INTO Faces (UserID, ImagePath) VALUES (?, ?)", (user_id, face_image_path))
            conn.commit()

            return jsonify({"message": "Khuôn mặt đã được lưu thành công!", "image_path": face_image_path})

    except Exception as e:
        logging.error(f"Lỗi khi thêm khuôn mặt: {str(e)}")
        return jsonify({"message": "Có lỗi khi thêm khuôn mặt!", "error": str(e)}), 500

@app.route('/detect', methods=['POST'])
def detect():
    if 'image' not in request.files:
        return jsonify({"message": "Không tìm thấy hình ảnh! Vui lòng gửi ảnh."}), 400

    img_path = "temp.jpg"
    file = request.files['image']
    
    # Lưu ảnh tạm thời
    try:
        file.save(img_path)
    except Exception as e:
        logging.error(f"Lỗi khi lưu hình ảnh tạm thời: {str(e)}")
        return jsonify({"message": "Không thể lưu hình ảnh tạm thời, hãy kiểm tra lại định dạng của ảnh."}), 500

    # Đọc hình ảnh và chuyển đổi sang định dạng RGB
    img = cv2.imread(img_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Phát hiện khuôn mặt
    faces = detector.detect_faces(img_rgb)

    if not faces:
        return jsonify({"message": "Không phát hiện khuôn mặt nào trong hình ảnh! Vui lòng thử lại với hình ảnh khác."}), 404

    # Cắt khuôn mặt đầu tiên
    face_image = faces[0]['box']
    x, y, width, height = face_image
    face_image_cropped = img_rgb[y:y + height, x:x + width]

    # Lưu ảnh khuôn mặt tạm thời
    face_image_path = "face_temp.jpg"
    try:
        cv2.imwrite(face_image_path, cv2.cvtColor(face_image_cropped, cv2.COLOR_RGB2BGR))
    except Exception as e:
        logging.error(f"Lỗi khi lưu ảnh khuôn mặt: {str(e)}")
        return jsonify({"message": "Không thể lưu ảnh khuôn mặt, vui lòng thử lại."}), 500

    class_id = request.form.get("class_id", None)  # Lấy class_id từ form

    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"message": "Không thể kết nối đến cơ sở dữ liệu!"}), 500
            
            cursor = conn.cursor()
            cursor.execute("SELECT ImagePath, UserID FROM Faces")
            faces_db = cursor.fetchall()

            if not faces_db:
                return jsonify({"message": "Không có khuôn mặt nào trong cơ sở dữ liệu để so sánh!"}), 404

            best_match = None
            best_confidence = 90
            detected_user = None

            for face_db in faces_db:
                stored_img_path, user_id = face_db
                
                # Nếu có lớp được chọn, chỉ so sánh với những khuôn mặt thuộc lớp đó
                if class_id:
                    cursor.execute("SELECT Class FROM Users WHERE UserID = ?", (user_id,))
                    user_class = cursor.fetchone()
                    if not user_class or user_class[0] != class_id:
                        continue

                try:
                    result = DeepFace.verify(face_image_path, stored_img_path, model_name='Facenet', enforce_detection=False)
                    confidence = (1 - result["distance"]) * 100 

                    if confidence > best_confidence:
                        detected_user = user_id
                        best_match = result
                        best_confidence = confidence
                        # break  - ngừng khi quét đượcđược

                except Exception as e:
                    logging.error(f"Lỗi khi so sánh khuôn mặt: {str(e)}")

            if detected_user:
                cursor.execute("SELECT FullName, Class FROM Users WHERE UserID = ?", (detected_user,))
                user_data = cursor.fetchone()
                user_name = user_data[0] if user_data else "Không xác định"
                user_class = user_data[1] if user_data else "Không xác định"

                # Tự động điểm danh
                cursor.execute("INSERT INTO Attendance (UserID, CheckInTime) VALUES (?, ?)", (detected_user, datetime.now()))
                conn.commit()



                
                return jsonify({
                    "message": "Điểm danh tự động thành công!",
                    "detected_user": {
                        "user_id": detected_user,
                        "full_name": user_name,
                        "class": user_class,
                        "confidence": best_confidence  
                    }
                })

            else:
                return jsonify({"message": "Không nhận diện được khuôn mặt từ cơ sở dữ liệu!"}), 404

    finally:
        if os.path.exists(img_path):
            os.remove(img_path)
        if os.path.exists(face_image_path):
            os.remove(face_image_path)

@app.route('/attendance_list', methods=['GET'])
def get_attendance_list():
    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"message": "Không thể kết nối đến cơ sở dữ liệu!"}), 500

            cursor = conn.cursor()
            cursor.execute(""" 
                SELECT A.UserID, U.FullName, U.ChucVu, U.Class, A.CheckInTime 
                FROM Attendance A 
                JOIN Users U ON A.UserID = U.UserID 
                ORDER BY A.CheckInTime DESC
            """)
            data = cursor.fetchall()

            if not data:
                return jsonify([]) 

            attendance_list = [
                {
                    "user_id": row[0], 
                    "full_name": row[1], 
                    "chucvu": row[2],  # Lấy ChucVu
                    "class": row[3],
                    "check_in_time": row[4].strftime('%Y-%m-%d %H:%M:%S') if row[4] else "Không xác định"
                } for row in data
            ]
            
            return jsonify(attendance_list)
    except Exception as e:
        logging.error(f"Lỗi khi lấy danh sách điểm danh: {str(e)}")
        return jsonify({"message": "Có lỗi khi lấy danh sách điểm danh.", "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)