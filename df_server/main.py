from fastapi import FastAPI, UploadFile, File
import cv2
import numpy as np
from face_detection import detect_bounding_box
from deepfake_detection import predict
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    npimg = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    # Get prediction result
    is_deepfake, confidence, frame = predict(frame)

    # Optional: encode image to return/display
    _, buffer = cv2.imencode('.jpg', frame)
    # base64_encoded_image = base64.b64encode(buffer).decode('utf-8')

    return {
        "status": "success",
        "is_deepfake": is_deepfake,
        "confidence": round(confidence, 3),
        "message": "Detection complete"
    }
