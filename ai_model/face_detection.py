from fastapi import FastAPI, UploadFile, File
import uvicorn
import cv2
import numpy as np
import base64
from deepface import DeepFace
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Path to the admin image
admin_image_path = './admins/me.jpeg'

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/match_face")
async def match_face(image: UploadFile = File(...)):
    try:
        image_data = await image.read()
        np_arr = np.frombuffer(image_data, np.uint8)
        image_cv = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Save the received image temporarily
        temp_image_path = "temp_face.png"
        cv2.imwrite(temp_image_path, image_cv)

        # Perform face verification using DeepFace
        result = DeepFace.verify(img1_path=temp_image_path, img2_path=admin_image_path, enforce_detection=False)

        return {
            'success': True,
            'verified': result['verified'],
            'distance': result['distance'],
            'threshold': result['threshold'],
            'similarity_metric': result['similarity_metric'],
            'message': 'Face matches admin' if result['verified'] else 'Face does not match admin'
        }
    except Exception as e:
        return {'success': False, 'message': str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
