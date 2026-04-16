import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testUpload() {
  const token = process.argv[2] || '';
  if (!token) {
    console.error("No token provided");
    return;
  }
  
  const formData = new FormData();
  const file = new Blob(['hello world'], { type: 'image/png' });
  formData.append("file", file, "test.png");
  formData.append("folder", "tools");
  
  try {
    const res = await fetch("http://164.92.244.229:8080/api/upload/image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch(e) {
    console.error("Error:", e);
  }
}

testUpload();
