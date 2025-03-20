// src/App.js
import React from "react";
import CameraComponent from "./CameraComponent"; // Đảm bảo đường dẫn đúng
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <h1>Hệ thống điểm danh bằng nhận diện khuôn mặt</h1>
      <div className="content-wrapper">
        <CameraComponent />
      </div>
    </div>
  );
}

export default App;


