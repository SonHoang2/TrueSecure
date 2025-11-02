import base64
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import cv2
import numpy as np
from face_detection import detect_bounding_box
from deepfake_detection import predict
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[
                   "*"], allow_methods=["*"], allow_headers=["*"])

# Pydantic model for base64 request


class Base64ImageRequest(BaseModel):
    image: str


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/detect")
async def detect(imageFile: UploadFile = File(...)):
    try:
        contents = await imageFile.read()
        npimg = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        # Detect face before prediction
        face_box = detect_bounding_box(frame)
        if face_box is None:
            return JSONResponse(content={
                "status": "fail",
                "isDeepfake": False,
                "confidence": 0,
                "faceDetected": False,
            })

        # Get prediction result
        is_deepfake, confidence, frame = predict(frame)
        
        confidence_percent = round(confidence * 100)

        return JSONResponse(content={
            "status": "success",
            "isDeepfake": is_deepfake,
            "confidence": confidence_percent,
            "faceDetected": True,
        })
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Error processing image: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
