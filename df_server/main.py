import base64
from fastapi import FastAPI, HTTPException, UploadFile, File
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
async def detect(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        npimg = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        # Get prediction result
        is_deepfake, confidence, frame = predict(frame)

        return {
            "status": "success",
            "is_deepfake": is_deepfake,
            "confidence": round(confidence, 3),
            "message": "Detection complete"
        }
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing image: {str(e)}")


@app.post("/detect-base64")
async def detect_base64(request: Base64ImageRequest):
    try:
        if request.image.startswith('data:image/'):
            base64_data = request.image.split(',')[1]
        else:
            base64_data = request.image

        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_data)

        # Convert bytes to numpy array
        npimg = np.frombuffer(image_bytes, np.uint8)

        # Decode image
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        print(f"Image decoded successfully. Shape: {frame.shape}")

        # Get prediction result
        is_deepfake, confidence, frame = predict(frame)

        # Handle case where confidence might be None
        if confidence is not None:
            confidence_rounded = round(confidence, 3)
        else:
            confidence_rounded = 0.0
            print("Not see face in the image, setting confidence to 0.0")

        # Encode processed image back to base64
        _, buffer = cv2.imencode('.jpg', frame)
        processed_image_base64 = base64.b64encode(buffer).decode('utf-8')
        print(processed_image_base64)
        
        return {
            "status": "success",
            "is_deepfake": is_deepfake,
            "confidence": confidence_rounded,
            "message": "Detection complete",
        }

    except Exception as e:
        print(f"Error processing base64 image: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing image: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
